import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JetonSession } from '../domain/jeton-session';
import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { SessionNonOuverteError } from '../domain/session';

interface JetonSessionRow {
  id: string;
  sessionId: string;
  creeLe: Date;
}

@Injectable()
export class PrismaJetonSessionRepository implements JetonSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * INSERT conditionnel atomique plutôt qu'une lecture puis écriture : "Session OUVERTE" n'est pas
   * exprimable comme contrainte SQL (contrairement à une unicité), et un simple check-then-insert
   * serait racy sous READ COMMITTED (une clôture de Session et une émission de Jeton pourraient
   * s'entrelacer). Même patron qu'ADR-0001 pour `WHERE honoreeLe IS NULL`.
   */
  async emettre(sessionId: string): Promise<JetonSession> {
    const id = randomUUID();
    const rows = await this.prisma.$queryRaw<JetonSessionRow[]>`
      INSERT INTO "JetonSession" ("id", "sessionId", "creeLe")
      SELECT ${id}, ${sessionId}, now()
      WHERE EXISTS (
        SELECT 1 FROM "Session" WHERE "id" = ${sessionId} AND "statut" = 'OUVERTE'
      )
      RETURNING "id", "sessionId", "creeLe"
    `;
    const row = rows[0];
    if (!row) {
      throw new SessionNonOuverteError();
    }
    return JetonSession.creer(row.id, row.sessionId, row.creeLe);
  }

  async findById(id: string): Promise<JetonSession | null> {
    const row = await this.prisma.jetonSession.findUnique({ where: { id } });
    return row ? JetonSession.creer(row.id, row.sessionId, row.creeLe) : null;
  }

  async compterPour(sessionId: string): Promise<number> {
    return this.prisma.jetonSession.count({ where: { sessionId } });
  }
}
