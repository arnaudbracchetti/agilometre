import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { WarningOutline } from '@ant-design/icons-angular/icons';
import { PalierTheme } from './palier-theme';

@Component({
  imports: [PalierTheme],
  template: `
    <app-palier-theme
      [palier]="palier"
      [tauxApproche]="tauxApproche"
      [margeAvantDescente]="margeAvantDescente"
    />
  `,
})
class HoteDeTest {
  palier: 1 | 2 | 3 | 4 | null = 2;
  tauxApproche: number | null = null;
  margeAvantDescente: number | null = null;
}

describe('PalierTheme', () => {
  beforeEach(() => {
    // Sans ça, nz-icon tente de récupérer le SVG via HTTP (assets/outline/warning.svg) — même
    // pattern que pilotage-page.spec.ts.
    TestBed.configureTestingModule({ providers: [provideNzIcons([WarningOutline])] });
  });

  function creer() {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.detectChanges();
    return fixture;
  }

  it('affiche le numéro de Palier', () => {
    const fixture = creer();
    expect(fixture.nativeElement.textContent).toContain('Palier');
    expect(fixture.nativeElement.textContent).toContain('2');
  });

  it.each([1, 2, 3, 4] as const)(
    'applique la classe de rampe correspondant au Palier %i',
    (palier) => {
      const fixture = TestBed.createComponent(HoteDeTest);
      fixture.componentInstance.palier = palier;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.palier-theme__badge') as HTMLElement;
      expect(badge.classList).toContain(`palier-theme__badge--${palier}`);
    },
  );

  it('affiche "Aucune donnée" quand le Palier est null, sans jauge ni alerte', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.palier = null;
    fixture.componentInstance.tauxApproche = null;
    fixture.componentInstance.margeAvantDescente = null;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucune donnée');
    expect(fixture.nativeElement.querySelector('.palier-theme__jauge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.palier-theme__alerte')).toBeNull();
  });

  it('n’affiche pas de jauge quand tauxApproche est null (Palier 4, rien à approcher)', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.palier = 4;
    fixture.componentInstance.tauxApproche = null;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.palier-theme__jauge')).toBeNull();
  });

  it('affiche la jauge et le Palier suivant quand tauxApproche est fourni', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.palier = 2;
    fixture.componentInstance.tauxApproche = 0.941;
    fixture.detectChanges();

    const jauge = fixture.nativeElement.querySelector('.palier-theme__jauge') as HTMLElement;
    expect(jauge).not.toBeNull();
    expect(jauge.textContent).toContain('Palier 3');
    expect(jauge.textContent).toContain('94 %');
  });

  it('affiche une alerte (icône + texte, jamais lue par la seule couleur) sous 20 % de marge avant descente', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.palier = 2;
    fixture.componentInstance.margeAvantDescente = 0.138;
    fixture.detectChanges();

    const alerte = fixture.nativeElement.querySelector('.palier-theme__alerte') as HTMLElement;
    expect(alerte).not.toBeNull();
    expect(alerte.textContent).toContain('14 %');
  });

  it('n’affiche pas d’alerte à 20 % de marge ou plus', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.palier = 2;
    fixture.componentInstance.margeAvantDescente = 0.45;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.palier-theme__alerte')).toBeNull();
  });
});
