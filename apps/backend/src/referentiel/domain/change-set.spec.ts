import { ChangeSet } from './change-set';

describe('ChangeSet.resume', () => {
  it("renvoie un message unique quand il n'y a aucun changement", () => {
    const changeSet = ChangeSet.creer([], []);

    expect(changeSet.resume()).toBe('Aucun changement détecté.');
  });

  it('ne montre que la section Thèmes quand seul un thème est créé', () => {
    const changeSet = ChangeSet.creer(
      [
        {
          type: 'creation',
          id: 't1',
          avant: null,
          apres: { libelle: 'Facilitation' },
        },
      ],
      [],
    );

    expect(changeSet.resume()).toBe(
      'Thèmes (1 création)\n- Création : « Facilitation »',
    );
  });

  it('ne montre que la section Questions quand seule une question est créée', () => {
    const changeSet = ChangeSet.creer(
      [],
      [
        {
          type: 'creation',
          id: 'q1',
          avant: null,
          apres: {
            libelle: 'Le Product Owner priorise-t-il le backlog ?',
            themeId: 't1',
            options: [],
          },
        },
      ],
    );

    expect(changeSet.resume()).toBe(
      'Questions (1 création)\n- Création : « Le Product Owner priorise-t-il le backlog ? »',
    );
  });

  it('assemble les sections Thèmes et Questions quand les deux ont des changements', () => {
    const changeSet = ChangeSet.creer(
      [
        {
          type: 'creation',
          id: 't1',
          avant: null,
          apres: { libelle: 'Facilitation' },
        },
      ],
      [
        {
          type: 'creation',
          id: 'q1',
          avant: null,
          apres: {
            libelle: 'Le Product Owner priorise-t-il le backlog ?',
            themeId: 't1',
            options: [],
          },
        },
      ],
    );

    expect(changeSet.resume()).toBe(
      'Thèmes (1 création)\n- Création : « Facilitation »\n\n' +
        'Questions (1 création)\n- Création : « Le Product Owner priorise-t-il le backlog ? »',
    );
  });

  it('affiche une flèche quand la mise à jour change le libellé', () => {
    const changeSet = ChangeSet.creer(
      [],
      [
        {
          type: 'maj',
          id: 'q2',
          avant: {
            libelle: 'Ancien libellé',
            themeId: 't1',
            options: [],
          },
          apres: {
            libelle: 'Nouveau libellé',
            themeId: 't1',
            options: [],
          },
        },
      ],
    );

    expect(changeSet.resume()).toBe(
      'Questions (1 mise à jour)\n- Mise à jour : « Ancien libellé » → « Nouveau libellé »',
    );
  });

  it('signale "options modifiées" quand la mise à jour ne change pas le libellé', () => {
    const changeSet = ChangeSet.creer(
      [],
      [
        {
          type: 'maj',
          id: 'q2',
          avant: {
            libelle: 'Même libellé',
            themeId: 't1',
            options: [{ libelle: 'Jamais', niveau: 1 }],
          },
          apres: {
            libelle: 'Même libellé',
            themeId: 't1',
            options: [{ libelle: 'Rarement', niveau: 1 }],
          },
        },
      ],
    );

    expect(changeSet.resume()).toBe(
      'Questions (1 mise à jour)\n- Mise à jour : « Même libellé » (options modifiées)',
    );
  });

  it('rend les archivages, réactivations et réaffectations', () => {
    const changeSet = ChangeSet.creer(
      [
        {
          type: 'archivage',
          id: 't1',
          avant: { libelle: 'Facilitation' },
          apres: { libelle: 'Facilitation' },
        },
        {
          type: 'reactivation',
          id: 't2',
          avant: { libelle: 'Delivery' },
          apres: { libelle: 'Delivery' },
        },
      ],
      [
        {
          type: 'reaffectation',
          id: 'q1',
          avant: {
            libelle: 'Question',
            themeId: 't1',
            options: [],
          },
          apres: {
            libelle: 'Question',
            themeId: 't2',
            options: [],
          },
        },
      ],
    );

    expect(changeSet.resume()).toBe(
      'Thèmes (1 archivage, 1 réactivation)\n' +
        '- Archivage : « Facilitation »\n' +
        '- Réactivation : « Delivery »\n\n' +
        'Questions (1 réaffectation)\n' +
        '- Réaffectation : « Question »',
    );
  });

  it('ordonne les lignes par type (création avant mise à jour) au sein d’une section', () => {
    const changeSet = ChangeSet.creer(
      [
        {
          type: 'maj',
          id: 't1',
          avant: { libelle: 'Ancien' },
          apres: { libelle: 'Nouveau' },
        },
        {
          type: 'creation',
          id: 't2',
          avant: null,
          apres: { libelle: 'Facilitation' },
        },
      ],
      [],
    );

    expect(changeSet.resume()).toBe(
      'Thèmes (1 création, 1 mise à jour)\n' +
        '- Création : « Facilitation »\n' +
        '- Mise à jour : « Ancien » → « Nouveau »',
    );
  });
});
