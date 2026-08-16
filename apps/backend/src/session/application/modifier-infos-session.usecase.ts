import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import {
  EquipeManquanteError,
  Session,
  SessionNonModifiableError,
} from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatModifierInfosSession =
  | { type: 'introuvable' }
  | { type: 'equipe_introuvable' }
  | { type: 'invalide'; erreur: EquipeManquanteError }
  | { type: 'non_modifiable'; erreur: SessionNonModifiableError }
  | { type: 'modifiee'; session: Session };

export class ModifierInfosSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly equipes: EquipeRepository,
  ) {}

  async executer(
    id: string,
    equipeId: string,
    date: Date,
  ): Promise<ResultatModifierInfosSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const equipe = await this.equipes.findById(equipeId);
    if (!equipe) {
      return { type: 'equipe_introuvable' };
    }
    const resultat = session.modifierInfos(equipeId, date);
    if (resultat.estEchec) {
      if (resultat.erreur instanceof EquipeManquanteError) {
        return { type: 'invalide', erreur: resultat.erreur };
      }
      return { type: 'non_modifiable', erreur: resultat.erreur };
    }
    await this.sessions.save(session);
    return { type: 'modifiee', session };
  }
}
