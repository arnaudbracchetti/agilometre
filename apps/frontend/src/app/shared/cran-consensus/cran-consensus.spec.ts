import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CranConsensusDto } from '@agilometre/shared';
import { CranConsensus } from './cran-consensus';

@Component({
  imports: [CranConsensus],
  template: `<app-cran-consensus [consensus]="consensus" />`,
})
class HoteDeTest {
  consensus: CranConsensusDto | null = 'FORT';
}

describe('CranConsensus', () => {
  function creer(consensus: CranConsensusDto | null) {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.consensus = consensus;
    fixture.detectChanges();
    return fixture;
  }

  it('affiche le libellé "Consensus fort" avec la classe de cran correspondante', () => {
    const fixture = creer('FORT');
    const pastille = fixture.nativeElement.querySelector('.cran-consensus__pastille') as HTMLElement;
    expect(pastille.textContent?.trim()).toBe('Consensus fort');
    expect(pastille.classList).toContain('cran-consensus--fort');
  });

  it('affiche le libellé "Consensus modéré" avec la classe de cran correspondante', () => {
    const fixture = creer('MODERE');
    const pastille = fixture.nativeElement.querySelector('.cran-consensus__pastille') as HTMLElement;
    expect(pastille.textContent?.trim()).toBe('Consensus modéré');
    expect(pastille.classList).toContain('cran-consensus--modere');
  });

  it('affiche le libellé "Consensus faible" avec la classe de cran correspondante', () => {
    const fixture = creer('FAIBLE');
    const pastille = fixture.nativeElement.querySelector('.cran-consensus__pastille') as HTMLElement;
    expect(pastille.textContent?.trim()).toBe('Consensus faible');
    expect(pastille.classList).toContain('cran-consensus--faible');
  });

  it('dessine 3 points dont l’écartement encode la dispersion, jamais la seule couleur', () => {
    const fort = creer('FORT').nativeElement.querySelectorAll('.cran-consensus__point');
    const faible = creer('FAIBLE').nativeElement.querySelectorAll('.cran-consensus__point');
    expect(fort.length).toBe(3);
    const ecartFort = Number(fort[2].getAttribute('cx')) - Number(fort[0].getAttribute('cx'));
    const ecartFaible = Number(faible[2].getAttribute('cx')) - Number(faible[0].getAttribute('cx'));
    expect(ecartFaible).toBeGreaterThan(ecartFort);
  });

  it('ne rend rien quand consensus est null', () => {
    const fixture = creer(null);
    expect(fixture.nativeElement.querySelector('.cran-consensus__pastille')).toBeNull();
  });
});
