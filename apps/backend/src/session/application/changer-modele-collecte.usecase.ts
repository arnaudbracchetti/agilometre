import { ModeleCollecteRepository } from '../../modele-collecte/domain/modele-collecte.repository';
import { Selection } from '../../modele-collecte/domain/selection';
import {
  ModeleManquantError,
  Session,
  SessionNonModifiableError,
} from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatChangerModeleCollecte =
  | { type: 'introuvable' }
  | { type: 'modele_introuvable' }
  | { type: 'non_modifiable'; erreur: SessionNonModifiableError }
  | { type: 'modifiee'; session: Session };

export class ChangerModeleCollecte {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly modeles: ModeleCollecteRepository,
  ) {}

  async executer(
    id: string,
    modeleCollecteId: string,
  ): Promise<ResultatChangerModeleCollecte> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const modele = await this.modeles.findById(modeleCollecteId);
    if (!modele) {
      return { type: 'modele_introuvable' };
    }

    // Copie figée de la Sélection du nouveau Modèle (ADR-0009) — même pattern que CreerSession,
    // réinitialisation complète, jamais une fusion avec la Sélection précédente.
    const nouvelleSelection = Selection.reconstituer([
      ...modele.selection.questionIds,
    ]);
    const resultat = session.changerModele(modeleCollecteId, nouvelleSelection);
    if (resultat.estEchec) {
      // ModeleManquantError est structurellement impossible ici : modeleCollecteId vient de
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
