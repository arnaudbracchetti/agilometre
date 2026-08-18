import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Participation } from '../domain/participation';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';

@Injectable()
export class PrismaTourDeVoteRepository implements TourDeVoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TourDeVote | null> {
    const row = await this.prisma.tourDeVote.findUnique({
      where: { id },
      include: { participations: true },
    });
    return row ? this.versDomaine(row) : null;
  }

  async trouverOuvertPour(sessionId: string): Promise<TourDeVote | null> {
    const row = await this.prisma.tourDeVote.findFirst({
      where: { sessionId, clotureLe: null },
      include: { participations: true },
    });
    return row ? this.versDomaine(row) : null;
  }

  async save(tourDeVote: TourDeVote): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.tourDeVote.upsert({
        where: { id: tourDeVote.id },
        create: {
          id: tourDeVote.id,
          sessionId: tourDeVote.sessionId,
          questionId: tourDeVote.questionId,
          numero: tourDeVote.numero,
          ouvertLe: tourDeVote.ouvertLe,
          clotureLe: tourDeVote.clotureLe,
        },
        update: {
          clotureLe: tourDeVote.clotureLe,
        },
      });

      // Participation ne porte aucune donnée propre au-delà de jetonId/reponseId : même
      // raisonnement que PrismaSessionRepository.save pour ses collections enfants, supprimer/
      // recréer en bloc est plus simple qu'un diff, à coût négligeable.
      await tx.participation.deleteMany({ where: { tourId: tourDeVote.id } });
      const participations = tourDeVote.participations;
      if (participations.length > 0) {
        await tx.participation.createMany({
          data: participations.map((p) => ({
            tourId: p.tourId,
            jetonId: p.jetonId,
            reponseId: p.reponseId,
          })),
        });
      }
    });
  }

  private versDomaine(row: {
    id: string;
    sessionId: string;
    questionId: string;
    numero: number;
    ouvertLe: Date;
    clotureLe: Date | null;
    participations: { tourId: string; jetonId: string; reponseId: string }[];
  }): TourDeVote {
    return TourDeVote.reconstituer(
      row.id,
      row.sessionId,
      row.questionId,
      row.numero,
      row.ouvertLe,
      row.clotureLe,
      row.participations.map((p) =>
        Participation.reconstituer(p.tourId, p.jetonId, p.reponseId),
      ),
    );
  }
}
