import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@agilometre/shared';
import { Utilisateur } from '../../organisation/domain/utilisateur';
import { UtilisateurRepository } from '../../organisation/domain/utilisateur.repository';
import { Equipe } from '../../organisation/domain/equipe';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { PerimetreUtilisateur } from '../domain/perimetre-utilisateur';
import { RequeteAuthentifiee } from './auth.guard';
import { PerimetreGuard } from './perimetre.guard';

function creerContexte(
  request: Partial<RequeteAuthentifiee>,
): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

class UtilisateurRepositoryFake implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[] = []) {}

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
  findById(): Promise<Equipe | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
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

  estMembreDe(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  aUneEquipeDansLEntite(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('PerimetreGuard', () => {
  function creerGuard(
    type: string | undefined,
    utilisateurs: Utilisateur[] = [],
  ) {
    const reflector = {
      getAllAndOverride: () => type,
    } as unknown as Reflector;
    return new PerimetreGuard(
      reflector,
      new PerimetreUtilisateur(
        new UtilisateurRepositoryFake(utilisateurs),
        new EquipeRepositoryFake(),
      ),
    );
  }

  it('laisse passer si @Perimetre(...) est absent (no-op)', async () => {
    const guard = creerGuard(undefined);
    const context = creerContexte({ params: { id: 'entite-1' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('laisse passer un Coach sur une ressource "entite"', async () => {
    const guard = creerGuard('entite');
    const context = creerContexte({
      params: { id: 'entite-1' },
      utilisateur: { id: 'u1', email: 'coach@example.com', role: Role.Coach },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('laisse passer une Direction habilitée sur cette Entité', async () => {
    const direction = Utilisateur.creer(
      'u2',
      'direction@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Direction,
    ).valeur;
    direction.ajouterHabilitation('h1', { entiteId: 'entite-1' });
    const guard = creerGuard('entite', [direction]);
    const context = creerContexte({
      params: { id: 'entite-1' },
      utilisateur: {
        id: 'u2',
        email: 'direction@example.com',
        role: Role.Direction,
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejette en 403 une Direction non habilitée sur cette Entité', async () => {
    const direction = Utilisateur.creer(
      'u2',
      'direction@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Direction,
    ).valeur;
    const guard = creerGuard('entite', [direction]);
    const context = creerContexte({
      params: { id: 'entite-1' },
      utilisateur: {
        id: 'u2',
        email: 'direction@example.com',
        role: Role.Direction,
      },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('propage l’échec de PerimetreUtilisateur pour un Rôle non implémenté', async () => {
    const guard = creerGuard('entite');
    const context = creerContexte({
      params: { id: 'entite-1' },
      utilisateur: {
        id: 'u3',
        email: 'membre@example.com',
        role: Role.Membre,
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow();
  });
});
