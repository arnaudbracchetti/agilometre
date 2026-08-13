import { Referentiel } from '../domain/referentiel';
import { ReferentielRepository } from '../domain/referentiel.repository';
import { PreviewImportReferentiel } from './preview-import-referentiel.usecase';

class ReferentielRepositoryFake implements ReferentielRepository {
  sauvegarderAppele = false;

  charger(): Promise<Referentiel> {
    return Promise.resolve(Referentiel.vide());
  }

  sauvegarder(): Promise<void> {
    this.sauvegarderAppele = true;
    return Promise.resolve();
  }
}

const yamlValide = `
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
`;

describe('PreviewImportReferentiel', () => {
  it('renvoie un ChangeSet en création pour un YAML valide sur un Référentiel vide', async () => {
    const repository = new ReferentielRepositoryFake();
    const useCase = new PreviewImportReferentiel(repository);

    const resultat = await useCase.executer(yamlValide);

    expect(resultat.type).toBe('valide');
    if (resultat.type !== 'valide') throw new Error('unreachable');
    expect(resultat.changeSet.themes).toHaveLength(1);
    expect(resultat.changeSet.themes[0].type).toBe('creation');
    expect(resultat.changeSet.questions).toHaveLength(1);
    expect(resultat.changeSet.questions[0].type).toBe('creation');
    expect(resultat.resume).toContain('Thèmes (1 création)');
    expect(resultat.resume).toContain('Questions (1 création)');
    expect(repository.sauvegarderAppele).toBe(false);
  });

  it('renvoie les erreurs de parsing pour un YAML invalide, sans appeler sauvegarder', async () => {
    const repository = new ReferentielRepositoryFake();
    const useCase = new PreviewImportReferentiel(repository);

    const resultat = await useCase.executer('themes: [ not: valid');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs.length).toBeGreaterThan(0);
    expect(repository.sauvegarderAppele).toBe(false);
  });
});
