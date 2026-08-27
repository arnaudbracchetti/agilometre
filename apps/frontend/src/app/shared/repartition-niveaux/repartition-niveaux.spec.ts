import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RepartitionVotesDto } from '@agilometre/shared';
import { RepartitionNiveaux } from './repartition-niveaux';

@Component({
  imports: [RepartitionNiveaux],
  template: `<app-repartition-niveaux [repartition]="repartition" [effectif]="effectif" />`,
})
class HoteDeTest {
  repartition: RepartitionVotesDto = { 1: 2, 2: 3, 3: 4, 4: 1 };
  effectif = 10;
}

describe('RepartitionNiveaux', () => {
  function creer() {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.detectChanges();
    return fixture;
  }

  it('affiche les 4 Niveaux avec leur pourcentage arrondi', () => {
    const fixture = creer();
    const lignes = fixture.nativeElement.querySelectorAll('li');
    expect(lignes.length).toBe(4);
    expect(lignes[0].textContent).toContain('Niveau 1');
    expect(lignes[0].textContent).toContain('20 %');
    expect(lignes[2].textContent).toContain('Niveau 3');
    expect(lignes[2].textContent).toContain('40 %');
  });

  it('affiche 0 % sur un effectif nul, sans diviser par zéro', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.repartition = { 1: 0, 2: 0, 3: 0, 4: 0 };
    fixture.componentInstance.effectif = 0;
    fixture.detectChanges();

    const lignes = fixture.nativeElement.querySelectorAll('li');
    lignes.forEach((ligne: HTMLElement) => expect(ligne.textContent).toContain('0 %'));
  });

  it('dimensionne la barre proportionnellement au pourcentage', () => {
    const fixture = creer();
    const barre = fixture.nativeElement.querySelector('.repartition-niveaux__barre') as HTMLElement;
    expect(barre.style.transform).toBe('scaleX(0.2)');
  });
});
