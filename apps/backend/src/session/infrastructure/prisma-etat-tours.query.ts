import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { EtatTour } from '../domain/session';

@Injectable()
export class PrismaEtatToursQuery implements EtatToursQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listerEtatsDesToursDeLaSession(sessionId: string): Promise<EtatTour[]> {
    const rows = await this.prisma.tourDeVote.findMany({
      where: { sessionId },
      select: { id: true, questionId: true, numero: true, clotureLe: true },
    });
    return rows.map((row) => ({
      tourId: row.id,
      questionId: row.questionId,
      numero: row.numero,
      clos: row.clotureLe !== null,
    }));
  }
}
