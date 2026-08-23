import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogActions } from './dialog-actions';

@Component({
  imports: [DialogActions],
  template: `
    <app-dialog-actions
      [libelleAction]="libelleAction"
      [typeAction]="typeAction"
      [actionEnCours]="actionEnCours"
      [actionDesactivee]="actionDesactivee"
      [actionDangereuse]="actionDangereuse"
      (annuler)="annulerAppele = true"
      (action)="actionAppelee = true"
    />
  `,
})
class HoteDeTest {
  libelleAction = 'Créer';
  typeAction: 'submit' | 'button' = 'submit';
  actionEnCours = false;
  actionDesactivee = false;
  actionDangereuse = false;
  annulerAppele = false;
  actionAppelee = false;
}

describe('DialogActions', () => {
  function creer() {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.detectChanges();
    return fixture;
  }

  function boutons(fixture: ReturnType<typeof creer>): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
  });

  it('affiche Annuler puis le libellé d’action, dans cet ordre', () => {
    const fixture = creer();

    const textes = boutons(fixture).map((b) => b.textContent?.trim());
    expect(textes).toEqual(['Annuler', 'Créer']);
  });

  it('le bouton Annuler est de type "button" — ne doit jamais soumettre un <form> englobant', () => {
    const fixture = creer();

    expect(boutons(fixture)[0].type).toBe('button');
  });

  it('le bouton Action est de type "submit" par défaut, pour participer au (ngSubmit) du formulaire', () => {
    const fixture = creer();

    expect(boutons(fixture)[1].type).toBe('submit');
  });

  it('typeAction="button" bascule le bouton Action en type "button"', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.typeAction = 'button';
    fixture.detectChanges();

    expect(boutons(fixture)[1].type).toBe('button');
  });

  it('émet (annuler) au clic sur Annuler', () => {
    const fixture = creer();

    boutons(fixture)[0].click();

    expect(fixture.componentInstance.annulerAppele).toBe(true);
  });

  it('émet (action) au clic sur le bouton Action', () => {
    const fixture = creer();

    boutons(fixture)[1].click();

    expect(fixture.componentInstance.actionAppelee).toBe(true);
  });

  it('désactive le bouton Action quand actionDesactivee est vrai', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.actionDesactivee = true;
    fixture.detectChanges();

    expect(boutons(fixture)[1].disabled).toBe(true);
  });

  it('applique nzDanger au bouton Action quand actionDangereuse est vrai', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.actionDangereuse = true;
    fixture.detectChanges();

    expect(boutons(fixture)[1].classList).toContain('ant-btn-dangerous');
  });

  it('le composant hôte porte la classe "dialog-actions"', () => {
    const fixture = creer();
    const hote = fixture.debugElement.query(By.directive(DialogActions)).nativeElement as HTMLElement;

    expect(hote.classList).toContain('dialog-actions');
  });
});
