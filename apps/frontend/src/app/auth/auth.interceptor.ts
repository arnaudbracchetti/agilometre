import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const EN_TETE_JETON_RENOUVELE = 'X-Auth-Token';

/**
 * Une requête qui porte déjà son propre `Authorization` (parcours participant/projection, jeton
 * de session — `ParticipantService.enteteAuth`) n'est jamais touchée : ce mécanisme est distinct
 * de celui du compte Coach/Direction/Membre et gère déjà ses propres 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const estLogin = req.url.endsWith('/api/auth/login');

  const jeton = auth.jetonActuel();
  const requete = jeton
    ? req.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } })
    : req;

  return next(requete).pipe(
    tap((evenement) => {
      if (evenement instanceof HttpResponse) {
        const jetonRenouvele = evenement.headers.get(EN_TETE_JETON_RENOUVELE);
        if (jetonRenouvele) {
          auth.mettreAJourJeton(jetonRenouvele);
        }
      }
    }),
    catchError((erreur: unknown) => {
      if (!estLogin && erreur instanceof HttpErrorResponse && erreur.status === 401) {
        auth.logout();
        router.navigateByUrl('/connexion');
      }
      return throwError(() => erreur);
    }),
  );
};
