import { Role } from '@agilometre/shared';
import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { AjouterMembre } from './ajouter-membre.usecase';

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];

  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }

  findByEntiteId(entiteId: string): Promise<Equipe[]> {
    return Promise.resolve(this.equipes.filter((e) => e.entiteId === entiteId));
  }

  trouverParNom(): Promise<Equipe | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  remove(): Promise<void> {
    return Promise.resolve();
  }

  compterParEntite(): Promise<number> {
    return Promise.resolve(0);
  }

  trouverParEmailMembre(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  estMembreDe(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  aUneEquipeDansLEntite(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

class UtilisateurRepositoryFake implements UtilisateurRepository {
  utilisateurs: Utilisateur[] = [];

  trouverParEmail(email: string): Promise<Utilisateur | null> {
    const recherche = email.toLowerCase();
    return Promise.resolve(
      this.utilisateurs.find((u) => u.email.toLowerCase() === recherche) ??
        null,
    );
  }

  trouverParId(): Promise<Utilisateur | null> {
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

function creerCompte(role: Role, email: string): Utilisateur {
  return Utilisateur.creer('u1', email, 'Jean', 'Dupont', 'hash', role).valeur;
}

describe('AjouterMembre', () => {
  it('ajoute un Membre valide au roster de l’Équipe', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const utilisateurs = new UtilisateurRepositoryFake();
    const useCase = new AjouterMembre(repository, utilisateurs);

    const resultat = await useCase.executer(
      'eq1',
      'Jean Dupont',
      'jean@example.com',
    );

    expect(resultat.type).toBe('ajoute');
    if (resultat.type !== 'ajoute') throw new Error('unreachable');
    expect(resultat.equipe.membres).toHaveLength(1);
    expect(resultat.equipe.membres[0].nom).toBe('Jean Dupont');
    expect(resultat.equipe.membres[0].utilisateurId).toBeNull();
  });

  it('renvoie "introuvable" pour une Équipe inconnue', async () => {
    const repository = new EquipeRepositoryFake();
    const utilisateurs = new UtilisateurRepositoryFake();
    const useCase = new AjouterMembre(repository, utilisateurs);

    const resultat = await useCase.executer(
      'inconnue',
      'Jean Dupont',
      'jean@example.com',
    );

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "invalide" pour un email mal formé', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const utilisateurs = new UtilisateurRepositoryFake();
    const useCase = new AjouterMembre(repository, utilisateurs);

    const resultat = await useCase.executer(
      'eq1',
      'Jean Dupont',
      'pas-un-email',
    );

    expect(resultat.type).toBe('invalide');
  });

  it('renvoie "invalide" pour un email déjà présent dans le roster de cette Équipe', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
    repository.equipes.push(equipe);
    const utilisateurs = new UtilisateurRepositoryFake();
    const useCase = new AjouterMembre(repository, utilisateurs);

    const resultat = await useCase.executer(
      'eq1',
      'Jean D.',
      'jean@example.com',
    );

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur.name).toBe('EmailMembreDejaUtiliseError');
  });

  it('lie automatiquement le Membre à un compte Membre d’équipe existant de même email', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const utilisateurs = new UtilisateurRepositoryFake();
    utilisateurs.utilisateurs.push(
      creerCompte(Role.Membre, 'jean@example.com'),
    );
    const useCase = new AjouterMembre(repository, utilisateurs);

    const resultat = await useCase.executer(
      'eq1',
      'Autre nom',
      'jean@example.com',
    );

    expect(resultat.type).toBe('ajoute');
    if (resultat.type !== 'ajoute') throw new Error('unreachable');
    expect(resultat.equipe.membres[0].utilisateurId).toBe('u1');
    // Le compte fait autorité : le nom saisi sur le roster est écrasé par celui du compte.
    expect(resultat.equipe.membres[0].nom).toBe('Dupont');
  });

  it('ne lie pas un Membre à un compte de même email mais d’un autre Rôle', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const utilisateurs = new UtilisateurRepositoryFake();
    utilisateurs.utilisateurs.push(creerCompte(Role.Coach, 'jean@example.com'));
    const useCase = new AjouterMembre(repository, utilisateurs);

    const resultat = await useCase.executer(
      'eq1',
      'Jean Dupont',
      'jean@example.com',
    );

    expect(resultat.type).toBe('ajoute');
    if (resultat.type !== 'ajoute') throw new Error('unreachable');
    expect(resultat.equipe.membres[0].utilisateurId).toBeNull();
    expect(resultat.equipe.membres[0].nom).toBe('Jean Dupont');
  });
});
