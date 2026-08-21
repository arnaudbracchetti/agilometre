import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { SessionRepository } from '../domain/session.repository';

export type ResultatInfoSessionParticipant =
  | { type: 'introuvable' }
  | { type: 'ok'; equipeNom: string; ouvertureLe: Date | null };

/**
 * Lecture ponctuelle du menu d'assistance participant (nom d'Équipe + date d'ouverture) —
 * volontairement séparée de `ObtenirEtatParticipant`, qui ne charge jamais l'agrégat `Session`
 * (docs/design/agregat-tour-de-vote.md §5). Appelée à l'ouverture du menu, pas à chaque tick du
 * sondage 1s.
 */
export class ObtenirInfoSessionParticipant {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly equipes: EquipeRepository,
  ) {}

  async executer(sessionId: string): Promise<ResultatInfoSessionParticipant> {
    const session = await this.sessions.findById(sessionId);
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
