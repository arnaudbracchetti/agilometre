import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({
      where: { id },
      include: { items: { orderBy: { ordre: 'asc' } } },
    });
    if (!row) {
      return null;
    }
    return Session.reconstituer(
      row.id,
      row.equipeId,
      row.date,
      row.statut,
      row.modeleSessionId,
      row.verrouillee,
      Selection.reconstituer(row.items.map((item) => item.questionId)),
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
          modeleSessionId: session.modeleSessionId,
          verrouillee: session.estVerrouillee(),
        },
        update: {
          statut: session.statut,
          verrouillee: session.estVerrouillee(),
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
    });
  }
}
