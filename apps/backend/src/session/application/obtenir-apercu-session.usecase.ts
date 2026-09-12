import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { SessionRepository } from '../domain/session.repository';

export type ResultatApercuSession =
  | { type: 'introuvable' }
  | { type: 'ok'; equipeNom: string; ouvertureLe: Date | null };

/**
 * Résolution d'un Code en lecture seule (Équipe + date d'ouverture), sans émission de Jeton ni
 * écriture (CONTEXT.md, terme "Aperçu de Session" ; ADR-0024) — permet de comparer la Session
 * ciblée par un scan de QR à une Session déjà active avant de confirmer une bascule, sans laisser
 * de Jeton orphelin si l'utilisateur renonce. `findByCode` partage la même restriction aux
 * Sessions OUVERTE que `RejoindreSession` : un Code inconnu et une Session pas/plus OUVERTE
 * partagent la même issue "introuvable".
 */
export class ObtenirApercuSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly equipes: EquipeRepository,
  ) {}

  async executer(code: string): Promise<ResultatApercuSession> {
    const session = await this.sessions.findByCode(code);
    if (!session) {
      return { type: 'introuvable' };
    }
    const equipe = await this.equipes.findById(session.equipeId);
    return {
      type: 'ok',
      equipeNom: equipe?.nom ?? '',
      ouvertureLe: session.ouvertureLe,
    };
  }
}
