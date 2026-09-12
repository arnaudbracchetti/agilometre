import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProjectionPage } from './projection-page';

function activatedRouteAvecSessionId(sessionId: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ sessionId }) } as ActivatedRoute['snapshot'],
  };
}

describe('ProjectionPage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<ProjectionPage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectionPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: activatedRouteAvecSessionId('s1') },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('affiche le Code et le compteur de devices connectés en salle d’attente', () => {
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();

    httpMock.expectOne('/api/projection/s1').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 3,
      questionCourante: null,
      tourOuvert: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('654321');
    expect(fixture.nativeElement.textContent).toContain('3');
    expect(fixture.nativeElement.textContent).toContain(window.location.origin);
    expect(fixture.componentInstance['urlDeJointureAvecCode']()).toBe(
      `${window.location.origin}/vote?code=654321`,
    );
    expect(fixture.nativeElement.querySelectorAll('qrcode').length).toBe(1);
  });

  it('affiche la Question courante et ses Options lettrées en Discussion, sans salle d’attente', () => {
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();

    httpMock.expectOne('/api/projection/s1').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 3,
      questionCourante: {
        questionId: 'q1',
        libelle: 'Les rétrospectives sont-elles régulières ?',
        options: [
          { libelle: 'Jamais' },
          { libelle: 'Parfois' },
          { libelle: 'Souvent' },
          { libelle: 'Toujours' },
        ],
      },
      tourOuvert: null,
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Les rétrospectives sont-elles régulières ?');
    expect(texte).toContain('A Jamais');
    expect(texte).toContain('D Toujours');
    expect(texte).not.toContain('Salle d’attente');
    expect(texte).toContain('654321');
    expect(texte).not.toContain('ont voté');
    expect(fixture.nativeElement.querySelectorAll('qrcode').length).toBe(1);
  });

  it('affiche le Compteur de participation pendant le Vote, sans jamais révéler la répartition', () => {
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();

    httpMock.expectOne('/api/projection/s1').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 5,
      questionCourante: {
        questionId: 'q1',
        libelle: 'Les rétrospectives sont-elles régulières ?',
        options: [
          { libelle: 'Jamais' },
          { libelle: 'Parfois' },
          { libelle: 'Souvent' },
          { libelle: 'Toujours' },
        ],
      },
      tourOuvert: { numero: 1, nbVotants: 2 },
      dernierTourClos: null,
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Les rétrospectives sont-elles régulières ?');
    expect(texte).toContain('2 / 5 ont voté');
  });

  it('affiche l’histogramme de répartition après clôture du Tour, sans compteur de participation (carte #40)', () => {
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();

    httpMock.expectOne('/api/projection/s1').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 5,
      questionCourante: {
        questionId: 'q1',
        libelle: 'Les rétrospectives sont-elles régulières ?',
        options: [
          { libelle: 'Jamais' },
          { libelle: 'Parfois' },
          { libelle: 'Souvent' },
          { libelle: 'Toujours' },
        ],
      },
      tourOuvert: null,
      dernierTourClos: { numero: 1, repartition: { 1: 0, 2: 1, 3: 3, 4: 1 } },
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Les rétrospectives sont-elles régulières ?');
    expect(texte).toContain('A Jamais');
    expect(texte).toContain('D Toujours');
    expect(texte).not.toContain('ont voté');
  });

  it('sonde /api/projection/:sessionId toutes les 2 secondes', () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/projection/s1').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
    });

    vi.advanceTimersByTime(2000);

    httpMock.expectOne('/api/projection/s1').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 1,
      questionCourante: null,
      tourOuvert: null,
    });
  });

  it('affiche un écran d’erreur si la Session n’est pas accessible, et arrête le sondage pour de bon (carte H2, #49)', () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/projection/s1')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('n’est pas accessible');

    vi.advanceTimersByTime(2000);
    httpMock.expectNone('/api/projection/s1');
  });

  it('une erreur réseau isolée (non 404) du sondage ne déclenche pas « inaccessible » (non-régression, carte H2, #49)', () => {
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/projection/s1')
      .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance['inaccessible']()).toBe(false);
    expect(fixture.componentInstance['connexionPerdue']()).toBe(false);
  });

  it('affiche le bandeau « connexion perdue » seulement après plusieurs échecs consécutifs du sondage, et le masque au succès suivant (carte H2, #49)', () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(ProjectionPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/projection/s1').flush({
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
        .expectOne('/api/projection/s1')
        .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();
      expect(fixture.componentInstance['connexionPerdue']()).toBe(false);
    }

    vi.advanceTimersByTime(2000);
    httpMock
      .expectOne('/api/projection/s1')
      .flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance['connexionPerdue']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Connexion perdue');

    vi.advanceTimersByTime(2000);
    httpMock.expectOne('/api/projection/s1').flush({
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
});
