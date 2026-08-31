import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JetonCompte } from '../domain/jeton-compte';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';

@Injectable()
export class PrismaJetonCompteRepository implements JetonCompteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(jeton: JetonCompte): Promise<void> {
    await this.prisma.jetonCompte.create({
      data: {
        id: jeton.id,
        utilisateurId: jeton.utilisateurId,
        tokenHash: jeton.tokenHash,
        creeLe: jeton.creeLe,
        expireLe: jeton.expireLe,
        consommeLe: jeton.consommeLe,
      },
    });
  }

  /**
   * UPDATE conditionnel atomique plutôt qu'une lecture puis écriture : vérifier "non expiré, non
   * consommé" puis marquer consommé serait racy sous READ COMMITTED (même raisonnement que
   * PrismaJetonSessionRepository.emettre pour "Session OUVERTE"). `$queryRaw` plutôt que
   * `updateMany` : il faut `RETURNING`, qu'`updateMany` ne permet pas côté Prisma.
   */
  async consommerSiValide(
    tokenHash: string,
    maintenant: Date,
  ): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ utilisateurId: string }[]>`
      UPDATE "JetonCompte"
      SET "consommeLe" = ${maintenant}
      WHERE "tokenHash" = ${tokenHash} AND "consommeLe" IS NULL AND "expireLe" > ${maintenant}
      RETURNING "utilisateurId"
    `;
    return rows[0]?.utilisateurId ?? null;
  }
}
