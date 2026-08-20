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
    });

    vi.advanceTimersByTime(2000);

    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 1,
      questionCourante: null,
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
    });
    fixture.detectChanges();

    const bouton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(bouton.textContent).toContain('Commencer');
    bouton.click();

    httpMock.expectOne('/api/sessions/s1/passer-question-suivante').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
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
});
