import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { Selection } from '../domain/selection';
import {
  ModeleManquantError,
  Session,
  SessionNonModifiableError,
} from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatChangerModeleSession =
  | { type: 'introuvable' }
  | { type: 'modele_introuvable' }
  | { type: 'non_modifiable'; erreur: SessionNonModifiableError }
  | { type: 'modifiee'; session: Session };

export class ChangerModeleSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly modeles: ModeleSessionRepository,
  ) {}

  async executer(
    id: string,
    modeleSessionId: string,
  ): Promise<ResultatChangerModeleSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const modele = await this.modeles.findById(modeleSessionId);
    if (!modele) {
      return { type: 'modele_introuvable' };
    }

    // Copie figée de la Sélection du nouveau Modèle (ADR-0009) — même pattern que CreerSession,
    // réinitialisation complète, jamais une fusion avec la Sélection précédente.
    const nouvelleSelection = Selection.reconstituer([
      ...modele.selection.questionIds,
    ]);
    const resultat = session.changerModele(modeleSessionId, nouvelleSelection);
    if (resultat.estEchec) {
      // ModeleManquantError est structurellement impossible ici : modeleSessionId vient de
      // modele.id (chargé avec succès ci-dessus), donc jamais vide.
      if (resultat.erreur instanceof ModeleManquantError) {
        throw resultat.erreur;
      }
      return { type: 'non_modifiable', erreur: resultat.erreur };
    }
    await this.sessions.save(session);
    return { type: 'modifiee', session };
  }
}
