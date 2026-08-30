import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Protège `AppShell` et tous ses enfants — voir app.routes.ts. Porte l'URL demandée en query
 * param `retour`, que `LoginPage` réutilise pour renvoyer l'utilisateur là où il allait plutôt
 * qu'à l'accueil après connexion.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (
    auth.estConnecte() ||
    router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } })
  );
};
