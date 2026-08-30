import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Role } from '@agilometre/shared';
import { AuthService } from './auth.service';
import { DroitsService } from './droits.service';

describe('DroitsService', () => {
  function creerService(role: Role | null): DroitsService {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { role: signal(role) } }],
    });
    return TestBed.inject(DroitsService);
  }

  it('un Coach a accès à gererOrganisation', () => {
    expect(creerService(Role.Coach).peut('gererOrganisation')).toBe(true);
  });

  it('une Direction n’a pas accès à gererOrganisation (carte #59 : Coach seul)', () => {
    expect(creerService(Role.Direction).peut('gererOrganisation')).toBe(false);
  });

  it('aucun Rôle (déconnecté) n’a jamais accès à une capacité protégée', () => {
    expect(creerService(null).peut('gererOrganisation')).toBe(false);
  });
});
