import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, interval } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';

const INTERVALLE_SONDAGE_MS = 2000;

/**
 * Sondage HTTP (PRD §10, doc/spec/annexes/deroulement-session-animee.md « Synchronisation des
 * écrans ») : ré-appelle `appel` toutes les `intervalleMs` (2s par défaut, premier appel
 * immédiat), s'arrête proprement à la destruction du composant, et bascule sur `onErreur` sans
 * jamais faire planter le flux (le sondage suivant repart normalement). L'écran participant
 * sonde à 1s — rythme volontairement plus rapide (« Synchronisation des écrans »).
 */
export function sonder<T>(
  appel: () => Observable<T>,
  onErreur: (erreur: unknown) => void,
  destroyRef: DestroyRef,
  intervalleMs = INTERVALLE_SONDAGE_MS,
): Observable<T> {
  return interval(intervalleMs).pipe(
    startWith(0),
    switchMap(() =>
      appel().pipe(
        catchError((erreur: unknown) => {
          onErreur(erreur);
          return EMPTY;
        }),
      ),
    ),
    takeUntilDestroyed(destroyRef),
  );
}
