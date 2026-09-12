import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { convertToParamMap, provideRouter, ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  CaretRightFill,
  CheckCircleFill,
  ClockCircleOutline,
  DesktopOutline,
  LeftOutline,
  MinusCircleOutline,
  RightOutline,
  StepForwardOutline,
  UndoOutline,
} from '@ant-design/icons-angular/icons';
import { PilotagePage } from './pilotage-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
  };
}

const OPTIONS_TEST = [
  { libelle: 'Jamais' },
  { libelle: 'Parfois' },
  { libelle: 'Souvent' },
  { libelle: 'Toujours' },
];

const QUESTION_COURANTE = {
  questionId: 'q1',
  libelle: 'Les rétrospectives sont-elles régulières ?',
  options: OPTIONS_TEST,
};

function boutons(fixture: { nativeElement: HTMLElement }): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('button'));
}

function boutonAvecTexte(
  fixture: { nativeElement: HTMLElement },
  texte: string,
): HTMLButtonElement | undefined {
  return boutons(fixture).find((b) => b.textContent?.includes(texte));
}

describe('PilotagePage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<PilotagePage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PilotagePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('s1') },
        // Sans ça, nz-icon tente de récupérer les SVG via HTTP (assets/outline|fill/*.svg), ce
        // que HttpTestingController rejette comme requête non attendue (même pattern que
        // bibliotheque-page.spec.ts).
        provideNzIcons([
          DesktopOutline,
          LeftOutline,
          RightOutline,
          CaretRightFill,
          CheckCircleFill,
          MinusCircleOutline,
          ClockCircleOutline,
          StepForwardOutline,
          UndoOutline,
        ]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('affiche le Code, le compteur de devices connectés et le lien vers la projection une fois le pilotage chargé', () => {
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 3,
      questionCourante: null,
      tourOuvert: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('654321');
    expect(fixture.nativeElement.textContent).toContain('3');
    const lien = fixture.nativeElement.querySelector('a[href="/projection/s1"]');
    expect(lien).toBeTruthy();
  });

  it('sonde /api/sessions/:id/pilotage toutes les 2 secondes et met à jour le compteur', () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
    });

    vi.advanceTimersByTime(2000);

    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 1,
      questionCourante: null,
      tourOuvert: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1');
  });

  it('affiche « Commencer » en salle d’attente, envoie la requête au clic et affiche la Question retournée', () => {
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
    });
    fixture.detectChanges();

    const bouton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(bouton.textContent).toContain('Commencer');
    bouton.click();

    httpMock.expectOne('/api/sessions/s1/passer-question-suivante').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: QUESTION_COURANTE,
      tourOuvert: null,
      progression: [
        {
          questionId: 'q1',
          libelle: QUESTION_COURANTE.libelle,
          statut: 'COURANTE',
          reactivable: false,
          themeId: 't1',
          themeLibelle: 'Thème 1',
        },
      ],
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Les rétrospectives sont-elles régulières ?');
    expect(texte).toContain('A');
    expect(texte).toContain('Jamais');
    // Une seule action à la fois : tant que la Question courante n'a pas de Tour clos, c'est
    // « Ouvrir le vote », jamais « Question suivante » en même temps (carte de synthèse E).
    expect(boutonAvecTexte(fixture, 'Ouvrir le vote')).toBeTruthy();
    expect(boutonAvecTexte(fixture, 'Question suivante')).toBeFalsy();
  });

  it('affiche un message d’erreur si « Question suivante » est refusé, sans changer l’écran', () => {
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
    });
    fixture.detectChanges();
    const messageService = fixture.debugElement.injector.get(NzMessageService);
    const errorSpy = vi.spyOn(messageService, 'error');

    const bouton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    bouton.click();

    httpMock
      .expectOne('/api/sessions/s1/passer-question-suivante')
      .flush('Refusé', { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['questionCourante']()).toBeNull();
  });

  it('affiche un message d’erreur si le pilotage n’est plus accessible, et arrête le sondage pour de bon (carte H2, #49)', () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();
    const messageService = fixture.debugElement.injector.get(NzMessageService);
    const errorSpy = vi.spyOn(messageService, 'error');

    httpMock
      .expectOne('/api/sessions/s1/pilotage')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['inaccessible']()).toBe(true);

    vi.advanceTimersByTime(2000);
    httpMock.expectNone('/api/sessions/s1/pilotage');
  });

  it('une erreur réseau isolée (non 404) du sondage ne déclenche pas « inaccessible » (non-régression, carte H2, #49)', () => {
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/sessions/s1/pilotage')
      .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance['inaccessible']()).toBe(false);
    expect(fixture.componentInstance['connexionPerdue']()).toBe(false);
  });

  it('affiche le bandeau « connexion perdue » seulement après plusieurs échecs consécutifs du sondage, et le masque au succès suivant (carte H2, #49)', () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
    });
    fixture.detectChanges();

    for (let i = 0; i < 2; i++) {
      vi.advanceTimersByTime(2000);
      httpMock
        .expectOne('/api/sessions/s1/pilotage')
        .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();
      expect(fixture.componentInstance['connexionPerdue']()).toBe(false);
    }

    vi.advanceTimersByTime(2000);
    httpMock
      .expectOne('/api/sessions/s1/pilotage')
      .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance['connexionPerdue']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Connexion perdue');

    vi.advanceTimersByTime(2000);
    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance['connexionPerdue']()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Connexion perdue');
  });

  describe('Tour de vote — une seule action à la fois (carte D2, synthèse E)', () => {
    function chargerAvecQuestionCourante(): void {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: null,
        historique: [],
        progression: [
          {
            questionId: 'q1',
            libelle: QUESTION_COURANTE.libelle,
            statut: 'COURANTE',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Thème 1',
          },
        ],
      });
      fixture.detectChanges();
    }

    it('affiche « Ouvrir le vote » comme unique action une fois une Question courante affichée', () => {
      chargerAvecQuestionCourante();

      expect(boutonAvecTexte(fixture, 'Ouvrir le vote')).toBeTruthy();
      expect(boutonAvecTexte(fixture, 'Question suivante')).toBeFalsy();
      expect(boutonAvecTexte(fixture, 'Clore le vote')).toBeFalsy();
    });

    it('ouvre le Tour au clic, affiche le compteur de participation et bascule l’action vers « Clore le vote »', () => {
      chargerAvecQuestionCourante();
      const boutonTour = boutonAvecTexte(fixture, 'Ouvrir le vote')!;

      boutonTour.click();

      httpMock.expectOne('/api/sessions/s1/ouvrir-tour').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: { numero: 1, nbVotants: 0 },
        progression: [
          {
            questionId: 'q1',
            libelle: QUESTION_COURANTE.libelle,
            statut: 'COURANTE',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Thème 1',
          },
        ],
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('0 / 2 ont voté');
      expect(boutonAvecTexte(fixture, 'Clore le vote')).toBeTruthy();
      expect(boutonAvecTexte(fixture, 'Ouvrir le vote')).toBeFalsy();
    });

    it('clôt le Tour au clic, affiche les résultats à côté de la Question et bascule l’action vers « Question suivante »', () => {
      chargerAvecQuestionCourante();
      boutonAvecTexte(fixture, 'Ouvrir le vote')!.click();
      httpMock.expectOne('/api/sessions/s1/ouvrir-tour').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: { numero: 1, nbVotants: 2 },
        progression: [
          {
            questionId: 'q1',
            libelle: QUESTION_COURANTE.libelle,
            statut: 'COURANTE',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Thème 1',
          },
        ],
      });
      fixture.detectChanges();

      boutonAvecTexte(fixture, 'Clore le vote')!.click();
      httpMock.expectOne('/api/sessions/s1/clore-tour').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: null,
        dernierTourClos: { numero: 1, repartition: { 1: 0, 2: 1, 3: 0, 4: 1 } },
        historique: [
          {
            questionId: 'q1',
            libelle: QUESTION_COURANTE.libelle,
            numero: 1,
            repartition: { 1: 0, 2: 1, 3: 0, 4: 1 },
            options: OPTIONS_TEST,
          },
        ],
        // Le vrai backend (Session.progression()) renvoie toujours COURANTE pour l'item à
        // indexCourant, même une fois son Tour clos — elle ne bascule à TRAITEE qu'après avoir
        // avancé. L'action primaire doit donc se piloter sur `dernierTourClos`, jamais sur ce
        // statut : ce fixture le vérifie en gardant volontairement COURANTE ici.
        progression: [
          {
            questionId: 'q1',
            libelle: QUESTION_COURANTE.libelle,
            statut: 'COURANTE',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Thème 1',
          },
        ],
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('ont voté');
      expect(boutonAvecTexte(fixture, 'Question suivante')).toBeTruthy();
      expect(boutonAvecTexte(fixture, 'Ouvrir le vote')).toBeFalsy();
      const comptes = (
        Array.from(
          fixture.nativeElement.querySelectorAll('.pilotage__resultat-compte'),
        ) as HTMLElement[]
      ).map((el) => el.textContent?.trim());
      expect(comptes).toEqual(['0', '1', '0', '1']);
      // Une fois Traitée, revoter (pas sauter) redevient l'action secondaire disponible.
      expect(boutonAvecTexte(fixture, 'Revoter cette Question')).toBeTruthy();
      expect(boutonAvecTexte(fixture, 'Sauter cette Question')).toBeFalsy();
    });
  });

  describe('Rail de pilotage — vue d’ensemble de la Sélection', () => {
    it('n’affiche pas le rail tant que la progression n’est pas connue', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.pilotage__rail')).toBeNull();
    });

    it('affiche toute la Sélection dans son ordre, y compris les Questions sans Tour clos (carte F1)', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [
          {
            questionId: 'q1',
            libelle: 'Question en cours',
            statut: 'COURANTE',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Thème 1',
          },
          {
            questionId: 'q2',
            libelle: 'Question à venir',
            statut: 'A_VENIR',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Thème 1',
          },
        ],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(fixture.nativeElement.querySelector('.pilotage__rail')).toBeTruthy();
      expect(texte).toContain('Question en cours');
      expect(texte).toContain('En cours');
      expect(texte).toContain('Question à venir');
      expect(texte).toContain('À venir');
    });

    it('affiche le statut « Sautée » d’une Question sans Tour (carte F1, préparation de la carte F2)', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [
          {
            questionId: 'q1',
            libelle: 'Question sautée',
            statut: 'SAUTEE',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Thème 1',
          },
        ],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Question sautée');
      expect(texte).toContain('Sautée');
    });

    it('n’affiche la légende des Thèmes que si plusieurs Thèmes apparaissent dans la Sélection', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [
          {
            questionId: 'q1',
            libelle: 'Question 1',
            statut: 'A_VENIR',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Delivery',
          },
          {
            questionId: 'q2',
            libelle: 'Question 2',
            statut: 'A_VENIR',
            reactivable: false,
            themeId: 't1',
            themeLibelle: 'Delivery',
          },
        ],
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.pilotage__legende')).toBeNull();
    });

    it('affiche une pastille par Thème et une légende dès que les Thèmes s’alternent dans la Sélection', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        // Ordre volontairement alterné (Delivery, Collaboration, Delivery) — la Sélection n'impose
        // aucune contiguïté par Thème.
        progression: [
          {
            questionId: 'q1',
            libelle: 'Question 1',
            statut: 'A_VENIR',
            reactivable: false,
            themeId: 'ta',
            themeLibelle: 'Delivery',
          },
          {
            questionId: 'q2',
            libelle: 'Question 2',
            statut: 'A_VENIR',
            reactivable: false,
            themeId: 'tb',
            themeLibelle: 'Collaboration',
          },
          {
            questionId: 'q3',
            libelle: 'Question 3',
            statut: 'A_VENIR',
            reactivable: false,
            themeId: 'ta',
            themeLibelle: 'Delivery',
          },
        ],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(fixture.nativeElement.querySelector('.pilotage__legende')).toBeTruthy();
      expect(texte).toContain('Delivery');
      expect(texte).toContain('Collaboration');
      const pastilles = fixture.nativeElement.querySelectorAll('.pilotage__question-theme');
      expect(pastilles).toHaveLength(3);
      // Les deux Questions du Thème Delivery (q1, q3) partagent la même couleur, distincte de Collaboration.
      const couleurs = Array.from(pastilles).map(
        (el) => (el as HTMLElement).style.background,
      );
      expect(couleurs[0]).toBe(couleurs[2]);
      expect(couleurs[0]).not.toBe(couleurs[1]);
    });

    describe('Sauter une Question à venir (carte F2)', () => {
      function boutonsSauter(): HTMLButtonElement[] {
        return Array.from(
          fixture.nativeElement.querySelectorAll('[aria-label="Sauter cette Question"]'),
        ) as HTMLButtonElement[];
      }

      it('affiche le bouton Sauter dans le rail seulement pour une Question À venir — Courante passe par l’action secondaire', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
            { questionId: 'q2', libelle: 'Courante', statut: 'COURANTE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
            { questionId: 'q3', libelle: 'Traitée', statut: 'TRAITEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
            { questionId: 'q4', libelle: 'Sautée', statut: 'SAUTEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();

        expect(boutonsSauter()).toHaveLength(1);
      });

      it('au clic : appelle sauterQuestion puis applique le pilotage renvoyé', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();

        const bouton = fixture.debugElement.query(
          By.css('[aria-label="Sauter cette Question"]'),
        );
        (bouton.nativeElement as HTMLButtonElement).click();

        const req = httpMock.expectOne('/api/sessions/s1/questions/q1/sauter');
        expect(req.request.method).toBe('POST');
        req.flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'SAUTEE', reactivable: true, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();

        const texte = fixture.nativeElement.textContent as string;
        expect(texte).toContain('Sautée');
      });

      it('affiche un message d’erreur si Sauter est refusé, sans changer l’écran', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();
        const messageService = fixture.debugElement.injector.get(NzMessageService);
        const errorSpy = vi.spyOn(messageService, 'error');

        const bouton = fixture.debugElement.query(By.css('[aria-label="Sauter cette Question"]'));
        (bouton.nativeElement as HTMLButtonElement).click();

        httpMock
          .expectOne('/api/sessions/s1/questions/q1/sauter')
          .flush('Refusé', { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const texte = fixture.nativeElement.textContent as string;
        expect(texte).toContain('À venir');
      });
    });

    describe('Sauter la Question courante depuis l’action secondaire (carte F2)', () => {
      it('affiche « Sauter cette Question » en action secondaire seulement pour la Question Courante, jamais une fois Traitée', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: QUESTION_COURANTE,
          tourOuvert: null,
          historique: [],
          progression: [
            {
              questionId: 'q1',
              libelle: QUESTION_COURANTE.libelle,
              statut: 'COURANTE',
              reactivable: false,
              themeId: 't1',
              themeLibelle: 'Thème 1',
            },
          ],
        });
        fixture.detectChanges();

        expect(boutonAvecTexte(fixture, 'Sauter cette Question')).toBeTruthy();
      });

      it('masque « Sauter cette Question » pendant qu’un Tour est ouvert (perdrait les votes déjà déposés)', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 2,
          questionCourante: QUESTION_COURANTE,
          tourOuvert: { numero: 1, nbVotants: 1 },
          historique: [],
          progression: [
            {
              questionId: 'q1',
              libelle: QUESTION_COURANTE.libelle,
              statut: 'COURANTE',
              reactivable: false,
              themeId: 't1',
              themeLibelle: 'Thème 1',
            },
          ],
        });
        fixture.detectChanges();

        expect(boutonAvecTexte(fixture, 'Sauter cette Question')).toBeFalsy();
      });

      it('au clic : appelle sauterQuestion pour la Question courante', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: QUESTION_COURANTE,
          tourOuvert: null,
          historique: [],
          progression: [
            {
              questionId: 'q1',
              libelle: QUESTION_COURANTE.libelle,
              statut: 'COURANTE',
              reactivable: false,
              themeId: 't1',
              themeLibelle: 'Thème 1',
            },
          ],
        });
        fixture.detectChanges();

        boutonAvecTexte(fixture, 'Sauter cette Question')!.click();

        const req = httpMock.expectOne('/api/sessions/s1/questions/q1/sauter');
        expect(req.request.method).toBe('POST');
      });
    });

    describe('Réactiver une Question sautée (carte #44 addendum)', () => {
      function boutonsReactiver(): HTMLButtonElement[] {
        return Array.from(
          fixture.nativeElement.querySelectorAll('[aria-label="Réactiver cette Question"]'),
        ) as HTMLButtonElement[];
      }

      it('affiche le bouton Réactiver seulement pour une Question Sautée encore réactivable', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
            {
              questionId: 'q2',
              libelle: 'Sautée réactivable',
              statut: 'SAUTEE',
              reactivable: true,
              themeId: 't1',
              themeLibelle: 'T1',
            },
            {
              questionId: 'q3',
              libelle: 'Sautée dépassée',
              statut: 'SAUTEE',
              reactivable: false,
              themeId: 't1',
              themeLibelle: 'T1',
            },
          ],
        });
        fixture.detectChanges();

        expect(boutonsReactiver()).toHaveLength(1);
        expect(fixture.nativeElement.textContent).toContain('Sautée réactivable');
      });

      it('au clic : appelle reactiverQuestion puis applique le pilotage renvoyé', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            {
              questionId: 'q1',
              libelle: 'Sautée',
              statut: 'SAUTEE',
              reactivable: true,
              themeId: 't1',
              themeLibelle: 'T1',
            },
          ],
        });
        fixture.detectChanges();

        const bouton = fixture.debugElement.query(By.css('[aria-label="Réactiver cette Question"]'));
        (bouton.nativeElement as HTMLButtonElement).click();

        const req = httpMock.expectOne('/api/sessions/s1/questions/q1/reactiver');
        expect(req.request.method).toBe('POST');
        req.flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            {
              questionId: 'q1',
              libelle: 'Sautée',
              statut: 'A_VENIR',
              reactivable: false,
              themeId: 't1',
              themeLibelle: 'T1',
            },
          ],
        });
        fixture.detectChanges();

        const texte = fixture.nativeElement.textContent as string;
        expect(texte).toContain('À venir');
        expect(boutonsReactiver()).toHaveLength(0);
      });

      it('affiche un message d’erreur si Réactiver est refusé, sans changer l’écran', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            {
              questionId: 'q1',
              libelle: 'Sautée',
              statut: 'SAUTEE',
              reactivable: true,
              themeId: 't1',
              themeLibelle: 'T1',
            },
          ],
        });
        fixture.detectChanges();
        const messageService = fixture.debugElement.injector.get(NzMessageService);
        const errorSpy = vi.spyOn(messageService, 'error');

        const bouton = fixture.debugElement.query(By.css('[aria-label="Réactiver cette Question"]'));
        (bouton.nativeElement as HTMLButtonElement).click();

        httpMock
          .expectOne('/api/sessions/s1/questions/q1/reactiver')
          .flush('Refusé', { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(boutonsReactiver()).toHaveLength(1);
      });
    });

    describe('Terminer la séance prématurément (carte F3)', () => {
      it('affiche le bouton tant que la Sélection n’est pas terminée, le masque une fois terminée', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();

        expect(boutonAvecTexte(fixture, 'Terminer la séance prématurément')).toBeTruthy();
      });

      it('confirme la boîte de dialogue : appelle terminerPrematurement puis navigue vers l’écran de synthèse', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();
        const router = TestBed.inject(Router);
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const modal = fixture.debugElement.injector.get(NzModalService);
        const confirmSpy = vi.spyOn(modal, 'confirm');

        boutonAvecTexte(fixture, 'Terminer la séance prématurément')!.click();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        const config = confirmSpy.mock.calls[0][0] as { nzOnOk?: () => void };
        config.nzOnOk?.();

        const req = httpMock.expectOne('/api/sessions/s1/terminer-prematurement');
        expect(req.request.method).toBe('POST');
        req.flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'SAUTEE', reactivable: true, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();

        expect(navigateSpy).toHaveBeenCalledWith(['/sessions', 's1', 'synthese']);
      });

      it('affiche un message d’erreur si le refus est renvoyé, sans naviguer', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();
        const messageService = fixture.debugElement.injector.get(NzMessageService);
        const errorSpy = vi.spyOn(messageService, 'error');
        const router = TestBed.inject(Router);
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const modal = fixture.debugElement.injector.get(NzModalService);
        const confirmSpy = vi.spyOn(modal, 'confirm');

        boutonAvecTexte(fixture, 'Terminer la séance prématurément')!.click();

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        const config = confirmSpy.mock.calls[0][0] as { nzOnOk?: () => void };
        config.nzOnOk?.();

        httpMock
          .expectOne('/api/sessions/s1/terminer-prematurement')
          .flush('Refusé', { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(navigateSpy).not.toHaveBeenCalled();
      });

      it('une fois toutes les Questions Traitées/Sautées : masque le cadre d’action, affiche « Voir la synthèse »', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [
            { questionId: 'q1', libelle: 'Traitée', statut: 'TRAITEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
            { questionId: 'q2', libelle: 'Sautée', statut: 'SAUTEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();

        const texte = fixture.nativeElement.textContent as string;
        expect(texte).toContain('Toutes les Questions ont été traitées ou sautées');
        expect(texte).not.toContain('Salle d’attente');
        expect(fixture.nativeElement.querySelector('.pilotage__cadre-action')).toBeNull();
        const lien = fixture.nativeElement.querySelector('a[href="/sessions/s1/synthese"]');
        expect(lien).toBeTruthy();
      });
    });
  });

  describe('Consultation d’une Question déjà Traitée depuis le rail', () => {
    function chargerAvecDeuxQuestionsDontUneTraitee(): void {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: { questionId: 'q2', libelle: 'Question 2', options: OPTIONS_TEST },
        tourOuvert: null,
        historique: [
          {
            questionId: 'q1',
            libelle: 'Question 1',
            numero: 1,
            repartition: { 1: 1, 2: 0, 3: 3, 4: 0 },
            options: OPTIONS_TEST,
          },
        ],
        progression: [
          { questionId: 'q1', libelle: 'Question 1', statut: 'TRAITEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          { questionId: 'q2', libelle: 'Question 2', statut: 'COURANTE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
        ],
      });
      fixture.detectChanges();
    }

    it('affiche le résultat de la Question consultée dans un cadre distinct, masque le cadre d’action', () => {
      chargerAvecDeuxQuestionsDontUneTraitee();

      const ligneQ1 = fixture.debugElement.queryAll(By.css('.pilotage__question-bouton'))[0];
      (ligneQ1.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Résultat consulté');
      expect(texte).toContain('Question 1');
      expect(fixture.nativeElement.querySelector('.pilotage__cadre-question--consultation')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.pilotage__cadre-action')).toBeNull();
      const comptes = (
        Array.from(
          fixture.nativeElement.querySelectorAll('.pilotage__resultat-compte'),
        ) as HTMLElement[]
      ).map((el) => el.textContent?.trim());
      expect(comptes).toEqual(['1', '0', '3', '0']);
    });

    it('« Revenir au direct » ramène à la Question courante et réaffiche le cadre d’action', () => {
      chargerAvecDeuxQuestionsDontUneTraitee();
      const ligneQ1 = fixture.debugElement.queryAll(By.css('.pilotage__question-bouton'))[0];
      (ligneQ1.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      boutonAvecTexte(fixture, 'Revenir au direct')!.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Question 2');
      expect(fixture.nativeElement.querySelector('.pilotage__cadre-question--consultation')).toBeNull();
      expect(fixture.nativeElement.querySelector('.pilotage__cadre-action')).toBeTruthy();
    });

    it('recliquer sur la Question courante dans le rail ramène aussi au direct', () => {
      chargerAvecDeuxQuestionsDontUneTraitee();
      const lignes = fixture.debugElement.queryAll(By.css('.pilotage__question-bouton'));
      (lignes[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const ligneCourante = fixture.debugElement.queryAll(By.css('.pilotage__question-bouton'))[1];
      (ligneCourante.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.pilotage__cadre-question--consultation')).toBeNull();
      expect(fixture.nativeElement.querySelector('.pilotage__cadre-action')).toBeTruthy();
    });

    it('une Question À venir n’est pas cliquable — aucun bouton de consultation pour elle', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [
          { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
        ],
      });
      fixture.detectChanges();

      const bouton = fixture.nativeElement.querySelector(
        'button.pilotage__question-bouton--statique',
      ) as HTMLButtonElement;
      expect(bouton).toBeTruthy();
      expect(bouton.disabled).toBe(true);
    });

    it('ne montre aucune flèche de carrousel pour une Question consultée n’ayant qu’un seul Tour', () => {
      chargerAvecDeuxQuestionsDontUneTraitee();
      const ligneQ1 = fixture.debugElement.queryAll(By.css('.pilotage__question-bouton'))[0];
      (ligneQ1.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.pilotage__carousel-tours')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Tour 1');
    });

    describe('Carrousel des Tours d’une Question revotée', () => {
      function chargerAvecQuestionRevotee(): void {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 2,
          questionCourante: { questionId: 'q2', libelle: 'Question 2', options: OPTIONS_TEST },
          tourOuvert: null,
          historique: [
            {
              questionId: 'q1',
              libelle: 'Question 1',
              numero: 1,
              repartition: { 1: 1, 2: 0, 3: 3, 4: 0 },
              options: OPTIONS_TEST,
            },
            {
              questionId: 'q1',
              libelle: 'Question 1',
              numero: 2,
              repartition: { 1: 0, 2: 2, 3: 1, 4: 1 },
              options: OPTIONS_TEST,
            },
          ],
          progression: [
            { questionId: 'q1', libelle: 'Question 1', statut: 'TRAITEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
            { questionId: 'q2', libelle: 'Question 2', statut: 'COURANTE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          ],
        });
        fixture.detectChanges();
      }

      function cliquerLigneRail(index: number): void {
        const lignes = fixture.debugElement.queryAll(By.css('.pilotage__question-bouton'));
        (lignes[index].nativeElement as HTMLButtonElement).click();
        fixture.detectChanges();
      }

      function boutonCarrousel(libelle: 'Tour précédent' | 'Tour suivant'): HTMLButtonElement {
        return fixture.nativeElement.querySelector(`button[aria-label="${libelle}"]`)!;
      }

      function comptes(): (string | undefined)[] {
        return (
          Array.from(
            fixture.nativeElement.querySelectorAll('.pilotage__resultat-compte'),
          ) as HTMLElement[]
        ).map((el) => el.textContent?.trim());
      }

      it('affiche le dernier Tour par défaut, « Tour suivant » désactivé', () => {
        chargerAvecQuestionRevotee();
        cliquerLigneRail(0);

        expect(fixture.nativeElement.textContent).toContain('Tour 2 / 2');
        expect(comptes()).toEqual(['0', '2', '1', '1']);
        expect(boutonCarrousel('Tour précédent').disabled).toBe(false);
        expect(boutonCarrousel('Tour suivant').disabled).toBe(true);
      });

      it('« Tour précédent » affiche le Tour antérieur et réactive « Tour suivant »', () => {
        chargerAvecQuestionRevotee();
        cliquerLigneRail(0);

        boutonCarrousel('Tour précédent').click();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Tour 1 / 2');
        expect(comptes()).toEqual(['1', '0', '3', '0']);
        expect(boutonCarrousel('Tour précédent').disabled).toBe(true);
        expect(boutonCarrousel('Tour suivant').disabled).toBe(false);
      });

      it('« Tour suivant » ramène au dernier Tour', () => {
        chargerAvecQuestionRevotee();
        cliquerLigneRail(0);
        boutonCarrousel('Tour précédent').click();
        fixture.detectChanges();

        boutonCarrousel('Tour suivant').click();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Tour 2 / 2');
        expect(comptes()).toEqual(['0', '2', '1', '1']);
        expect(boutonCarrousel('Tour suivant').disabled).toBe(true);
      });

      it('consulter une autre Question repart du dernier Tour, sans garder le Tour choisi précédemment', () => {
        chargerAvecQuestionRevotee();
        cliquerLigneRail(0);
        boutonCarrousel('Tour précédent').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Tour 1 / 2');

        boutonAvecTexte(fixture, 'Revenir au direct')!.click();
        fixture.detectChanges();
        cliquerLigneRail(0);

        expect(fixture.nativeElement.textContent).toContain('Tour 2 / 2');
      });
    });
  });

  describe('Lecture seule après clôture (carte G1)', () => {
    it('affiche « Séance clôturée », masque le lien de projection et le cadre d’action, mais garde le rail visible', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'CLOTUREE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        // Combinaison non atteignable par le parcours normal (indexCourant dépasserait toute
        // Question Sautée réactivable avant CLOTUREE) — sert ici uniquement à vérifier que le
        // garde de template ne dépend que de statut(), pas de la dérivation reactivable.
        progression: [
          { questionId: 'q1', libelle: 'Traitée', statut: 'TRAITEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
          { questionId: 'q2', libelle: 'Sautée', statut: 'SAUTEE', reactivable: true, themeId: 't1', themeLibelle: 'T1' },
        ],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Séance clôturée.');
      expect(texte).toContain('Traitée');
      expect(texte).toContain('Sautée');
      expect(
        fixture.nativeElement.querySelector('a[href="/projection/s1"]'),
      ).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.pilotage__cadre-action')).toBeNull();
      // carte #52 : la synthèse doit rester accessible après clôture, pas seulement en OUVERTE.
      expect(
        fixture.nativeElement.querySelector('a[href="/sessions/s1/synthese"]'),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelectorAll('[aria-label="Sauter cette Question"]'),
      ).toHaveLength(0);
      expect(
        fixture.nativeElement.querySelectorAll('[aria-label="Réactiver cette Question"]'),
      ).toHaveLength(0);
    });

    it('reste possible de consulter le résultat d’une Question Traitée après clôture', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'CLOTUREE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [
          {
            questionId: 'q1',
            libelle: 'Traitée',
            numero: 1,
            repartition: { 1: 0, 2: 0, 3: 1, 4: 0 },
            options: OPTIONS_TEST,
          },
        ],
        progression: [
          { questionId: 'q1', libelle: 'Traitée', statut: 'TRAITEE', reactivable: false, themeId: 't1', themeLibelle: 'T1' },
        ],
      });
      fixture.detectChanges();

      fixture.debugElement.query(By.css('.pilotage__question-bouton')).nativeElement.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Résultat consulté');
    });

    it('arrête le sondage pour de bon dès que la réponse indique CLOTUREE (carte H2, #49)', () => {
      vi.useFakeTimers();
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'CLOTUREE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      });
      fixture.detectChanges();

      vi.advanceTimersByTime(2000);
      httpMock.expectNone('/api/sessions/s1/pilotage');
    });
  });
});
