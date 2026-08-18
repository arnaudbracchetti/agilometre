import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, interval } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';

const INTERVALLE_SONDAGE_MS = 2000;

/**
 * Sondage HTTP 2s (PRD §10, doc/spec/annexes/deroulement-session-animee.md « Synchronisation des
 * écrans ») : ré-appelle `appel` toutes les 2s (premier appel immédiat), s'arrête proprement à la
 * destruction du composant, et bascule sur `onErreur` sans jamais faire planter le flux (le
 * sondage suivant repart normalement).
 */
export function sonder<T>(
  appel: () => Observable<T>,
  onErreur: () => void,
  destroyRef: DestroyRef,
): Observable<T> {
  return interval(INTERVALLE_SONDAGE_MS).pipe(
    startWith(0),
    switchMap(() =>
      appel().pipe(
        catchError(() => {
          onErreur();
          return EMPTY;
        }),
      ),
    ),
    takeUntilDestroyed(destroyRef),
  );
}
