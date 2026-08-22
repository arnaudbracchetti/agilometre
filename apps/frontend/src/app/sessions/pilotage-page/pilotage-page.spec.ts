import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { convertToParamMap, provideRouter, ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { CaretRightFill, DownOutline } from '@ant-design/icons-angular/icons';
import { PilotagePage } from './pilotage-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
  };
}

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
        provideNzIcons([DownOutline, CaretRightFill]),
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
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Les rétrospectives sont-elles régulières ?');
    expect(texte).toContain('A — Jamais');
    expect(bouton.textContent).toContain('Question suivante');
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

  describe('Tour de vote (carte D2)', () => {
    function chargerAvecQuestionCourante(): void {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: null,
      });
      fixture.detectChanges();
    }

    it('affiche « Ouvrir le vote » à côté de « Question suivante » une fois une Question courante affichée', () => {
      chargerAvecQuestionCourante();

      const boutons = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[];
      const texteBoutons = boutons.map((b) => b.textContent);
      expect(texteBoutons.some((t) => t?.includes('Ouvrir le vote'))).toBe(true);
      expect(texteBoutons.some((t) => t?.includes('Question suivante'))).toBe(true);
    });

    it('ouvre le Tour au clic, affiche le compteur de participation et désactive « Question suivante »', () => {
      chargerAvecQuestionCourante();
      const boutons = () =>
        Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
      const boutonTour = boutons().find((b) => b.textContent?.includes('Ouvrir le vote'))!;

      boutonTour.click();

      httpMock.expectOne('/api/sessions/s1/ouvrir-tour').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: { numero: 1, nbVotants: 0 },
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('0 / 2 ont voté');
      const boutonSuivante = boutons().find((b) => b.textContent?.includes('Question suivante'))!;
      expect(boutonSuivante.disabled).toBe(true);
      expect(
        boutons().find((b) => b.textContent?.includes('Clore le vote')),
      ).toBeTruthy();
    });

    it('clôt le Tour au clic et réactive « Question suivante »', () => {
      chargerAvecQuestionCourante();
      const boutons = () =>
        Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
      boutons().find((b) => b.textContent?.includes('Ouvrir le vote'))!.click();
      httpMock.expectOne('/api/sessions/s1/ouvrir-tour').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: { numero: 1, nbVotants: 1 },
      });
      fixture.detectChanges();

      boutons().find((b) => b.textContent?.includes('Clore le vote'))!.click();
      httpMock.expectOne('/api/sessions/s1/clore-tour').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: QUESTION_COURANTE,
        tourOuvert: null,
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('ont voté');
      const boutonSuivante = boutons().find((b) => b.textContent?.includes('Question suivante'))!;
      expect(boutonSuivante.disabled).toBe(false);
    });
  });

  describe('Vue d’ensemble de la Sélection (cartes E2 + F1)', () => {
    it('n’affiche aucune section tant que la progression n’est pas connue', () => {
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

      expect(fixture.nativeElement.textContent).not.toContain('Vue d’ensemble de la Sélection');
    });

    it('affiche toute la Sélection dès que la progression est connue, y compris les Questions sans Tour clos (carte F1)', () => {
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
          { questionId: 'q1', libelle: 'Question en cours', statut: 'COURANTE' },
          { questionId: 'q2', libelle: 'Question à venir', statut: 'A_VENIR' },
        ],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Vue d’ensemble de la Sélection');
      expect(texte).toContain('Question en cours');
      expect(texte).toContain('En cours');
      expect(texte).toContain('Question à venir');
      expect(texte).toContain('À venir');
      // Aucun Tour à dérouler pour ces deux Questions : pas d'en-tête cliquable ni de chevron.
      expect(fixture.nativeElement.querySelector('button.pilotage__historique-entete')).toBeNull();
      expect(fixture.nativeElement.querySelector('.pilotage__historique-chevron')).toBeNull();
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
        progression: [{ questionId: 'q1', libelle: 'Question sautée', statut: 'SAUTEE' }],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Question sautée');
      expect(texte).toContain('Sautée');
    });

    it('groupe les Tours d’une même Question revotée sous une seule note, repliée par défaut, avec le badge « pris en compte » sur le bon numéro', () => {
      fixture = TestBed.createComponent(PilotagePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 2,
        questionCourante: null,
        tourOuvert: null,
        progression: [
          { questionId: 'q1', libelle: 'Les rétrospectives sont-elles régulières ?', statut: 'TRAITEE' },
          { questionId: 'q2', libelle: 'Autre question', statut: 'TRAITEE' },
        ],
        historique: [
          {
            questionId: 'q1',
            libelle: 'Les rétrospectives sont-elles régulières ?',
            numero: 1,
            repartition: { 1: 2, 2: 0, 3: 0, 4: 0 },
          },
          {
            questionId: 'q1',
            libelle: 'Les rétrospectives sont-elles régulières ?',
            numero: 2,
            repartition: { 1: 0, 2: 0, 3: 0, 4: 2 },
          },
          {
            questionId: 'q2',
            libelle: 'Autre question',
            numero: 1,
            repartition: { 1: 0, 2: 1, 3: 0, 4: 0 },
          },
        ],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Vue d’ensemble de la Sélection');
      expect(texte).toContain('Les rétrospectives sont-elles régulières ?');
      expect(texte).toContain('2 tours');
      expect(texte).toContain('Autre question');
      expect(texte).toContain('1 tour');
      // Repliée par défaut : le détail des Tours n'est pas encore dans le DOM.
      expect(fixture.nativeElement.querySelector('.pilotage__historique-tour-titre')).toBeNull();

      const entetes = Array.from(
        fixture.nativeElement.querySelectorAll('.pilotage__historique-entete'),
      ) as HTMLButtonElement[];
      expect(entetes).toHaveLength(2);
      entetes.forEach((entete) => entete.click());
      fixture.detectChanges();

      const badges = Array.from(
        fixture.nativeElement.querySelectorAll('.pilotage__historique-badge'),
      ) as HTMLElement[];
      expect(badges).toHaveLength(2);

      const titresDeTours = Array.from(
        fixture.nativeElement.querySelectorAll('.pilotage__historique-tour-titre'),
      ) as HTMLElement[];
      const titreTour2 = titresDeTours.find((el) => el.textContent?.includes('Tour 2'))!;
      expect(titreTour2.textContent).toContain('Pris en compte');
      const titreTour1 = titresDeTours.find((el) => el.textContent?.trim().startsWith('Tour 1'))!;
      expect(titreTour1.textContent).not.toContain('Pris en compte');
    });

    describe('Sauter une Question (carte F2)', () => {
      function boutonsSauter(): HTMLButtonElement[] {
        return Array.from(
          fixture.nativeElement.querySelectorAll('.pilotage__historique-sauter'),
        ) as HTMLButtonElement[];
      }

      it('affiche le bouton Sauter pour une Question À venir ou Courante, pas pour Traitée ou Sautée', () => {
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
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR' },
            { questionId: 'q2', libelle: 'Courante', statut: 'COURANTE' },
            { questionId: 'q3', libelle: 'Traitée', statut: 'TRAITEE' },
            { questionId: 'q4', libelle: 'Sautée', statut: 'SAUTEE' },
          ],
        });
        fixture.detectChanges();

        expect(boutonsSauter()).toHaveLength(2);
      });

      it('confirme la popconfirm : appelle sauterQuestion puis applique le pilotage renvoyé', () => {
        fixture = TestBed.createComponent(PilotagePage);
        fixture.detectChanges();
        httpMock.expectOne('/api/sessions/s1/pilotage').flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: QUESTION_COURANTE,
          tourOuvert: null,
          historique: [],
          progression: [{ questionId: 'q1', libelle: QUESTION_COURANTE.libelle, statut: 'COURANTE' }],
        });
        fixture.detectChanges();

        const bouton = fixture.debugElement
          .queryAll(By.css('.pilotage__historique-sauter'))
          .find((el) => (el.nativeElement as HTMLElement).textContent?.includes('Sauter'))!;
        bouton.triggerEventHandler('nzOnConfirm', undefined);

        const req = httpMock.expectOne('/api/sessions/s1/questions/q1/sauter');
        expect(req.request.method).toBe('POST');
        req.flush({
          statut: 'OUVERTE',
          code: '654321',
          nbDevicesConnectes: 0,
          questionCourante: null,
          tourOuvert: null,
          historique: [],
          progression: [{ questionId: 'q1', libelle: QUESTION_COURANTE.libelle, statut: 'SAUTEE' }],
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
          progression: [{ questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR' }],
        });
        fixture.detectChanges();
        const messageService = fixture.debugElement.injector.get(NzMessageService);
        const errorSpy = vi.spyOn(messageService, 'error');

        const bouton = fixture.debugElement.query(By.css('.pilotage__historique-sauter'));
        bouton.triggerEventHandler('nzOnConfirm', undefined);

        httpMock
          .expectOne('/api/sessions/s1/questions/q1/sauter')
          .flush('Refusé', { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const texte = fixture.nativeElement.textContent as string;
        expect(texte).toContain('À venir');
      });
    });

    describe('Réactiver une Question sautée (carte #44 addendum)', () => {
      function boutonsReactiver(): HTMLButtonElement[] {
        return Array.from(
          fixture.nativeElement.querySelectorAll('.pilotage__historique-reactiver'),
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
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false },
            {
              questionId: 'q2',
              libelle: 'Sautée réactivable',
              statut: 'SAUTEE',
              reactivable: true,
            },
            {
              questionId: 'q3',
              libelle: 'Sautée dépassée',
              statut: 'SAUTEE',
              reactivable: false,
            },
          ],
        });
        fixture.detectChanges();

        expect(boutonsReactiver()).toHaveLength(1);
        expect(fixture.nativeElement.textContent).toContain('Sautée réactivable');
      });

      it('confirme la popconfirm : appelle reactiverQuestion puis applique le pilotage renvoyé', () => {
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
            { questionId: 'q1', libelle: 'Sautée', statut: 'SAUTEE', reactivable: true },
          ],
        });
        fixture.detectChanges();

        const bouton = fixture.debugElement.query(By.css('.pilotage__historique-reactiver'));
        bouton.triggerEventHandler('nzOnConfirm', undefined);

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
            { questionId: 'q1', libelle: 'Sautée', statut: 'A_VENIR', reactivable: false },
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
            { questionId: 'q1', libelle: 'Sautée', statut: 'SAUTEE', reactivable: true },
          ],
        });
        fixture.detectChanges();
        const messageService = fixture.debugElement.injector.get(NzMessageService);
        const errorSpy = vi.spyOn(messageService, 'error');

        const bouton = fixture.debugElement.query(By.css('.pilotage__historique-reactiver'));
        bouton.triggerEventHandler('nzOnConfirm', undefined);

        httpMock
          .expectOne('/api/sessions/s1/questions/q1/reactiver')
          .flush('Refusé', { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(boutonsReactiver()).toHaveLength(1);
      });
    });

    describe('Terminer la séance prématurément (carte F3)', () => {
      function boutonTerminerPrematurement(): HTMLButtonElement {
        return Array.from(
          fixture.nativeElement.querySelectorAll('button'),
        ).find((b) =>
          (b as HTMLButtonElement).textContent?.includes('Terminer la séance prématurément'),
        ) as HTMLButtonElement;
      }

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
          progression: [{ questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR' }],
        });
        fixture.detectChanges();

        expect(boutonTerminerPrematurement()).toBeTruthy();
      });

      it('confirme la popconfirm : appelle terminerPrematurement puis navigue vers l’écran de synthèse', () => {
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
            { questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR', reactivable: false },
          ],
        });
        fixture.detectChanges();
        const router = TestBed.inject(Router);
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        const bouton = fixture.debugElement
          .queryAll(By.css('button'))
          .find((el) =>
            (el.nativeElement as HTMLElement).textContent?.includes(
              'Terminer la séance prématurément',
            ),
          )!;
        bouton.triggerEventHandler('nzOnConfirm', undefined);

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
            { questionId: 'q1', libelle: 'À venir', statut: 'SAUTEE', reactivable: true },
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
          progression: [{ questionId: 'q1', libelle: 'À venir', statut: 'A_VENIR' }],
        });
        fixture.detectChanges();
        const messageService = fixture.debugElement.injector.get(NzMessageService);
        const errorSpy = vi.spyOn(messageService, 'error');
        const router = TestBed.inject(Router);
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        const bouton = fixture.debugElement
          .queryAll(By.css('button'))
          .find((el) =>
            (el.nativeElement as HTMLElement).textContent?.includes(
              'Terminer la séance prématurément',
            ),
          )!;
        bouton.triggerEventHandler('nzOnConfirm', undefined);

        httpMock
          .expectOne('/api/sessions/s1/terminer-prematurement')
          .flush('Refusé', { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(navigateSpy).not.toHaveBeenCalled();
      });

      it('une fois toutes les Questions Traitées/Sautées : masque les contrôles, affiche « Voir la synthèse »', () => {
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
            { questionId: 'q1', libelle: 'Traitée', statut: 'TRAITEE' },
            { questionId: 'q2', libelle: 'Sautée', statut: 'SAUTEE', reactivable: false },
          ],
        });
        fixture.detectChanges();

        const texte = fixture.nativeElement.textContent as string;
        expect(texte).toContain('Toutes les Questions ont été traitées ou sautées');
        expect(texte).not.toContain('Salle d’attente');
        expect(boutonTerminerPrematurement()).toBeFalsy();
        const lien = fixture.nativeElement.querySelector('a[href="/sessions/s1/synthese"]');
        expect(lien).toBeTruthy();
      });
    });
  });

  describe('Lecture seule après clôture (carte G1)', () => {
    it('affiche « Séance clôturée », masque le lien de projection et les contrôles, mais garde la Vue d’ensemble visible', () => {
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
          { questionId: 'q1', libelle: 'Traitée', statut: 'TRAITEE', reactivable: false },
          { questionId: 'q2', libelle: 'Sautée', statut: 'SAUTEE', reactivable: true },
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
      const boutons = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[];
      expect(boutons.some((b) => b.textContent?.includes('Sauter'))).toBe(false);
      expect(boutons.some((b) => b.textContent?.includes('Réactiver'))).toBe(false);
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
