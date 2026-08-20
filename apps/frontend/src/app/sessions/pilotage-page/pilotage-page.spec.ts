import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
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
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('s1') },
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

  it('affiche un message d’erreur si le pilotage n’est plus accessible', () => {
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
});
