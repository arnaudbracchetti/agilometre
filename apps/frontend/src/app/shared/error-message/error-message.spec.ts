import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ErrorMessage, TailleMessageErreur } from './error-message';

@Component({
  imports: [ErrorMessage],
  template: `<app-error-message [message]="message" [taille]="taille" />`,
})
class HoteDeTest {
  message = 'Code de session invalide ou expiré.';
  taille: TailleMessageErreur = 'inline';
}

describe('ErrorMessage', () => {
  function creer() {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.detectChanges();
    return fixture;
  }

  it('affiche le message fourni', () => {
    const fixture = creer();
    expect(fixture.nativeElement.textContent).toContain('Code de session invalide ou expiré.');
  });

  it('porte le rôle "alert" pour une annonce assertive aux lecteurs d’écran', () => {
    const fixture = creer();
    const hote = fixture.debugElement.query(By.directive(ErrorMessage)).nativeElement as HTMLElement;
    expect(hote.getAttribute('role')).toBe('alert');
  });

  it('reste en taille "inline" par défaut, sans classe --page', () => {
    const fixture = creer();
    const hote = fixture.debugElement.query(By.directive(ErrorMessage)).nativeElement as HTMLElement;
    expect(hote.classList).not.toContain('error-message--page');
  });

  it('applique la classe --page quand taille="page"', () => {
    const fixture = TestBed.createComponent(HoteDeTest);
    fixture.componentInstance.taille = 'page';
    fixture.detectChanges();
    const hote = fixture.debugElement.query(By.directive(ErrorMessage)).nativeElement as HTMLElement;
    expect(hote.classList).toContain('error-message--page');
  });
});
