import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Role } from '@agilometre/shared';
import { AuthService } from '../auth/auth.service';
import { LiensNavService } from './liens-nav.service';

function creerService(role: Role | null): LiensNavService {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { role: signal(role) } }],
  });
  return TestBed.inject(LiensNavService);
}

describe('LiensNavService', () => {
  it('menu vide quand aucun Rôle (déconnecté)', () => {
    expect(creerService(null).liens()).toEqual([]);
  });

  it('un Coach voit Administration (avec ses trois sous-entrées), Sessions et Profil d’équipe', () => {
    const liens = creerService(Role.Coach).liens();

    expect(liens).toEqual([
      {
        label: 'Administration',
        children: [
          { label: 'Comptes', routerLink: '/comptes' },
          { label: 'Organisation', routerLink: '/organisation' },
          { label: 'Modèles de session', routerLink: '/modeles-session' },
        ],
      },
      { label: 'Sessions', routerLink: '/sessions' },
      { label: 'Profil d’équipe', routerLink: '/profil' },
    ]);
  });

  it('une Direction (aucune capacité encore accordée) voit un menu vide', () => {
    expect(creerService(Role.Direction).liens()).toEqual([]);
  });

  it('un Membre d’équipe (aucune capacité encore accordée) voit un menu vide', () => {
    expect(creerService(Role.Membre).liens()).toEqual([]);
  });
});
