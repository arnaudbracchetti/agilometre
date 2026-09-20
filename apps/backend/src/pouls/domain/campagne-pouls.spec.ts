import { Selection } from '../../modele-collecte/domain/selection';
import { CampagnePouls } from './campagne-pouls';
import { RythmeHebdomadaire } from './rythme-hebdomadaire';

describe('CampagnePouls', () => {
  const rythme = RythmeHebdomadaire.reconstituer([1, 3], 480);

  it('refuse un nombre de Questions par envoi nul ou négatif', () => {
    expect(
      CampagnePouls.creer(
        'campagne-1',
        'equipe-1',
        'modele-1',
        Selection.vide(),
        rythme,
        0,
      ).estEchec,
    ).toBe(true);
    expect(
      CampagnePouls.creer(
        'campagne-1',
        'equipe-1',
        'modele-1',
        Selection.vide(),
        rythme,
        -1,
      ).estEchec,
    ).toBe(true);
  });

  it('refuse un nombre de Questions par envoi non entier', () => {
    const resultat = CampagnePouls.creer(
      'campagne-1',
      'equipe-1',
      'modele-1',
      Selection.vide(),
      rythme,
      1.5,
    );

    expect(resultat.estEchec).toBe(true);
  });

  it('accepte un Panel vide', () => {
    const resultat = CampagnePouls.creer(
      'campagne-1',
      'equipe-1',
      'modele-1',
      Selection.vide(),
      rythme,
      3,
    );

    expect(resultat.estSucces).toBe(true);
    expect(resultat.valeur.panel.questionIds).toEqual([]);
  });

  it('crée la Campagne au statut BROUILLON', () => {
    const resultat = CampagnePouls.creer(
      'campagne-1',
      'equipe-1',
      'modele-1',
      Selection.reconstituer(['q1', 'q2']),
      rythme,
      3,
    );

    expect(resultat.estSucces).toBe(true);
    expect(resultat.valeur.statut).toBe('BROUILLON');
    expect(resultat.valeur.equipeId).toBe('equipe-1');
    expect(resultat.valeur.modeleCollecteId).toBe('modele-1');
    expect(resultat.valeur.questionsParEnvoi).toBe(3);
  });

  it('expose une copie défensive du Panel', () => {
    const panelOriginal = Selection.reconstituer(['q1']);
    const campagne = CampagnePouls.creer(
      'campagne-1',
      'equipe-1',
      'modele-1',
      panelOriginal,
      rythme,
      1,
    ).valeur;

    panelOriginal.ajouter('q2');

    expect(campagne.panel.questionIds).toEqual(['q1']);
  });
});
