import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MoyenneGraduee } from './moyenne-graduee';

@Component({
  imports: [MoyenneGraduee],
  template: `<app-moyenne-graduee [moyenne]="moyenne" />`,
})
class HoteDeTest {
  moyenne: number | null = 2.5;
}

describe('MoyenneGraduee', () => {
  function creer(moyenne: number | null) {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.moyenne = moyenne;
    fixture.detectChanges();
    return fixture;
  }

  it('positionne le marqueur à 0 % pour la moyenne minimale (1)', () => {
    const fixture = creer(1);
    const marqueur = fixture.nativeElement.querySelector('.moyenne-graduee__marqueur') as HTMLElement;
    expect(marqueur.style.left).toBe('0%');
  });

  it('positionne le marqueur à 100 % pour la moyenne maximale (4)', () => {
    const fixture = creer(4);
    const marqueur = fixture.nativeElement.querySelector('.moyenne-graduee__marqueur') as HTMLElement;
    expect(marqueur.style.left).toBe('100%');
  });

  it('positionne le marqueur à mi-chemin pour une moyenne de 2.5', () => {
    const fixture = creer(2.5);
    const marqueur = fixture.nativeElement.querySelector('.moyenne-graduee__marqueur') as HTMLElement;
    expect(marqueur.style.left).toBe('50%');
  });

  it('affiche la valeur arrondie à 1 décimale, en mono', () => {
    const fixture = creer(2.357142857142857);
    const valeur = fixture.nativeElement.querySelector('.moyenne-graduee__valeur') as HTMLElement;
    expect(valeur.textContent?.trim()).toBe('2.4');
  });

  it('affiche 4 graduations', () => {
    const fixture = creer(2.5);
    expect(fixture.nativeElement.querySelectorAll('.moyenne-graduee__graduation').length).toBe(4);
  });

  it("ne rend rien quand la moyenne est null (Question sans Réponse)", () => {
    const fixture = creer(null);
    expect(fixture.nativeElement.querySelector('.moyenne-graduee__piste')).toBeNull();
    expect(fixture.nativeElement.querySelector('.moyenne-graduee__valeur')).toBeNull();
  });
});
