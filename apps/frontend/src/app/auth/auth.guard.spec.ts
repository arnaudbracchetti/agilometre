import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  function executer(estConnecte: boolean, url = '/organisation') {
    const arbreDeRedirection = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(arbreDeRedirection);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { estConnecte: () => estConnecte } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
    const resultat = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url } as never),
    );
    return { resultat, createUrlTree };
  }

  it('laisse passer un utilisateur connecté', () => {
    expect(executer(true).resultat).toBe(true);
  });

  it('redirige vers /connexion avec l’URL demandée en query param "retour"', () => {
    const { resultat, createUrlTree } = executer(false, '/organisation');

    expect(resultat).not.toBe(true);
    expect(createUrlTree).toHaveBeenCalledWith(['/connexion'], {
      queryParams: { retour: '/organisation' },
    });
  });
});
