import { randomUUID } from 'node:crypto';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { ModeleCollecteRepository } from '../../modele-collecte/domain/modele-collecte.repository';
import { Selection } from '../../modele-collecte/domain/selection';
import {
  CampagnePouls,
  ErreurInvariantCampagnePouls,
} from '../domain/campagne-pouls';
import { CampagnePoulsRepository } from '../domain/campagne-pouls.repository';
import {
  ErreurInvariantRythme,
  RythmeHebdomadaire,
} from '../domain/rythme-hebdomadaire';

export type ResultatCreerCampagnePouls =
  | { type: 'equipe_introuvable' }
  | { type: 'modele_introuvable' }
  | { type: 'campagne_existante' }
  | {
      type: 'invalide';
      erreur: ErreurInvariantCampagnePouls | ErreurInvariantRythme;
    }
  | { type: 'creee'; campagne: CampagnePouls };

export class CreerCampagnePouls {
  constructor(
    private readonly campagnes: CampagnePoulsRepository,
    private readonly equipes: EquipeRepository,
    private readonly modeles: ModeleCollecteRepository,
  ) {}

  async executer(
    equipeId: string,
    modeleCollecteId: string,
    joursEnvoi: number[],
    heureEnvoi: number,
    questionsParEnvoi: number,
  ): Promise<ResultatCreerCampagnePouls> {
    const equipe = await this.equipes.findById(equipeId);
    if (!equipe) {
      return { type: 'equipe_introuvable' };
    }
    const modele = await this.modeles.findById(modeleCollecteId);
    if (!modele) {
      return { type: 'modele_introuvable' };
    }
    // Garde ADR-0028 : au plus une Campagne non-Terminée par Équipe, plus stricte que le seul
    // « au plus une active » (posée par #76 côté index unique partiel en base).
    const campagneExistante = await this.campagnes.findParEquipe(equipeId);
    if (campagneExistante && campagneExistante.statut !== 'TERMINEE') {
      return { type: 'campagne_existante' };
    }

    const resultatRythme = RythmeHebdomadaire.creer(joursEnvoi, heureEnvoi);
    if (resultatRythme.estEchec) {
      return { type: 'invalide', erreur: resultatRythme.erreur };
    }

    // Copie figée de la Sélection du Modèle (ADR-0009) : nouvelle instance, mêmes QuestionIds et
    // même ordre, aucune référence vivante conservée vers le Modèle d'origine.
    const panelCopie = Selection.reconstituer([
      ...modele.selection.questionIds,
    ]);

    const resultatCampagne = CampagnePouls.creer(
      randomUUID(),
      equipeId,
      modeleCollecteId,
      panelCopie,
      resultatRythme.valeur,
      questionsParEnvoi,
    );
    if (resultatCampagne.estEchec) {
      return { type: 'invalide', erreur: resultatCampagne.erreur };
    }

    await this.campagnes.save(resultatCampagne.valeur);
    return { type: 'creee', campagne: resultatCampagne.valeur };
  }
}
