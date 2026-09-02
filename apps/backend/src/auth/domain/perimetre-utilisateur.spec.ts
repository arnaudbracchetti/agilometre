import { Role } from '@agilometre/shared';
import { Utilisateur } from '../../organisation/domain/utilisateur';
import { UtilisateurRepository } from '../../organisation/domain/utilisateur.repository';
import { Equipe } from '../../organisation/domain/equipe';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { PerimetreUtilisateur } from './perimetre-utilisateur';

function creerDirectionHabilitee(entiteIds: string[]): Utilisateur {
  const utilisateur = Utilisateur.creer(
    'u2',
    'direction@example.com',
    'Ada',
    'Lovelace',
    'hash',
    Role.Direction,
  ).valeur;
  entiteIds.forEach((entiteId, index) =>
    utilisateur.ajouterHabilitation(`h${index}`, { entiteId }),
  );
  return utilisateur;
}

class UtilisateurRepositoryFake implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[]) {}

  trouverParId(id: string): Promise<Utilisateur | null> {
    return Promise.resolve(
      this.utilisateurs.find((utilisateur) => utilisateur.id === id) ?? null,
    );
  }

  trouverParEmail(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  lister(): Promise<Utilisateur[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  sauvegarderEtPropager(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

class EquipeRepositoryFake implements EquipeRepository {
  constructor(private readonly equipes: Equipe[]) {}

  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }

  findByEntiteId(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParNom(): Promise<Equipe | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  remove(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  compterParEntite(): Promise<number> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParEmailMembre(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  estMembreDe(utilisateurId: string, equipeId: string): Promise<boolean> {
    const equipe = this.equipes.find((e) => e.id === equipeId);
    return Promise.resolve(
      equipe?.membres.some((m) => m.utilisateurId === utilisateurId) ?? false,
    );
  }

  aUneEquipeDansLEntite(
    utilisateurId: string,
    entiteId: string,
  ): Promise<boolean> {
    return Promise.resolve(
      this.equipes.some(
        (e) =>
          e.entiteId === entiteId &&
          e.membres.some((m) => m.utilisateurId === utilisateurId),
      ),
    );
  }
}

function creerEquipeAvecMembreLie(
  equipeId: string,
  membreId: string,
  utilisateurId: string,
): Equipe {
  const equipe = Equipe.creer(equipeId, 'Alpha', 'e1').valeur;
  equipe.ajouterMembre(membreId, 'Jean Dupont', null, 'jean@example.com');
  equipe.lierUtilisateur(
    membreId,
    utilisateurId,
    'Jean',
    'Dupont',
    'jean@example.com',
  );
  return equipe;
}

describe('PerimetreUtilisateur', () => {
  it('peutVoirEntite — toujours vrai pour un Coach', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u1', email: 'coach@example.com', role: Role.Coach },
        'entite-1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEquipe — toujours vrai pour un Coach', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEquipe(
        { id: 'u1', email: 'coach@example.com', role: Role.Coach },
        'equipe-1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEntite — vrai pour une Direction habilitée sur cette Entité', async () => {
    const direction = creerDirectionHabilitee(['entite-1', 'entite-2']);
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([direction]),
      new EquipeRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u2', email: 'direction@example.com', role: Role.Direction },
        'entite-1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEntite — faux pour une Direction non habilitée sur cette Entité', async () => {
    const direction = creerDirectionHabilitee(['entite-1']);
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([direction]),
      new EquipeRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u2', email: 'direction@example.com', role: Role.Direction },
        'entite-2',
      ),
    ).resolves.toBe(false);
  });

  it('peutVoirEntite — faux pour un compte Direction introuvable', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'inconnu', email: 'direction@example.com', role: Role.Direction },
        'entite-1',
      ),
    ).resolves.toBe(false);
  });

  it('peutVoirEntite — vrai pour un Membre dont une Équipe dépend de cette Entité', async () => {
    const equipe = creerEquipeAvecMembreLie('equipe-1', 'm1', 'u3');
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([equipe]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u3', email: 'membre@example.com', role: Role.Membre },
        'e1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEntite — faux pour un Membre sans Équipe dans cette Entité', async () => {
    const equipe = creerEquipeAvecMembreLie('equipe-1', 'm1', 'u3');
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([equipe]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u3', email: 'membre@example.com', role: Role.Membre },
        'entite-inconnue',
      ),
    ).resolves.toBe(false);
  });

  it('peutVoirEquipe — faux pour une Direction, jamais aucune Équipe visible', async () => {
    const equipe = creerEquipeAvecMembreLie('equipe-1', 'm1', 'u3');
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([equipe]),
    );

    await expect(
      perimetre.peutVoirEquipe(
        { id: 'u2', email: 'direction@example.com', role: Role.Direction },
        'equipe-1',
      ),
    ).resolves.toBe(false);
  });

  it('peutVoirEquipe — vrai pour un Membre présent au roster de cette Équipe', async () => {
    const equipe = creerEquipeAvecMembreLie('equipe-1', 'm1', 'u3');
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([equipe]),
    );

    await expect(
      perimetre.peutVoirEquipe(
        { id: 'u3', email: 'membre@example.com', role: Role.Membre },
        'equipe-1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEquipe — faux pour un Membre absent du roster de cette Équipe', async () => {
    const equipe = creerEquipeAvecMembreLie('equipe-1', 'm1', 'u3');
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([equipe]),
    );

    await expect(
      perimetre.peutVoirEquipe(
        { id: 'u3', email: 'membre@example.com', role: Role.Membre },
        'equipe-2',
      ),
    ).resolves.toBe(false);
  });

  it('peutVoirEquipe — faux pour une Équipe inconnue', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
      new EquipeRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEquipe(
        { id: 'u3', email: 'membre@example.com', role: Role.Membre },
        'equipe-inconnue',
      ),
    ).resolves.toBe(false);
  });
});
