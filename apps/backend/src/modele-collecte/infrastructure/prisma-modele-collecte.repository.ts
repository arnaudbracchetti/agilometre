import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModeleCollecte } from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';
import { Selection } from '../domain/selection';

@Injectable()
export class PrismaModeleCollecteRepository implements ModeleCollecteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ModeleCollecte | null> {
    const row = await this.prisma.modeleCollecte.findUnique({
      where: { id },
      include: { items: { orderBy: { ordre: 'asc' } } },
    });
    if (!row) {
      return null;
    }
    return ModeleCollecte.reconstituer(
      row.id,
      row.nom,
      Selection.reconstituer(row.items.map((item) => item.questionId)),
    );
  }

  async save(modele: ModeleCollecte): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.modeleCollecte.upsert({
        where: { id: modele.id },
        create: { id: modele.id, nom: modele.nom },
        update: { nom: modele.nom },
      });

      // SelectionItem ne porte aucune donnée propre au-delà de questionId/ordre : contrairement
      // aux Membres d'une Équipe, un diff upsert-par-id n'apporterait rien ici - supprimer/recréer
      // en bloc est plus simple, à coût négligeable (cf. plan d'implémentation).
      await tx.selectionItem.deleteMany({
        where: { modeleCollecteId: modele.id },
      });
      const questionIds = modele.selection.questionIds;
      if (questionIds.length > 0) {
        await tx.selectionItem.createMany({
          data: questionIds.map((questionId, ordre) => ({
            id: randomUUID(),
            modeleCollecteId: modele.id,
            questionId,
            ordre,
          })),
        });
      }
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.modeleCollecte.delete({ where: { id } });
  }
}
