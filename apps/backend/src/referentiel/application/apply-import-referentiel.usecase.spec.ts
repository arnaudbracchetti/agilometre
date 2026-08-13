import { Referentiel } from '../domain/referentiel';
import { ReferentielRepository } from '../domain/referentiel.repository';
import { ApplyImportReferentiel } from './apply-import-referentiel.usecase';
import { PreviewImportReferentiel } from './preview-import-referentiel.usecase';

class ReferentielRepositoryFake implements ReferentielRepository {
  sauvegarderAppele = false;
  referentielSauvegarde: Referentiel | null = null;

  charger(): Promise<Referentiel> {
    return Promise.resolve(Referentiel.vide());
  }

  sauvegarder(referentiel: Referentiel): Promise<void> {
    this.sauvegarderAppele = true;
    this.referentielSauvegarde = referentiel;
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

describe('ApplyImportReferentiel', () => {
  it('sauvegarde le Référentiel muté pour un YAML valide', async () => {
    const repository = new ReferentielRepositoryFake();
    const useCase = new ApplyImportReferentiel(repository);

    const resultat = await useCase.executer(yamlValide);

    expect(resultat.type).toBe('applique');
    if (resultat.type !== 'applique') throw new Error('unreachable');
    expect(resultat.changeSet.themes[0]).toMatchObject({
      type: 'creation',
      id: 't1',
    });

    expect(repository.sauvegarderAppele).toBe(true);
    const themesSauvegardes = repository.referentielSauvegarde!.themesActifs();
    expect(themesSauvegardes).toHaveLength(1);
    expect(themesSauvegardes[0].questions.map((q) => q.id)).toEqual(['q1']);
  });

  it('renvoie les erreurs de parsing pour un YAML invalide, sans appeler sauvegarder', async () => {
    const repository = new ReferentielRepositoryFake();
    const useCase = new ApplyImportReferentiel(repository);

    const resultat = await useCase.executer('themes: [ not: valid');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreurs.length).toBeGreaterThan(0);
    expect(repository.sauvegarderAppele).toBe(false);
  });

  it('produit le même ChangeSet que PreviewImportReferentiel pour un même YAML', async () => {
    const changeSetPreview = await new PreviewImportReferentiel(
      new ReferentielRepositoryFake(),
    ).executer(yamlValide);
    const changeSetApply = await new ApplyImportReferentiel(
      new ReferentielRepositoryFake(),
    ).executer(yamlValide);

    if (changeSetPreview.type !== 'valide' || changeSetApply.type !== 'applique') {
      throw new Error('unreachable');
    }
    expect(changeSetApply.changeSet).toEqual(changeSetPreview.changeSet);
  });
});
