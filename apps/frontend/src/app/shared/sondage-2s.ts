import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, interval } from 'rxjs';
import { catchError, startWith, switchMap, tap } from 'rxjs/operators';

const INTERVALLE_SONDAGE_MS = 2000;

/**
 * Nombre d'échecs consécutifs à partir duquel un écran doit afficher son bandeau discret
 * « connexion perdue » (carte H2, #49) — pas dès le premier échec, pour ne pas réagir à une
 * simple coupure d'une seconde (doc/spec/annexes/deroulement-session-animee.md, « Robustesse
 * côté client »).
 */
export const SEUIL_ECHECS_CONNEXION_PERDUE = 3;

/**
 * Sondage HTTP (PRD §10, doc/spec/annexes/deroulement-session-animee.md « Synchronisation des
 * écrans ») : ré-appelle `appel` toutes les `intervalleMs` (2s par défaut, premier appel
 * immédiat), s'arrête proprement à la destruction du composant, et bascule sur `onErreur` sans
 * jamais faire planter le flux (le sondage suivant repart normalement). L'écran participant
 * sonde à 1s — rythme volontairement plus rapide (« Synchronisation des écrans »). `onErreur`
 * reçoit aussi le nombre d'échecs consécutifs (remis à zéro à chaque succès) — à l'appelant de
 * décider, selon son propre statut HTTP, ce qui est définitif (ex. 401/404) et ce qui doit
 * attendre `SEUIL_ECHECS_CONNEXION_PERDUE` avant d'affecter l'écran.
 */
export function sonder<T>(
  appel: () => Observable<T>,
  onErreur: (erreur: unknown, echecsConsecutifs: number) => void,
  destroyRef: DestroyRef,
  intervalleMs = INTERVALLE_SONDAGE_MS,
): Observable<T> {
  let echecsConsecutifs = 0;
  return interval(intervalleMs).pipe(
    startWith(0),
    switchMap(() =>
      appel().pipe(
        tap(() => {
          echecsConsecutifs = 0;
        }),
        catchError((erreur: unknown) => {
          echecsConsecutifs += 1;
          onErreur(erreur, echecsConsecutifs);
          return EMPTY;
        }),
      ),
    ),
    takeUntilDestroyed(destroyRef),
  );
}
