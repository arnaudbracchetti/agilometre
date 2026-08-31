import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { droitGuard } from './droit.guard';
import { DroitsService } from './droits.service';

describe('droitGuard', () => {
  function executer(peut: boolean) {
    const arbreDeRedirection = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(arbreDeRedirection);
    TestBed.configureTestingModule({
      providers: [
        { provide: DroitsService, useValue: { peut: () => peut } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
    const guard = droitGuard('gererOrganisation');
    const resultat = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never),
    );
    return { resultat, createUrlTree };
  }

  it('laisse passer un utilisateur qui a la capacité', () => {
    expect(executer(true).resultat).toBe(true);
  });

  it('redirige vers l’accueil si la capacité manque', () => {
    const { resultat, createUrlTree } = executer(false);

    expect(resultat).not.toBe(true);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
