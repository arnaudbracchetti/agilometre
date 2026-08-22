import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component, DestroyRef, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { sonder } from './sondage-2s';

@Component({ selector: 'app-hote-test', template: '' })
class ComposantHote {
  readonly destroyRef = inject(DestroyRef);
}

describe('sonder', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('appelle immédiatement puis toutes les 2 secondes', () => {
    const fixture = TestBed.createComponent(ComposantHote);
    const appel = vi.fn<() => Observable<number>>(() => of(1));
    vi.useFakeTimers();

    const valeurs: number[] = [];
    sonder(appel, () => undefined, fixture.componentInstance.destroyRef).subscribe((v) =>
      valeurs.push(v),
    );

    expect(appel).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(appel).toHaveBeenCalledTimes(2);
    expect(valeurs).toEqual([1, 1]);
  });

  it('appelle onErreur et continue de sonder après un échec', () => {
    const fixture = TestBed.createComponent(ComposantHote);
    let echec = true;
    const appel = () => (echec ? throwError(() => new Error('ko')) : of(42));
    const onErreur = vi.fn();
    vi.useFakeTimers();

    const valeurs: number[] = [];
    sonder(appel, onErreur, fixture.componentInstance.destroyRef).subscribe((v) => valeurs.push(v));

    expect(onErreur).toHaveBeenCalledTimes(1);
    echec = false;
    vi.advanceTimersByTime(2000);

    expect(valeurs).toEqual([42]);
  });

  it('transmet l’erreur d’origine à onErreur', () => {
    const fixture = TestBed.createComponent(ComposantHote);
    const echec = new Error('ko');
    const appel = () => throwError(() => echec);
    const onErreur = vi.fn();
    vi.useFakeTimers();

    sonder(appel, onErreur, fixture.componentInstance.destroyRef).subscribe();

    expect(onErreur).toHaveBeenCalledWith(echec, 1);
  });

  it('incrémente le compte d’échecs consécutifs à chaque échec, et le remet à zéro au succès suivant', () => {
    const fixture = TestBed.createComponent(ComposantHote);
    let echec = true;
    const appel = () => (echec ? throwError(() => new Error('ko')) : of(42));
    const onErreur = vi.fn();
    vi.useFakeTimers();

    sonder(appel, onErreur, fixture.componentInstance.destroyRef).subscribe();
    expect(onErreur).toHaveBeenNthCalledWith(1, expect.any(Error), 1);

    vi.advanceTimersByTime(2000);
    expect(onErreur).toHaveBeenNthCalledWith(2, expect.any(Error), 2);

    vi.advanceTimersByTime(2000);
    expect(onErreur).toHaveBeenNthCalledWith(3, expect.any(Error), 3);

    echec = false;
    vi.advanceTimersByTime(2000); // succès : remet le compteur à zéro
    echec = true;
    vi.advanceTimersByTime(2000);
    expect(onErreur).toHaveBeenNthCalledWith(4, expect.any(Error), 1);
  });

  it('arrête le sondage à la destruction du composant', () => {
    const fixture = TestBed.createComponent(ComposantHote);
    const appel = vi.fn<() => Observable<number>>(() => of(1));
    vi.useFakeTimers();

    sonder(appel, () => undefined, fixture.componentInstance.destroyRef).subscribe();
    expect(appel).toHaveBeenCalledTimes(1);

    fixture.destroy();
    vi.advanceTimersByTime(4000);

    expect(appel).toHaveBeenCalledTimes(1);
  });
});
