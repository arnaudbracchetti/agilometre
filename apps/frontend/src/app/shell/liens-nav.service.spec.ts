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

  it('un Coach voit Administration (avec ses trois sous-entrées), Sessions, Collecte de pouls et Profil', () => {
    const liens = creerService(Role.Coach).liens();

    expect(liens).toEqual([
      {
        label: 'Administration',
        children: [
          { label: 'Comptes', routerLink: '/comptes' },
          { label: 'Organisation', routerLink: '/organisation' },
          { label: 'Modèles de collecte', routerLink: '/modeles-collecte' },
        ],
      },
      { label: 'Sessions', routerLink: '/sessions' },
      { label: 'Collecte de pouls', routerLink: '/collecte' },
      { label: 'Profil', routerLink: '/profil' },
    ]);
  });

  it('une Direction voit Profil (accès à ses Entités habilitées, #61), rien d’autre', () => {
    expect(creerService(Role.Direction).liens()).toEqual([
      { label: 'Profil', routerLink: '/profil' },
    ]);
  });

  it('un Membre d’équipe voit Profil (accès à ses Équipes en tant que Membre, #62), rien d’autre', () => {
    expect(creerService(Role.Membre).liens()).toEqual([
      { label: 'Profil', routerLink: '/profil' },
    ]);
  });
});
