import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StickyNote } from './sticky-note';

@Component({
  imports: [StickyNote],
  template: `<app-sticky-note [couleur]="couleur" [scotch]="scotch">contenu</app-sticky-note>`,
})
class HoteDeTest {
  couleur: 'blue' | 'violet' | 'magenta' = 'blue';
  scotch = true;
}

describe('StickyNote', () => {
  function creer() {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.detectChanges();
    return fixture;
  }

  function transformDeg(element: HTMLElement): number {
    const match = /rotate\(([-\d.]+)deg\)/.exec(element.style.transform);
    return match ? Number(match[1]) : NaN;
  }

  it('projette le contenu', () => {
    const fixture = creer();
    expect(fixture.nativeElement.textContent).toContain('contenu');
  });

  it('incline la note dans une amplitude mesurée (1° à 2.5°, signe aléatoire)', () => {
    // Beaucoup d'instances pour couvrir les deux signes malgré le tirage aléatoire.
    for (let i = 0; i < 30; i++) {
      const fixture = creer();
      const hote = fixture.debugElement.query(By.directive(StickyNote))
        .nativeElement as HTMLElement;
      const angle = transformDeg(hote);
      expect(Math.abs(angle)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(angle)).toBeLessThanOrEqual(2.5);
      fixture.destroy();
    }
  });

  it('affiche le ruban adhésif par défaut, positionné entre 30% et 70%', () => {
    const fixture = creer();
    const scotch = fixture.nativeElement.querySelector('.sticky-note__scotch') as HTMLElement;
    expect(scotch).toBeTruthy();
    const gauche = Number(scotch.style.left.replace('%', ''));
    expect(gauche).toBeGreaterThanOrEqual(30);
    expect(gauche).toBeLessThanOrEqual(70);
  });

  it('masque le ruban adhésif quand scotch est désactivé', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.scotch = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sticky-note__scotch')).toBeFalsy();
  });

  it('applique la classe de couleur correspondante, sans classe pour "blue" (couleur par défaut)', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.couleur = 'magenta';
    fixture.detectChanges();
    const hote = fixture.debugElement.query(By.directive(StickyNote)).nativeElement as HTMLElement;
    expect(hote.classList).toContain('sticky-note--magenta');
    expect(hote.classList).not.toContain('sticky-note--violet');
  });
});
