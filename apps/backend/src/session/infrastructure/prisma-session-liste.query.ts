import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LigneListeSession,
  SessionListeQuery,
} from '../domain/session-liste.query';

type SessionAvecEquipeEtCompteur = Prisma.SessionGetPayload<{
  include: { equipe: true; _count: { select: { items: true } } };
}>;

@Injectable()
export class PrismaSessionListeQuery implements SessionListeQuery {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `modeleSessionId` n'est pas une relation Prisma (Référentiel/Session sont des bounded
   * contexts séparés, ADR-0009) : la résolution du nom du Modèle se fait par une requête séparée
   * + jointure en mémoire, même raisonnement que `PrismaModeleSessionBibliothequeQuery`. Un
   * Modèle supprimé depuis résout naturellement vers `null`.
   */
  async lister(): Promise<LigneListeSession[]> {
    const sessions = await this.prisma.session.findMany({
      include: { equipe: true, _count: { select: { items: true } } },
    });
    return this.versLignes(sessions);
  }

  async listerParEquipe(equipeId: string): Promise<LigneListeSession[]> {
    const sessions = await this.prisma.session.findMany({
      where: { equipeId, statut: { not: 'PREPAREE' } },
      include: { equipe: true, _count: { select: { items: true } } },
    });
    return this.versLignes(sessions);
  }

  private async versLignes(
    sessions: SessionAvecEquipeEtCompteur[],
  ): Promise<LigneListeSession[]> {
    const modeleSessionIds = [
      ...new Set(sessions.map((s) => s.modeleSessionId)),
    ];
    const modeles = await this.prisma.modeleSession.findMany({
      where: { id: { in: modeleSessionIds } },
    });
    const nomParModeleId = new Map(modeles.map((m) => [m.id, m.nom] as const));

    return sessions.map((session) => ({
      id: session.id,
      equipeId: session.equipeId,
      equipeNom: session.equipe.nom,
      date: session.date,
      statut: session.statut,
      verrouillee: session.statut !== 'PREPAREE',
      nbQuestions: session._count.items,
      modeleSessionNom: nomParModeleId.get(session.modeleSessionId) ?? null,
    }));
  }
}
