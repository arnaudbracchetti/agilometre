import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { JetonParticipantStorage } from '../jeton-participant.storage';
import { VotePage } from './vote-page';

describe('VotePage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<VotePage>>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [VotePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * NgModel.viewToModelUpdate + triggerEventHandler('submit', …) plutôt que dispatchEvent natif :
   * même contournement documenté dans organisation-page.spec.ts (les événements DOM synthétiques
   * n'atteignent pas les listeners compilés dans ce projet).
   */
  function saisirEtSoumettre(code: string): void {
    fixture.debugElement.query(By.css('#code')).injector.get(NgModel).viewToModelUpdate(code);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
  }

  it('démarre en phase de saisie du Code quand aucun Jeton n’est stocké', () => {
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('bientôt commencer');
  });

  it('démarre directement en attente si un Jeton est déjà en storage', () => {
    TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');

    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('bientôt commencer');
    expect(fixture.nativeElement.querySelector('#code')).toBeFalsy();
    httpMock.expectNone('/api/participant/rejoindre');
  });

  it('un Code valide stocke le Jeton et bascule sur l’écran d’attente', () => {
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    saisirEtSoumettre('4271');
    httpMock
      .expectOne('/api/participant/rejoindre')
      .flush({ sessionId: 's1', jeton: 'jeton-abc' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('bientôt commencer');
    expect(TestBed.inject(JetonParticipantStorage).obtenir()).toEqual({
      sessionId: 's1',
      jeton: 'jeton-abc',
    });
  });

  it('un Code invalide affiche une erreur inline sans changer d’écran', () => {
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    saisirEtSoumettre('0000');
    httpMock
      .expectOne('/api/participant/rejoindre')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('invalide ou expiré');
    expect(TestBed.inject(JetonParticipantStorage).obtenir()).toBeNull();
  });

  it('« Rejoindre une autre séance » depuis l’attente repasse en saisie du Code sans effacer l’ancien Jeton', () => {
    TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    const bouton = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.includes('Rejoindre une autre séance')) as
      | HTMLButtonElement
      | undefined;
    bouton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
    // Remplacé seulement par un nouveau join réussi (enregistrer()), jamais préemptivement.
    expect(TestBed.inject(JetonParticipantStorage).obtenir()).toEqual({
      sessionId: 's1',
      jeton: 'jeton-existant',
    });
  });
});
