import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
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
  let activatedRoute: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };
  let routerNavigate: ReturnType<typeof vi.fn>;

  /** Par défaut aucun Code en query param — à écraser avant `TestBed.createComponent` pour les
   * tests de jointure via l'URL (QR). */
  function definirCodeUrl(code?: string): void {
    activatedRoute.snapshot.queryParamMap = convertToParamMap(code ? { code } : {});
  }

  beforeEach(async () => {
    localStorage.clear();
    activatedRoute = { snapshot: { queryParamMap: convertToParamMap({}) } };
    routerNavigate = vi.fn();
    await TestBed.configureTestingModule({
      imports: [VotePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
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

  it('le menu d’assistance est absent en phase de saisie (aucun Jeton connu)', () => {
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-aide-menu button')).toBeFalsy();
  });

  it('le menu d’assistance apparaît dès qu’un Jeton est connu (phase d’attente)', () => {
    TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-aide-menu button')).toBeTruthy();
  });

  it('se déconnecter depuis le menu d’assistance efface le Jeton en storage et repasse en saisie', () => {
    TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
    fixture = TestBed.createComponent(VotePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    fixture.detectChanges();

    fixture.componentInstance['seDeconnecter']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
    expect(TestBed.inject(JetonParticipantStorage).obtenir()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-aide-menu button')).toBeFalsy();
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

    it('un vote tenté hors ligne (aucune réponse réseau) affiche une erreur explicite et annule la sélection optimiste (carte H2, #49)', () => {
      chargerEnAttente();
      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush({
        voteOuvert: true,
        question: QUESTION_COURANTE,
        optionChoisieIndex: null,
      });
      fixture.detectChanges();
      const messageService = TestBed.inject(NzMessageService);
      const errorSpy = vi.spyOn(messageService, 'error');

      const boutonsOption = Array.from(
        fixture.nativeElement.querySelectorAll('.vote__option'),
      ) as HTMLButtonElement[];
      boutonsOption[1].click();
      fixture.detectChanges();
      expect(boutonsOption[1].classList).toContain('vote__option--choisi');

      httpMock
        .expectOne('/api/participant/voter')
        .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
      fixture.detectChanges();

      expect(errorSpy).toHaveBeenCalledWith(
        'Vote impossible — vérifiez votre connexion et réessayez.',
      );
      expect(boutonsOption[1].classList).not.toContain('vote__option--choisi');
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

  describe('carte G2 — le Membre reconnecté après clôture (#47)', () => {
    it('un 401 du sondage /api/participant/moi repasse en saisie du Code, storage vidé, avec un message clair', () => {
      vi.useFakeTimers();
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock
        .expectOne('/api/participant/moi')
        .flush('Jeton invalide', { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Séance terminée ou expirée');
      expect(TestBed.inject(JetonParticipantStorage).obtenir()).toBeNull();

      // Le sondage est bien coupé — plus aucune requête, même après avance du temps.
      vi.advanceTimersByTime(2000);
      httpMock.expectNone('/api/participant/moi');
    });

    it('une erreur réseau (non 401) isolée du sondage /api/participant/moi ne change pas de phase et n’affiche pas encore le bandeau (non-régression)', () => {
      vi.useFakeTimers();
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock
        .expectOne('/api/participant/moi')
        .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#code')).toBeFalsy();
      expect(fixture.nativeElement.textContent).not.toContain('Connexion perdue');
      expect(TestBed.inject(JetonParticipantStorage).obtenir()).not.toBeNull();

      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
    });

    it('affiche le bandeau « connexion perdue » seulement après plusieurs échecs consécutifs du sondage, et le masque au succès suivant', () => {
      vi.useFakeTimers();
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();

      httpMock
        .expectOne('/api/participant/moi')
        .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Connexion perdue');

      vi.advanceTimersByTime(1000);
      httpMock
        .expectOne('/api/participant/moi')
        .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Connexion perdue');

      vi.advanceTimersByTime(1000);
      httpMock
        .expectOne('/api/participant/moi')
        .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Connexion perdue');

      vi.advanceTimersByTime(1000);
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Connexion perdue');
    });

    it('un 401 sur POST /api/participant/voter repasse en saisie du Code avec un message clair', () => {
      vi.useFakeTimers();
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush({
        voteOuvert: true,
        question: QUESTION_COURANTE,
        optionChoisieIndex: null,
      });
      fixture.detectChanges();

      boutonParTexte('Jamais')?.click();
      httpMock
        .expectOne('/api/participant/voter')
        .flush('Jeton invalide', { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Séance terminée ou expirée');
      expect(TestBed.inject(JetonParticipantStorage).obtenir()).toBeNull();
    });

    it('un rejet remonté par le menu d’assistance (info-session en 401) repasse aussi en saisie avec le message', () => {
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      fixture.detectChanges();

      fixture.debugElement.query(By.css('app-aide-menu')).triggerEventHandler(
        'sessionRejetee',
        undefined,
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Séance terminée ou expirée');
      expect(TestBed.inject(JetonParticipantStorage).obtenir()).toBeNull();
    });
  });

  describe('jointure via un Code dans l’URL (scan du QR — grilling du 2026-09-12)', () => {
    it('sans Jeton actif, la jointure part automatiquement, sans clic', () => {
      definirCodeUrl('4271');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/participant/rejoindre');
      expect(req.request.body).toEqual({ code: '4271', jetonPrecedent: undefined });
      req.flush({ sessionId: 's1', jeton: 'jeton-abc' });
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('anime la discussion');
      expect(routerNavigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true,
      });
    });

    it('un Code invalide dans l’URL en jointure automatique retombe sur l’écran de saisie avec le message habituel', () => {
      definirCodeUrl('0000');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();

      httpMock
        .expectOne('/api/participant/rejoindre')
        .flush('Introuvable', { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#code')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('invalide ou expiré');
    });

    it('avec un Jeton déjà actif, un Code dans l’URL propose une confirmation (Aperçu de Session) plutôt qu’une bascule automatique', () => {
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      definirCodeUrl('9999');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);

      const modal = fixture.debugElement.injector.get(NzModalService);
      const confirmSpy = vi.spyOn(modal, 'confirm');

      httpMock
        .expectOne('/api/participant/info-session')
        .flush({ equipeNom: 'Les Mangoustes', ouvertureLe: null });
      httpMock
        .expectOne('/api/participant/apercu-session?code=9999')
        .flush({ equipeNom: 'Les Piranhas', ouvertureLe: null });
      fixture.detectChanges();

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      const contenu = confirmSpy.mock.calls[0]?.[0]?.nzContent as string;
      expect(contenu).toContain('Les Mangoustes');
      expect(contenu).toContain('Les Piranhas');
      httpMock.expectNone('/api/participant/rejoindre');
    });

    it('confirmer la bascule rejoint la nouvelle Session en transmettant le Jeton précédent', () => {
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      definirCodeUrl('9999');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      const modal = fixture.debugElement.injector.get(NzModalService);
      const confirmSpy = vi.spyOn(modal, 'confirm');
      httpMock
        .expectOne('/api/participant/info-session')
        .flush({ equipeNom: 'Les Mangoustes', ouvertureLe: null });
      httpMock
        .expectOne('/api/participant/apercu-session?code=9999')
        .flush({ equipeNom: 'Les Piranhas', ouvertureLe: null });
      fixture.detectChanges();

      const config = confirmSpy.mock.calls[0]?.[0];
      (config?.nzOnOk as (() => void) | undefined)?.();

      const req = httpMock.expectOne('/api/participant/rejoindre');
      expect(req.request.body).toEqual({ code: '9999', jetonPrecedent: 'jeton-existant' });
      req.flush({ sessionId: 's2', jeton: 'jeton-nouveau' });
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);

      expect(TestBed.inject(JetonParticipantStorage).obtenir()).toEqual({
        sessionId: 's2',
        jeton: 'jeton-nouveau',
      });
      expect(routerNavigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true,
      });
    });

    it('annuler la bascule laisse la Session actuelle intacte et nettoie l’URL', () => {
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      definirCodeUrl('9999');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      const modal = fixture.debugElement.injector.get(NzModalService);
      const confirmSpy = vi.spyOn(modal, 'confirm');
      httpMock
        .expectOne('/api/participant/info-session')
        .flush({ equipeNom: 'Les Mangoustes', ouvertureLe: null });
      httpMock
        .expectOne('/api/participant/apercu-session?code=9999')
        .flush({ equipeNom: 'Les Piranhas', ouvertureLe: null });
      fixture.detectChanges();

      const config = confirmSpy.mock.calls[0]?.[0];
      (config?.nzOnCancel as (() => void) | undefined)?.();

      httpMock.expectNone('/api/participant/rejoindre');
      expect(TestBed.inject(JetonParticipantStorage).obtenir()).toEqual({
        sessionId: 's1',
        jeton: 'jeton-existant',
      });
      expect(routerNavigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true,
      });
    });

    it('un Jeton actuel déjà rejeté (401) bascule directement sur le Code de l’URL, sans confirmation', () => {
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      definirCodeUrl('9999');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      const modal = fixture.debugElement.injector.get(NzModalService);
      const confirmSpy = vi.spyOn(modal, 'confirm');
      // La requête apercu-session, toujours en attente, est annulée par forkJoin dès que
      // info-session échoue — pas de flush dessus, `httpMock.verify()` ignore les requêtes
      // annulées.
      httpMock.expectOne('/api/participant/apercu-session?code=9999');
      httpMock
        .expectOne('/api/participant/info-session')
        .flush('Jeton invalide', { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();

      expect(confirmSpy).not.toHaveBeenCalled();
      const req = httpMock.expectOne('/api/participant/rejoindre');
      expect(req.request.body).toEqual({ code: '9999', jetonPrecedent: undefined });
      req.flush({ sessionId: 's2', jeton: 'jeton-nouveau' });
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);

      expect(TestBed.inject(JetonParticipantStorage).obtenir()).toEqual({
        sessionId: 's2',
        jeton: 'jeton-nouveau',
      });
    });

    it('un Code invalide dans l’URL alors qu’une Session est déjà active reste silencieux (aucune confirmation, aucune erreur)', () => {
      TestBed.inject(JetonParticipantStorage).enregistrer('s1', 'jeton-existant');
      definirCodeUrl('0000');
      fixture = TestBed.createComponent(VotePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/participant/moi').flush(HORS_VOTE);
      const modal = fixture.debugElement.injector.get(NzModalService);
      const confirmSpy = vi.spyOn(modal, 'confirm');
      httpMock
        .expectOne('/api/participant/info-session')
        .flush({ equipeNom: 'Les Mangoustes', ouvertureLe: null });
      httpMock
        .expectOne('/api/participant/apercu-session?code=0000')
        .flush('Introuvable', { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('anime la discussion');
      expect(fixture.nativeElement.textContent).not.toContain('invalide ou expiré');
      httpMock.expectNone('/api/participant/rejoindre');
      expect(routerNavigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true,
      });
    });
  });
});
