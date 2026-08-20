import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { JetonParticipantStorage } from '../jeton-participant.storage';
import { VotePage } from './vote-page';

const HORS_VOTE = { voteOuvert: false, question: null, optionChoisieIndex: null };

const QUESTION_COURANTE = {
  questionId: 'q1',
  libelle: 'Les rétrospectives sont-elles régulières ?',
  options: [
    { libelle: 'Jamais' },
    { libelle: 'Parfois' },
    { libelle: 'Souvent' },
    { libelle: 'Toujours' },
  ],
};

describe('VotePage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<VotePage>>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [VotePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
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

  function boutonParTexte(texte: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes(texte),
    ) as HTMLButtonElement | undefined;
  }

  it('démarre en phase de saisie du Code quand aucun Jeton n’est stocké', () => {
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('bientôt commencer');
    httpMock.expectNone('/api/participant/moi');
  });

  it('démarre directement en attente si un Jeton est déjà en storage et sonde /api/participant/moi', () => {
    TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');

    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('anime la discussion');
    expect(fixture.nativeElement.querySelector('#code')).toBeFalsy();
    httpMock.expectNone('/api/participant/rejoindre');
  });

  it('un Code valide stocke le Jeton, bascule sur l’écran d’attente et démarre le sondage', () => {
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    saisirEtSoumettre('4271');
    httpMock
      .expectOne('/api/participant/rejoindre')
      .flush({ sessionId: 's1', jeton: 'jeton-abc' });
    fixture.detectChanges();
    httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('anime la discussion');
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

  it('« Rejoindre une autre séance » depuis l’attente repasse en saisie du Code sans effacer l’ancien Jeton, et coupe le sondage', () => {
    TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    fixture.detectChanges();

    boutonParTexte('Rejoindre une autre séance')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
    // Remplacé seulement par un nouveau join réussi (enregistrer()), jamais préemptivement.
    expect(TestBed.inject(JetonParticipantStorage).obtenir()).toEqual({
      sessionId: 's1',
      jeton: 'jeton-existant',
    });
    // Le sondage de l'ancien Jeton est coupé : rien ne doit plus faire de requête en arrière-plan.
    httpMock.expectNone('/api/participant/moi');
  });

  it('« Rejoindre une autre séance » transmet le Jeton quitté pour sortir ce device du compteur d’origine', () => {
    TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    fixture.detectChanges();
    boutonParTexte('Rejoindre une autre séance')?.click();
    fixture.detectChanges();

    saisirEtSoumettre('9999');

    const req = httpMock.expectOne('/api/participant/rejoindre');
    expect(req.request.body).toEqual({ code: '9999', jetonPrecedent: 'jeton-existant' });
    req.flush({ sessionId: 's2', jeton: 'jeton-nouveau' });
    fixture.detectChanges();
    httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
  });

  describe('phase de vote (carte D2)', () => {
    /** `vi.useFakeTimers()` doit précéder la création du composant : l'`interval()` RxJS du
     * sondage se lie au scheduler actif au moment du subscribe (ngOnInit), pas à celui en
     * vigueur lors d'un `advanceTimersByTime` ultérieur. */
    function chargerEnAttente(): void {
      vi.useFakeTimers();
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      fixture.detectChanges();
    }

    it('affiche les 4 Options lettrées dès que le sondage indique voteOuvert=true', () => {
      chargerEnAttente();

      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush({
        voteOuvert: true,
        question: QUESTION_COURANTE,
        optionChoisieIndex: null,
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Les rétrospectives sont-elles régulières ?');
      expect(texte).toContain('Jamais');
      const boutonsOption = fixture.nativeElement.querySelectorAll('.vote__option');
      expect(boutonsOption.length).toBe(4);
    });

    it('sonde toutes les 1 seconde (rythme participant, plus rapide que Coach)', () => {
      chargerEnAttente();

      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);

      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    });

    it('voter met en évidence l’Option choisie et envoie POST /api/participant/voter avec le Jeton', () => {
      chargerEnAttente();
      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush({
        voteOuvert: true,
        question: QUESTION_COURANTE,
        optionChoisieIndex: null,
      });
      fixture.detectChanges();

      const boutonsOption = Array.from(
        fixture.nativeElement.querySelectorAll('.vote__option'),
      ) as HTMLButtonElement[];
      boutonsOption[1].click();
      fixture.detectChanges();

      expect(boutonsOption[1].classList).toContain('vote__option--choisi');
      expect(fixture.nativeElement.textContent).toContain('Vote pris en compte');

      const req = httpMock.expectOne('/api/participant/voter');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-existant');
      expect(req.request.body).toEqual({ optionIndex: 1 });
      req.flush({ voteOuvert: true, question: QUESTION_COURANTE, optionChoisieIndex: 1 });
    });

    it('un revote remplace immédiatement l’Option choisie', () => {
      chargerEnAttente();
      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush({
        voteOuvert: true,
        question: QUESTION_COURANTE,
        optionChoisieIndex: 0,
      });
      fixture.detectChanges();

      const boutonsOption = Array.from(
        fixture.nativeElement.querySelectorAll('.vote__option'),
      ) as HTMLButtonElement[];
      expect(boutonsOption[0].classList).toContain('vote__option--choisi');

      boutonsOption[3].click();
      fixture.detectChanges();
      httpMock
        .expectOne('/api/participant/voter')
        .flush({ voteOuvert: true, question: QUESTION_COURANTE, optionChoisieIndex: 3 });
      fixture.detectChanges();

      expect(boutonsOption[3].classList).toContain('vote__option--choisi');
      expect(boutonsOption[0].classList).not.toContain('vote__option--choisi');
    });

    it('revient sur l’écran d’attente et affiche « Vote enregistré » une fois le Tour clos si le participant avait voté, sans jamais afficher de répartition', () => {
      chargerEnAttente();
      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush({
        voteOuvert: true,
        question: QUESTION_COURANTE,
        optionChoisieIndex: 1,
      });
      fixture.detectChanges();

      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.vote__option').length).toBe(0);
      expect(fixture.nativeElement.textContent).toContain('Vote enregistré');
    });

    it('affiche « Le coach anime la discussion » en attente si le Tour clos n’avait pas reçu de vote de ce participant', () => {
      chargerEnAttente();
      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush({
        voteOuvert: true,
        question: QUESTION_COURANTE,
        optionChoisieIndex: null,
      });
      fixture.detectChanges();

      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('anime la discussion');
      expect(fixture.nativeElement.textContent).not.toContain('Vote enregistré');
    });
  });
});
