import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { CryptoGenerateurDeCode } from './crypto-generateur-de-code';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  // Dépend du port du domaine, pas de l'adaptateur concret — CryptoGenerateurDeCode n'est que le
  // jeton d'injection Nest (une interface TypeScript n'existe plus à l'exécution, @Inject explicite
  // requis pour ce paramètre).
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CryptoGenerateurDeCode)
    private readonly generateurDeCode: GenerateurDeCode,
  ) {}

  private static readonly AVEC_SELECTION = {
    items: { orderBy: { ordre: 'asc' } },
    questionsSautees: true,
  } as const;

  async findById(id: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({
      where: { id },
      include: PrismaSessionRepository.AVEC_SELECTION,
    });
    return row ? this.versDomaine(row) : null;
  }

  /** Restreint aux Sessions OUVERTE : seules elles portent un Code unique (invariant du repository). */
  async findByCode(code: string): Promise<Session | null> {
    const row = await this.prisma.session.findFirst({
      where: { code, statut: 'OUVERTE' },
      include: PrismaSessionRepository.AVEC_SELECTION,
    });
    return row ? this.versDomaine(row) : null;
  }

  private versDomaine(
    row: Prisma.SessionGetPayload<{
      include: typeof PrismaSessionRepository.AVEC_SELECTION;
    }>,
  ): Session {
    return Session.reconstituer(
      row.id,
      row.equipeId,
      row.date,
      row.statut,
      row.modeleSessionId,
      Selection.reconstituer(row.items.map((item) => item.questionId)),
      row.code,
      row.indexCourant,
      new Set(row.questionsSautees.map((item) => item.questionId)),
      this.generateurDeCode,
    );
  }

  async save(session: Session): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.upsert({
        where: { id: session.id },
        create: {
          id: session.id,
          equipeId: session.equipeId,
          date: session.date,
          statut: session.statut,
          code: session.code,
          indexCourant: session.indexCourant,
          modeleSessionId: session.modeleSessionId,
        },
        update: {
          equipeId: session.equipeId,
          date: session.date,
          statut: session.statut,
          code: session.code,
          indexCourant: session.indexCourant,
          modeleSessionId: session.modeleSessionId,
        },
      });

      // SessionSelectionItem ne porte aucune donnée propre au-delà de questionId/ordre : même
      // raisonnement que PrismaModeleSessionRepository.save, supprimer/recréer en bloc est plus
      // simple qu'un diff, à coût négligeable.
      await tx.sessionSelectionItem.deleteMany({
        where: { sessionId: session.id },
      });
      const questionIds = session.selection.questionIds;
      if (questionIds.length > 0) {
        await tx.sessionSelectionItem.createMany({
          data: questionIds.map((questionId, ordre) => ({
            id: randomUUID(),
            sessionId: session.id,
            questionId,
            ordre,
          })),
        });
      }

      // Même raisonnement : Set non ordonné, pas de diff, supprimer/recréer en bloc.
      await tx.sessionQuestionSautee.deleteMany({
        where: { sessionId: session.id },
      });
      const questionsSautees = [...session.questionsSautees];
      if (questionsSautees.length > 0) {
        await tx.sessionQuestionSautee.createMany({
          data: questionsSautees.map((questionId) => ({
            id: randomUUID(),
            sessionId: session.id,
            questionId,
          })),
        });
      }
    });
  }

  /** SessionSelectionItem/SessionQuestionSautee supprimés en cascade (onDelete: Cascade). */
  async remove(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  /** Invariant "code unique parmi les Sessions OUVERTE" (docs/design/agregat-tour-de-vote.md §2). */
  async existeCodeOuvert(code: string): Promise<boolean> {
    const count = await this.prisma.session.count({
      where: { code, statut: 'OUVERTE' },
    });
    return count > 0;
  }
}
