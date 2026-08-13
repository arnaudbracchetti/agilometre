import { EntreeThemeImport, Referentiel } from './referentiel';

function entreesImport(): EntreeThemeImport[] {
  return [
    {
      id: 't1',
      libelle: 'Thème 1',
      questions: [
        {
          id: 'q1',
          libelle: 'Question 1',
          options: [
            { libelle: 'Jamais', niveau: 1 },
            { libelle: 'Parfois', niveau: 2 },
            { libelle: 'Souvent', niveau: 3 },
            { libelle: 'Toujours', niveau: 4 },
          ],
        },
        {
          id: 'q2',
          libelle: 'Question 2',
          options: [
            { libelle: 'Jamais', niveau: 1 },
            { libelle: 'Parfois', niveau: 2 },
            { libelle: 'Souvent', niveau: 3 },
            { libelle: 'Toujours', niveau: 4 },
          ],
        },
      ],
    },
    {
      id: 't2',
      libelle: 'Thème 2',
      questions: [
        {
          id: 'q3',
          libelle: 'Question 3',
          options: [
            { libelle: 'Jamais', niveau: 1 },
            { libelle: 'Parfois', niveau: 2 },
            { libelle: 'Souvent', niveau: 3 },
            { libelle: 'Toujours', niveau: 4 },
          ],
        },
      ],
    },
  ];
}

describe('Referentiel.calculerChangements', () => {
  it('marque tous les Thèmes et Questions en "création" sur un Référentiel vide', () => {
    const referentiel = Referentiel.vide();

    const changeSet = referentiel.calculerChangements(entreesImport());

    expect(changeSet.themes).toHaveLength(2);
    expect(
      changeSet.themes.every((t) => t.type === 'creation' && t.avant === null),
    ).toBe(true);
    expect(changeSet.questions).toHaveLength(3);
    expect(
      changeSet.questions.every(
        (q) => q.type === 'creation' && q.avant === null,
      ),
    ).toBe(true);

    const question1 = changeSet.questions.find((q) => q.id === 'q1');
    expect(question1?.apres).toEqual({
      libelle: 'Question 1',
      themeId: 't1',
      options: [
        { libelle: 'Jamais', niveau: 1 },
        { libelle: 'Parfois', niveau: 2 },
        { libelle: 'Souvent', niveau: 3 },
        { libelle: 'Toujours', niveau: 4 },
      ],
    });
  });

  it('produit une synthèse chiffrée correcte', () => {
    const referentiel = Referentiel.vide();

    const changeSet = referentiel.calculerChangements(entreesImport());

    expect(changeSet.synthese()).toEqual({
      themes: { creations: 2, majs: 0, archivages: 0, reactivations: 0 },
      questions: {
        creations: 3,
        majs: 0,
        reaffectations: 0,
        archivages: 0,
        reactivations: 0,
      },
    });
  });

  it('ne mute pas l’agrégat (pure)', () => {
    const referentiel = Referentiel.vide();

    referentiel.calculerChangements(entreesImport());

    expect(referentiel.themesActifs()).toHaveLength(0);
  });
});
