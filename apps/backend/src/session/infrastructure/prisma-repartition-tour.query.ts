import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RepartitionTour,
  RepartitionTourQuery,
} from '../domain/repartition-tour.query';

const NIVEAUX = [1, 2, 3, 4] as const;

@Injectable()
export class PrismaRepartitionTourQuery implements RepartitionTourQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listerRepartitionsDesTours(
    tourIds: string[],
  ): Promise<RepartitionTour[]> {
    if (tourIds.length === 0) {
      return [];
    }
    const groupes = await this.prisma.reponse.groupBy({
      by: ['tourId', 'niveau'],
      where: { tourId: { in: tourIds } },
      _count: true,
    });
    return tourIds.map((tourId) => {
      const comptesParNiveau: Record<number, number> = Object.fromEntries(
        NIVEAUX.map((niveau) => [niveau, 0]),
      );
      for (const groupe of groupes) {
        if (groupe.tourId === tourId) {
          comptesParNiveau[groupe.niveau] = groupe._count;
        }
      }
      return { tourId, comptesParNiveau };
    });
  }
}
