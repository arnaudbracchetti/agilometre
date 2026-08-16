import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { Selection } from '../domain/selection';

@Injectable()
export class PrismaModeleSessionRepository implements ModeleSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ModeleSession | null> {
    const row = await this.prisma.modeleSession.findUnique({
      where: { id },
      include: { items: { orderBy: { ordre: 'asc' } } },
    });
    if (!row) {
      return null;
    }
    return ModeleSession.reconstituer(
      row.id,
      row.nom,
      Selection.reconstituer(row.items.map((item) => item.questionId)),
    );
  }

  async save(modele: ModeleSession): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.modeleSession.upsert({
        where: { id: modele.id },
        create: { id: modele.id, nom: modele.nom },
        update: { nom: modele.nom },
      });

      // SelectionItem ne porte aucune donnée propre au-delà de questionId/ordre : contrairement
      // au roster de Membres d'une Équipe, un diff upsert-par-id n'apporterait rien ici —
      // supprimer/recréer en bloc est plus simple, à coût négligeable (cf. plan d'implémentation).
      await tx.selectionItem.deleteMany({
        where: { modeleSessionId: modele.id },
      });
      const questionIds = modele.selection.questionIds;
      if (questionIds.length > 0) {
        await tx.selectionItem.createMany({
          data: questionIds.map((questionId, ordre) => ({
            id: randomUUID(),
            modeleSessionId: modele.id,
            questionId,
            ordre,
          })),
        });
      }
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.modeleSession.delete({ where: { id } });
  }
}
