import { EtatToursQuery } from '../domain/etat-tours.query';
import { Session, SessionNonOuverteError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatPasserQuestionSuivanteSession =
  | { type: 'introuvable' }
  | { type: 'non_ouverte' }
  | { type: 'question_courante_non_resolue' }
  | { type: 'ok'; session: Session };

export class PasserQuestionSuivanteSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly etatTours: EtatToursQuery,
  ) {}

  async executer(id: string): Promise<ResultatPasserQuestionSuivanteSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const tours = await this.etatTours.listerEtatsDesToursDeLaSession(id);
    const resultat = session.passerQuestionSuivante(tours);
    if (resultat.estEchec) {
      return {
        type:
          resultat.erreur instanceof SessionNonOuverteError
            ? 'non_ouverte'
            : 'question_courante_non_resolue',
      };
    }
    await this.sessions.save(session);
    return { type: 'ok', session };
  }
}
