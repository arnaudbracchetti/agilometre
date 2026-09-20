import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Selection } from '../../modele-collecte/domain/selection';
import { CampagnePouls, StatutCampagne } from '../domain/campagne-pouls';
import { CampagnePoulsRepository } from '../domain/campagne-pouls.repository';
import { RythmeHebdomadaire } from '../domain/rythme-hebdomadaire';

const AVEC_PANEL = {
  panel: { orderBy: { ordre: 'asc' as const } },
};

@Injectable()
export class PrismaCampagnePoulsRepository implements CampagnePoulsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findParEquipe(equipeId: string): Promise<CampagnePouls | null> {
    const row = await this.prisma.campagnePouls.findFirst({
      where: { equipeId },
      include: AVEC_PANEL,
    });
    if (!row) {
      return null;
    }
    return this.versDomaine(row);
  }

  async save(campagne: CampagnePouls): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.campagnePouls.upsert({
        where: { id: campagne.id },
        create: {
          id: campagne.id,
          equipeId: campagne.equipeId,
          statut: campagne.statut,
          modeleCollecteId: campagne.modeleCollecteId,
          joursEnvoi: [...campagne.rythme.joursEnvoi],
          heureEnvoi: campagne.rythme.heureEnvoi,
          questionsParEnvoi: campagne.questionsParEnvoi,
        },
        update: {
          statut: campagne.statut,
          joursEnvoi: [...campagne.rythme.joursEnvoi],
          heureEnvoi: campagne.rythme.heureEnvoi,
          questionsParEnvoi: campagne.questionsParEnvoi,
        },
      });

      // CampagnePanelItem ne porte aucune donnée propre au-delà de questionId/ordre - même
      // patron que SelectionItem (PrismaModeleCollecteRepository) : supprimer/recréer en bloc.
      await tx.campagnePanelItem.deleteMany({
        where: { campagneId: campagne.id },
      });
      const questionIds = campagne.panel.questionIds;
      if (questionIds.length > 0) {
        await tx.campagnePanelItem.createMany({
          data: questionIds.map((questionId, ordre) => ({
            id: randomUUID(),
            campagneId: campagne.id,
            questionId,
            ordre,
          })),
        });
      }
    });
  }

  private versDomaine(row: {
    id: string;
    equipeId: string;
    statut: string;
    modeleCollecteId: string;
    joursEnvoi: number[];
    heureEnvoi: number;
    questionsParEnvoi: number;
    panel: { questionId: string }[];
  }): CampagnePouls {
    return CampagnePouls.reconstituer(
      row.id,
      row.equipeId,
      row.statut as StatutCampagne,
      row.modeleCollecteId,
      Selection.reconstituer(row.panel.map((item) => item.questionId)),
      RythmeHebdomadaire.reconstituer(row.joursEnvoi, row.heureEnvoi),
      row.questionsParEnvoi,
    );
  }
}
