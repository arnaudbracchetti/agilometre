import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateurDeCode } from '../domain/generateur-de-code';

/**
 * Code numérique à 6 chiffres (100000–999999) : jamais de zéro en tête, lisible à l'oral.
 *
 * Interroge la base directement plutôt que `SessionRepository` : `PrismaSessionRepository` a
 * besoin de ce port pour hydrater ses agrégats (`reconstituer`), passer par lui ici créerait un
 * cycle. `SessionRepository.existeCodeOuvert` (#32) reste inutilisé par ce port mais fait partie
 * de l'interface documentée et reste couvert par son propre test e2e.
 *
 * Pas de table de réservation : `generer()` ne réserve rien, le Code n'atterrit en base qu'au
 * `save()` de la Session. La fenêtre de course est de l'ordre de la milliseconde, fermée par
 * l'index unique partiel `Session_code_ouverte_key` (migration 20260818060952) — au pire une
 * erreur 500 sur une collision simultanée entre deux Coachs, négligeable sur un déploiement
 * on-premise mono-instance. Une table de réservation ajouterait un second chemin d'écriture et
 * des réservations orphelines à purger, pour un gain nul ici.
 */
@Injectable()
export class CryptoGenerateurDeCode implements GenerateurDeCode {
  constructor(private readonly prisma: PrismaService) {}

  async generer(): Promise<string> {
    let code: string;
    do {
      code = String(randomInt(100_000, 1_000_000));
    } while (await this.estPris(code));
    return code;
  }

  private async estPris(code: string): Promise<boolean> {
    const count = await this.prisma.session.count({
      where: { code, statut: 'OUVERTE' },
    });
    return count > 0;
  }
}
