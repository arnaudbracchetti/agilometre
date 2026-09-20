import { Equipe } from '../../organisation/domain/equipe';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { ModeleCollecte } from '../../modele-collecte/domain/modele-collecte';
import { ModeleCollecteRepository } from '../../modele-collecte/domain/modele-collecte.repository';
import { Selection } from '../../modele-collecte/domain/selection';
import { CampagnePouls } from '../domain/campagne-pouls';
import { CampagnePoulsRepository } from '../domain/campagne-pouls.repository';
import { CreerCampagnePouls } from './creer-campagne-pouls.usecase';

function equipeFactice(
  overrides: Partial<EquipeRepository> = {},
): jest.Mocked<EquipeRepository> {
  return {
    findById: jest.fn(),
    findByEntiteId: jest.fn(),
    trouverParNom: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    compterParEntite: jest.fn(),
    trouverParEmailMembre: jest.fn(),
    estMembreDe: jest.fn(),
    aUneEquipeDansLEntite: jest.fn(),
    ...overrides,
  } as jest.Mocked<EquipeRepository>;
}

function modelesFactice(
  overrides: Partial<ModeleCollecteRepository> = {},
): jest.Mocked<ModeleCollecteRepository> {
  return {
    findById: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as jest.Mocked<ModeleCollecteRepository>;
}

function campagnesFactice(
  overrides: Partial<CampagnePoulsRepository> = {},
): jest.Mocked<CampagnePoulsRepository> {
  return {
    findParEquipe: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    ...overrides,
  } as jest.Mocked<CampagnePoulsRepository>;
}

describe('CreerCampagnePouls', () => {
  it("échoue si l'Équipe est introuvable", async () => {
    const equipes = equipeFactice({
      findById: jest.fn().mockResolvedValue(null),
    });
    const usecase = new CreerCampagnePouls(
      campagnesFactice(),
      equipes,
      modelesFactice(),
    );

    const resultat = await usecase.executer(
      'equipe-1',
      'modele-1',
      [1],
      480,
      3,
    );

    expect(resultat).toEqual({ type: 'equipe_introuvable' });
  });

  it('échoue si le Modèle de collecte est introuvable', async () => {
    const equipe = { id: 'equipe-1' } as Equipe;
    const equipes = equipeFactice({
      findById: jest.fn().mockResolvedValue(equipe),
    });
    const modeles = modelesFactice({
      findById: jest.fn().mockResolvedValue(null),
    });
    const usecase = new CreerCampagnePouls(
      campagnesFactice(),
      equipes,
      modeles,
    );

    const resultat = await usecase.executer(
      'equipe-1',
      'modele-1',
      [1],
      480,
      3,
    );

    expect(resultat).toEqual({ type: 'modele_introuvable' });
  });

  it("échoue si une Campagne non-Terminée existe déjà pour l'Équipe", async () => {
    const equipe = { id: 'equipe-1' } as Equipe;
    const equipes = equipeFactice({
      findById: jest.fn().mockResolvedValue(equipe),
    });
    const modele = ModeleCollecte.creer('modele-1', 'Modèle').valeur;
    const modeles = modelesFactice({
      findById: jest.fn().mockResolvedValue(modele),
    });
    const campagneExistante = { statut: 'ACTIVE' } as CampagnePouls;
    const campagnes = campagnesFactice({
      findParEquipe: jest.fn().mockResolvedValue(campagneExistante),
    });
    const usecase = new CreerCampagnePouls(campagnes, equipes, modeles);

    const resultat = await usecase.executer(
      'equipe-1',
      'modele-1',
      [1],
      480,
      3,
    );

    expect(resultat).toEqual({ type: 'campagne_existante' });
  });

  it('autorise la création si la Campagne précédente est Terminée', async () => {
    const equipe = { id: 'equipe-1' } as Equipe;
    const equipes = equipeFactice({
      findById: jest.fn().mockResolvedValue(equipe),
    });
    const modele = ModeleCollecte.creer('modele-1', 'Modèle').valeur;
    const modeles = modelesFactice({
      findById: jest.fn().mockResolvedValue(modele),
    });
    const campagneTerminee = { statut: 'TERMINEE' } as CampagnePouls;
    const campagnes = campagnesFactice({
      findParEquipe: jest.fn().mockResolvedValue(campagneTerminee),
    });
    const usecase = new CreerCampagnePouls(campagnes, equipes, modeles);

    const resultat = await usecase.executer(
      'equipe-1',
      'modele-1',
      [1],
      480,
      3,
    );

    expect(resultat.type).toBe('creee');
  });

  it('échoue si le Rythme est invalide', async () => {
    const equipe = { id: 'equipe-1' } as Equipe;
    const equipes = equipeFactice({
      findById: jest.fn().mockResolvedValue(equipe),
    });
    const modele = ModeleCollecte.creer('modele-1', 'Modèle').valeur;
    const modeles = modelesFactice({
      findById: jest.fn().mockResolvedValue(modele),
    });
    const usecase = new CreerCampagnePouls(
      campagnesFactice(),
      equipes,
      modeles,
    );

    const resultat = await usecase.executer('equipe-1', 'modele-1', [], 480, 3);

    expect(resultat.type).toBe('invalide');
  });

  it('échoue si le nombre de Questions par envoi est invalide', async () => {
    const equipe = { id: 'equipe-1' } as Equipe;
    const equipes = equipeFactice({
      findById: jest.fn().mockResolvedValue(equipe),
    });
    const modele = ModeleCollecte.creer('modele-1', 'Modèle').valeur;
    const modeles = modelesFactice({
      findById: jest.fn().mockResolvedValue(modele),
    });
    const usecase = new CreerCampagnePouls(
      campagnesFactice(),
      equipes,
      modeles,
    );

    const resultat = await usecase.executer(
      'equipe-1',
      'modele-1',
      [1],
      480,
      0,
    );

    expect(resultat.type).toBe('invalide');
  });

  it('copie la Sélection du Modèle en Panel figé, indépendant du Modèle source', async () => {
    const equipe = { id: 'equipe-1' } as Equipe;
    const equipes = equipeFactice({
      findById: jest.fn().mockResolvedValue(equipe),
    });
    const modele = ModeleCollecte.creer('modele-1', 'Modèle').valeur;
    modele.ajouterQuestion('q1');
    modele.ajouterQuestion('q2');
    const modeles = modelesFactice({
      findById: jest.fn().mockResolvedValue(modele),
    });
    const campagnes = campagnesFactice();
    const usecase = new CreerCampagnePouls(campagnes, equipes, modeles);

    const resultat = await usecase.executer(
      'equipe-1',
      'modele-1',
      [1, 3],
      480,
      2,
    );

    expect(resultat.type).toBe('creee');
    if (resultat.type !== 'creee') {
      throw new Error('résultat inattendu');
    }
    expect(resultat.campagne.panel.questionIds).toEqual(['q1', 'q2']);
    expect(resultat.campagne.statut).toBe('BROUILLON');
    expect(campagnes.save.mock.calls[0]).toEqual([resultat.campagne]);

    modele.retirerQuestion('q1');
    expect(resultat.campagne.panel.questionIds).toEqual(['q1', 'q2']);
  });
});
