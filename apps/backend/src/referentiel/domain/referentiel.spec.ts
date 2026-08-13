import { ChangeSet } from './change-set';
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

describe('Referentiel.appliquerChangements', () => {
  it('crée les Thèmes et Questions du ChangeSet dans l’agrégat', () => {
    const referentiel = Referentiel.vide();
    const changeSet = referentiel.calculerChangements(entreesImport());

    referentiel.appliquerChangements(changeSet);

    const themes = referentiel.themesActifs();
    expect(themes.map((t) => t.id).sort()).toEqual(['t1', 't2']);

    const theme1 = themes.find((t) => t.id === 't1')!;
    expect(theme1.libelle).toBe('Thème 1');
    expect(theme1.questions.map((q) => q.id).sort()).toEqual(['q1', 'q2']);

    const question1 = theme1.questions.find((q) => q.id === 'q1')!;
    expect(question1.libelle).toBe('Question 1');
    expect(question1.themeId).toBe('t1');
    expect(
      question1.options.map((o) => ({ libelle: o.libelle, niveau: o.niveau.valeur })),
    ).toEqual([
      { libelle: 'Jamais', niveau: 1 },
      { libelle: 'Parfois', niveau: 2 },
      { libelle: 'Souvent', niveau: 3 },
      { libelle: 'Toujours', niveau: 4 },
    ]);

    const theme2 = themes.find((t) => t.id === 't2')!;
    expect(theme2.questions.map((q) => q.id)).toEqual(['q3']);
  });

  it('met à jour derniereMajLe', () => {
    const referentiel = Referentiel.vide();
    const changeSet = referentiel.calculerChangements(entreesImport());

    expect(referentiel.derniereMajLe).toBeNull();
    referentiel.appliquerChangements(changeSet);

    expect(referentiel.derniereMajLe).toBeInstanceOf(Date);
  });

  it('lève pour un type de changement Thème non pris en charge', () => {
    const referentiel = Referentiel.vide();
    const changeSet = ChangeSet.creer(
      [{ type: 'archivage', id: 't1', avant: { libelle: 'Thème 1' }, apres: { libelle: 'Thème 1' } }],
      [],
    );

    expect(() => referentiel.appliquerChangements(changeSet)).toThrow(
      /Type de changement Thème non supporté/,
    );
  });

  it('lève pour un type de changement Question non pris en charge', () => {
    const referentiel = Referentiel.vide();
    const changeSet = ChangeSet.creer(
      [],
      [
        {
          type: 'archivage',
          id: 'q1',
          avant: { libelle: 'Question 1', themeId: 't1', options: [] },
          apres: { libelle: 'Question 1', themeId: 't1', options: [] },
        },
      ],
    );

    expect(() => referentiel.appliquerChangements(changeSet)).toThrow(
      /Type de changement Question non supporté/,
    );
  });
});
