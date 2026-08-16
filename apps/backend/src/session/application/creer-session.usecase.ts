import { randomUUID } from 'node:crypto';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { Selection } from '../domain/selection';
import { ErreurInvariantSession, Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatCreerSession =
  | { type: 'equipe_introuvable' }
  | { type: 'modele_introuvable' }
  | { type: 'invalide'; erreur: ErreurInvariantSession }
  | { type: 'creee'; session: Session };

export class CreerSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly equipes: EquipeRepository,
    private readonly modeles: ModeleSessionRepository,
  ) {}

  async executer(
    equipeId: string,
    date: Date,
    modeleSessionId: string,
  ): Promise<ResultatCreerSession> {
    const equipe = await this.equipes.findById(equipeId);
    if (!equipe) {
      return { type: 'equipe_introuvable' };
    }
    const modele = await this.modeles.findById(modeleSessionId);
    if (!modele) {
      return { type: 'modele_introuvable' };
    }

    // Copie figée de la Sélection du Modèle (ADR-0009) : nouvelle instance, mêmes QuestionIds et
    // même ordre, aucune référence vivante conservée vers le Modèle d'origine.
    const selectionCopiee = Selection.reconstituer([
      ...modele.selection.questionIds,
    ]);
    const resultat = Session.creer(
      randomUUID(),
      equipeId,
      date,
      modeleSessionId,
      selectionCopiee,
    );
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.sessions.save(resultat.valeur);
    return { type: 'creee', session: resultat.valeur };
  }
}
