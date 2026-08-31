import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Capacite } from '@agilometre/shared';
import { DroitsService } from './droits.service';

/**
 * Ferme une route à qui n'a pas la capacité donnée — même mécanique que `authGuard` (jamais une
 * resaisie de rôles en clair sur la route, `DroitsService` reste l'unique source de vérité, voir
 * docs/design/agregat-politique-des-droits.md §2). Renvoie à l'accueil plutôt qu'à `/connexion` :
 * contrairement à `authGuard`, l'utilisateur est déjà connecté, seule son capacité est en cause.
 */
export const droitGuard = (capacite: Capacite): CanActivateFn => {
  return () => {
    const droits = inject(DroitsService);
    const router = inject(Router);
    return droits.peut(capacite) || router.createUrlTree(['/']);
  };
};
