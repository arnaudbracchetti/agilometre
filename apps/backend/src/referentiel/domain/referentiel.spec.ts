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
      question1.options.map((o) => ({
        libelle: o.libelle,
        niveau: o.niveau.valeur,
      })),
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

  it('lève si un changement de Thème (non "création") référence un id absent de l’agrégat', () => {
    const referentiel = Referentiel.vide();
    const changeSet = ChangeSet.creer(
      [
        {
          type: 'archivage',
          id: 't1',
          avant: { libelle: 'Thème 1' },
          apres: { libelle: 'Thème 1' },
        },
      ],
      [],
    );

    expect(() => referentiel.appliquerChangements(changeSet)).toThrow(
      /Thème introuvable \(t1\)/,
    );
  });

  it('lève si un changement de Question (non "création") référence un id absent de l’agrégat', () => {
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
      /Question introuvable \(q1\)/,
    );
  });
});

describe('Referentiel — réconciliation par Clé stable (import ultérieur)', () => {
  function referentielImporte(
    entrees: EntreeThemeImport[] = entreesImport(),
  ): Referentiel {
    const referentiel = Referentiel.vide();
    referentiel.appliquerChangements(referentiel.calculerChangements(entrees));
    return referentiel;
  }

  describe('calculerChangements', () => {
    it('ne détecte aucun changement en réimportant strictement le même YAML', () => {
      const referentiel = referentielImporte();

      const changeSet = referentiel.calculerChangements(entreesImport());

      expect(changeSet.themes).toHaveLength(0);
      expect(changeSet.questions).toHaveLength(0);
      expect(changeSet.synthese()).toEqual({
        themes: { creations: 0, majs: 0, archivages: 0, reactivations: 0 },
        questions: {
          creations: 0,
          majs: 0,
          reaffectations: 0,
          archivages: 0,
          reactivations: 0,
        },
      });
    });

    it('détecte une mise à jour de libellé de Question (même Clé stable)', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport();
      entrees[0].questions[0].libelle = 'Question 1 reformulée';

      const changeSet = referentiel.calculerChangements(entrees);

      expect(changeSet.themes).toHaveLength(0);
      expect(changeSet.questions).toHaveLength(1);
      expect(changeSet.questions[0]).toMatchObject({
        type: 'maj',
        id: 'q1',
        avant: { libelle: 'Question 1', themeId: 't1' },
        apres: { libelle: 'Question 1 reformulée', themeId: 't1' },
      });
    });

    it('détecte une mise à jour de libellé de Thème (même Clé stable)', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport();
      entrees[0].libelle = 'Thème 1 renommé';

      const changeSet = referentiel.calculerChangements(entrees);

      expect(changeSet.themes).toHaveLength(1);
      expect(changeSet.themes[0]).toMatchObject({
        type: 'maj',
        id: 't1',
        avant: { libelle: 'Thème 1' },
        apres: { libelle: 'Thème 1 renommé' },
      });
      expect(changeSet.questions).toHaveLength(0);
    });

    it('détecte une mise à jour d’Options sans changement de libellé', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport();
      entrees[0].questions[0].options[0].libelle = 'Rarement';

      const changeSet = referentiel.calculerChangements(entrees);

      expect(changeSet.questions).toHaveLength(1);
      expect(changeSet.questions[0].type).toBe('maj');
      expect(changeSet.questions[0].avant?.libelle).toBe('Question 1');
      expect(changeSet.questions[0].apres.libelle).toBe('Question 1');
      expect(changeSet.questions[0].avant?.options[0]).toEqual({
        libelle: 'Jamais',
        niveau: 1,
      });
      expect(changeSet.questions[0].apres.options[0]).toEqual({
        libelle: 'Rarement',
        niveau: 1,
      });
    });

    it('archive un Thème et sa Question absents du nouvel import', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport().filter((theme) => theme.id !== 't2');

      const changeSet = referentiel.calculerChangements(entrees);

      expect(changeSet.themes).toEqual([
        {
          type: 'archivage',
          id: 't2',
          avant: { libelle: 'Thème 2' },
          apres: { libelle: 'Thème 2' },
        },
      ]);
      expect(changeSet.questions).toHaveLength(1);
      expect(changeSet.questions[0]).toMatchObject({
        type: 'archivage',
        id: 'q3',
      });
    });

    it('archive une Question seule quand son Thème reste présent', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport();
      entrees[0].questions = entrees[0].questions.filter((q) => q.id !== 'q2');

      const changeSet = referentiel.calculerChangements(entrees);

      expect(changeSet.themes).toHaveLength(0);
      expect(changeSet.questions).toHaveLength(1);
      expect(changeSet.questions[0]).toMatchObject({
        type: 'archivage',
        id: 'q2',
      });
    });

    it('réaffecte (jamais n’archive) une Question dont le Thème disparaît mais qui reste listée sous un autre Thème existant (AC #2)', () => {
      const referentiel = referentielImporte();
      const entrees: EntreeThemeImport[] = [
        {
          id: 't2',
          libelle: 'Thème 2',
          questions: [
            entreesImport()[1].questions[0],
            entreesImport()[0].questions[1],
          ],
        },
      ];

      const changeSet = referentiel.calculerChangements(entrees);

      expect(changeSet.themes).toEqual([
        {
          type: 'archivage',
          id: 't1',
          avant: { libelle: 'Thème 1' },
          apres: { libelle: 'Thème 1' },
        },
      ]);
      const q2 = changeSet.questions.find((q) => q.id === 'q2');
      expect(q2).toMatchObject({
        type: 'reaffectation',
        avant: { themeId: 't1' },
        apres: { themeId: 't2' },
      });
      const q1 = changeSet.questions.find((q) => q.id === 'q1');
      expect(q1).toMatchObject({ type: 'archivage' });
    });

    it('rapporte "reaffectation" (pas "maj") quand la réaffectation s’accompagne d’un changement de libellé', () => {
      const referentiel = referentielImporte();
      // q1 déplacé de t1 vers t2, avec un nouveau libellé, dans le même import.
      const entrees: EntreeThemeImport[] = [
        {
          id: 't1',
          libelle: 'Thème 1',
          questions: [entreesImport()[0].questions[1]],
        },
        {
          id: 't2',
          libelle: 'Thème 2',
          questions: [
            entreesImport()[1].questions[0],
            {
              ...entreesImport()[0].questions[0],
              libelle: 'Question 1 renommée',
            },
          ],
        },
      ];

      const changeSet = referentiel.calculerChangements(entrees);

      const q1 = changeSet.questions.find((q) => q.id === 'q1');
      expect(q1).toMatchObject({
        type: 'reaffectation',
        apres: { themeId: 't2', libelle: 'Question 1 renommée' },
      });
    });

    it('réactive un Thème précédemment archivé', () => {
      const referentiel = referentielImporte();
      referentiel.appliquerChangements(
        referentiel.calculerChangements(
          entreesImport().filter((t) => t.id !== 't2'),
        ),
      );

      const changeSet = referentiel.calculerChangements(entreesImport());

      expect(changeSet.themes).toContainEqual({
        type: 'reactivation',
        id: 't2',
        avant: { libelle: 'Thème 2' },
        apres: { libelle: 'Thème 2' },
      });
    });

    it('réactive une Question précédemment archivée', () => {
      const referentiel = referentielImporte();
      const entreesSansQ2 = entreesImport();
      entreesSansQ2[0].questions = entreesSansQ2[0].questions.filter(
        (q) => q.id !== 'q2',
      );
      referentiel.appliquerChangements(
        referentiel.calculerChangements(entreesSansQ2),
      );

      const changeSet = referentiel.calculerChangements(entreesImport());

      const q2 = changeSet.questions.find((q) => q.id === 'q2');
      expect(q2).toMatchObject({ type: 'reactivation', id: 'q2' });
    });

    it('rapporte une seule "reactivation" (jamais une "maj" séparée) quand le libellé a aussi changé pendant l’archivage', () => {
      const referentiel = referentielImporte();
      referentiel.appliquerChangements(
        referentiel.calculerChangements(
          entreesImport().filter((t) => t.id !== 't2'),
        ),
      );
      const entrees = entreesImport();
      entrees[1].libelle = 'Thème 2 renommé';

      const changeSet = referentiel.calculerChangements(entrees);

      const changementsT2 = changeSet.themes.filter((t) => t.id === 't2');
      expect(changementsT2).toHaveLength(1);
      expect(changementsT2[0]).toMatchObject({
        type: 'reactivation',
        apres: { libelle: 'Thème 2 renommé' },
      });
    });

    it('rapporte une seule "reactivation" pour une Question réactivée, réaffectée et renommée simultanément', () => {
      const referentiel = referentielImporte();
      const entreesSansQ3 = entreesImport().filter((t) => t.id !== 't2');
      referentiel.appliquerChangements(
        referentiel.calculerChangements(entreesSansQ3),
      );

      const entrees = entreesImport();
      entrees[0].questions.push({
        id: 'q3',
        libelle: 'Question 3 renommée',
        options: entreesImport()[1].questions[0].options,
      });
      entrees[1].questions = [];

      const changeSet = referentiel.calculerChangements(entrees);

      const changementsQ3 = changeSet.questions.filter((q) => q.id === 'q3');
      expect(changementsQ3).toHaveLength(1);
      expect(changementsQ3[0]).toMatchObject({
        type: 'reactivation',
        apres: { themeId: 't1', libelle: 'Question 3 renommée' },
      });
    });
  });

  describe('appliquerChangements', () => {
    it('met à jour une Question en place sans créer de doublon', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport();
      entrees[0].questions[0].libelle = 'Question 1 reformulée';

      referentiel.appliquerChangements(
        referentiel.calculerChangements(entrees),
      );

      const questions = referentiel.themesActifs().flatMap((t) => t.questions);
      expect(questions).toHaveLength(3);
      expect(questions.find((q) => q.id === 'q1')?.libelle).toBe(
        'Question 1 reformulée',
      );
    });

    it('met à jour les Options d’une Question en place', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport();
      entrees[0].questions[0].options[0].libelle = 'Rarement';

      referentiel.appliquerChangements(
        referentiel.calculerChangements(entrees),
      );

      const question = referentiel
        .themesActifs()
        .flatMap((t) => t.questions)
        .find((q) => q.id === 'q1')!;
      expect(question.options[0].libelle).toBe('Rarement');
    });

    it('déplace physiquement une Question réaffectée vers son nouveau Thème (AC #2)', () => {
      const referentiel = referentielImporte();
      const entrees: EntreeThemeImport[] = [
        {
          id: 't1',
          libelle: 'Thème 1',
          questions: [entreesImport()[0].questions[1]],
        },
        {
          id: 't2',
          libelle: 'Thème 2',
          questions: [
            entreesImport()[1].questions[0],
            entreesImport()[0].questions[0],
          ],
        },
      ];

      referentiel.appliquerChangements(
        referentiel.calculerChangements(entrees),
      );

      const t1 = referentiel.themes.find((t) => t.id === 't1')!;
      const t2 = referentiel.themesActifs().find((t) => t.id === 't2')!;
      expect(t1.questions.map((q) => q.id)).not.toContain('q1');
      expect(t2.questions.map((q) => q.id)).toContain('q1');
      expect(t2.questions.find((q) => q.id === 'q1')?.themeId).toBe('t2');
    });

    it('archive un Thème et une Question sans les supprimer physiquement', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport().filter((t) => t.id !== 't2');

      referentiel.appliquerChangements(
        referentiel.calculerChangements(entrees),
      );

      expect(referentiel.themesActifs().map((t) => t.id)).not.toContain('t2');
      const t2 = referentiel.themes.find((t) => t.id === 't2')!;
      expect(t2.retireLe).toBeInstanceOf(Date);
      const q3 = t2.questions.find((q) => q.id === 'q3')!;
      expect(q3.retireeLe).toBeInstanceOf(Date);
    });

    it('themesActifs() exclut une Question archivée même quand son Thème reste actif', () => {
      const referentiel = referentielImporte();
      const entrees = entreesImport();
      entrees[0].questions = entrees[0].questions.filter((q) => q.id !== 'q2');

      referentiel.appliquerChangements(
        referentiel.calculerChangements(entrees),
      );

      const t1 = referentiel.themesActifs().find((t) => t.id === 't1')!;
      expect(t1.questions.map((q) => q.id)).toEqual(['q1']);
      expect(t1.questions.map((q) => q.id)).not.toContain('q2');
      // toujours présente, non filtrée, via l'accès infrastructure non filtré.
      const t1NonFiltre = referentiel.themes.find((t) => t.id === 't1')!;
      expect(t1NonFiltre.questions.map((q) => q.id).sort()).toEqual([
        'q1',
        'q2',
      ]);
    });

    it('réactive un Thème archivé sans créer de doublon', () => {
      const referentiel = referentielImporte();
      referentiel.appliquerChangements(
        referentiel.calculerChangements(
          entreesImport().filter((t) => t.id !== 't2'),
        ),
      );

      referentiel.appliquerChangements(
        referentiel.calculerChangements(entreesImport()),
      );

      const themesT2 = referentiel.themes.filter((t) => t.id === 't2');
      expect(themesT2).toHaveLength(1);
      expect(themesT2[0].retireLe).toBeNull();
      expect(referentiel.themesActifs().map((t) => t.id)).toContain('t2');
    });

    it('réactive une Question archivée sans créer de doublon', () => {
      const referentiel = referentielImporte();
      const entreesSansQ2 = entreesImport();
      entreesSansQ2[0].questions = entreesSansQ2[0].questions.filter(
        (q) => q.id !== 'q2',
      );
      referentiel.appliquerChangements(
        referentiel.calculerChangements(entreesSansQ2),
      );

      referentiel.appliquerChangements(
        referentiel.calculerChangements(entreesImport()),
      );

      const questionsQ2 = referentiel.themes
        .flatMap((t) => t.questions)
        .filter((q) => q.id === 'q2');
      expect(questionsQ2).toHaveLength(1);
      expect(questionsQ2[0].retireeLe).toBeNull();
    });

    it('partage un même instant "maintenant" pour tous les items archivés dans le même appel', () => {
      const referentiel = referentielImporte();

      referentiel.appliquerChangements(referentiel.calculerChangements([]));

      const t1 = referentiel.themes.find((t) => t.id === 't1')!;
      const t2 = referentiel.themes.find((t) => t.id === 't2')!;
      expect(t1.retireLe).not.toBeNull();
      expect(t2.retireLe).not.toBeNull();
      expect(t1.retireLe!.getTime()).toBe(t2.retireLe!.getTime());
      expect(t1.retireLe!.getTime()).toBe(referentiel.derniereMajLe!.getTime());
    });
  });
});
