import { parseReferentielYaml } from './referentiel-yaml.parser';

const yamlValide = `
themes:
  - id: t1
    libelle: Thème 1
    questions:
      - id: q1
        libelle: Question 1
        options:
          - libelle: Jamais
            niveau: 1
          - libelle: Parfois
            niveau: 2
          - libelle: Souvent
            niveau: 3
          - libelle: Toujours
            niveau: 4
`;

describe('parseReferentielYaml', () => {
  it('transforme un YAML valide en entrées typées', () => {
    const resultat = parseReferentielYaml(yamlValide);

    expect(resultat.type).toBe('valide');
    if (resultat.type !== 'valide') throw new Error('unreachable');
    expect(resultat.themes).toEqual([
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
        ],
      },
    ]);
  });

  it('accepte une liste de thèmes vide', () => {
    const resultat = parseReferentielYaml('themes: []');

    expect(resultat).toEqual({ type: 'valide', themes: [] });
  });

  it('rejette un YAML syntaxiquement mal formé', () => {
    const resultat = parseReferentielYaml('themes: [ not: valid');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs[0].type).toBe('yaml-mal-forme');
  });

  it('rejette un YAML sans clé racine "themes"', () => {
    const resultat = parseReferentielYaml('autrechose: []');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs[0].type).toBe('yaml-mal-forme');
  });

  it('rejette une Clé stable de Thème dupliquée', () => {
    const yaml = `
themes:
  - id: t1
    libelle: Thème 1
    questions: []
  - id: t1
    libelle: Thème 1 bis
    questions: []
`;
    const resultat = parseReferentielYaml(yaml);

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs.some((e) => e.type === 'cle-dupliquee')).toBe(true);
  });

  it('rejette une Clé stable de Question dupliquée entre deux Thèmes', () => {
    const yaml = `
themes:
  - id: t1
    libelle: Thème 1
    questions:
      - id: q1
        libelle: Question 1
        options:
          - { libelle: Jamais, niveau: 1 }
          - { libelle: Parfois, niveau: 2 }
          - { libelle: Souvent, niveau: 3 }
          - { libelle: Toujours, niveau: 4 }
  - id: t2
    libelle: Thème 2
    questions:
      - id: q1
        libelle: Question 1 bis
        options:
          - { libelle: Jamais, niveau: 1 }
          - { libelle: Parfois, niveau: 2 }
          - { libelle: Souvent, niveau: 3 }
          - { libelle: Toujours, niveau: 4 }
`;
    const resultat = parseReferentielYaml(yaml);

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs.some((e) => e.type === 'cle-dupliquee')).toBe(true);
  });

  it('rejette un id de Thème manquant', () => {
    const yaml = `
themes:
  - libelle: Thème sans id
    questions: []
`;
    const resultat = parseReferentielYaml(yaml);

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs[0].type).toBe('cle-manquante');
  });

  it('rejette un id de Question manquant', () => {
    const yaml = `
themes:
  - id: t1
    libelle: Thème 1
    questions:
      - libelle: Question sans id
        options: []
`;
    const resultat = parseReferentielYaml(yaml);

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs[0].type).toBe('cle-manquante');
  });

  it("rejette un nombre d'Options invalide", () => {
    const yaml = `
themes:
  - id: t1
    libelle: Thème 1
    questions:
      - id: q1
        libelle: Question 1
        options:
          - { libelle: Jamais, niveau: 1 }
          - { libelle: Parfois, niveau: 2 }
`;
    const resultat = parseReferentielYaml(yaml);

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs[0].type).toBe('nombre-options-invalide');
  });

  it('rejette un Niveau hors bornes', () => {
    const yaml = `
themes:
  - id: t1
    libelle: Thème 1
    questions:
      - id: q1
        libelle: Question 1
        options:
          - { libelle: Jamais, niveau: 1 }
          - { libelle: Parfois, niveau: 2 }
          - { libelle: Souvent, niveau: 3 }
          - { libelle: Toujours, niveau: 5 }
`;
    const resultat = parseReferentielYaml(yaml);

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs[0].type).toBe('niveau-invalide');
  });

  it('rejette des Niveaux dupliqués', () => {
    const yaml = `
themes:
  - id: t1
    libelle: Thème 1
    questions:
      - id: q1
        libelle: Question 1
        options:
          - { libelle: Jamais, niveau: 1 }
          - { libelle: Parfois, niveau: 1 }
          - { libelle: Souvent, niveau: 3 }
          - { libelle: Toujours, niveau: 4 }
`;
    const resultat = parseReferentielYaml(yaml);

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs[0].type).toBe('niveau-invalide');
  });
});
