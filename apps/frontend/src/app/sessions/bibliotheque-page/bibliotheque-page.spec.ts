import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { StatutSession } from '@agilometre/shared';
import { BibliothequePage } from './bibliotheque-page';

describe('BibliothequePage (Sessions)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibliothequePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge et affiche les lignes au démarrage', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Équipe Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'OUVERTE',
        verrouillee: false,
        nbQuestions: 3,
        modeleSessionNom: 'Diagnostic complet',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Équipe Alpha');
    expect(fixture.nativeElement.textContent).toContain('Diagnostic complet');
  });

  it('affiche "Modèle supprimé" quand modeleSessionNom est null', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Équipe Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'CLOTUREE',
        verrouillee: false,
        nbQuestions: 1,
        modeleSessionNom: null,
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Modèle supprimé');
  });

  it('estSupprimable — faux si verrouillée ou clôturée, vrai sinon', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([]);
    fixture.detectChanges();

    const ligneOuverte = {
      id: 's1',
      equipeNom: 'Alpha',
      date: '2026-04-01T00:00:00.000Z',
      statut: StatutSession.Ouverte,
      verrouillee: false,
      nbQuestions: 1,
      modeleSessionNom: 'M',
    };

    expect(fixture.componentInstance['estSupprimable'](ligneOuverte)).toBe(true);
    expect(
      fixture.componentInstance['estSupprimable']({ ...ligneOuverte, verrouillee: true }),
    ).toBe(false);
    expect(
      fixture.componentInstance['estSupprimable']({
        ...ligneOuverte,
        statut: StatutSession.Cloturee,
      }),
    ).toBe(false);
  });

  it('supprimer — appelle le service puis rafraîchit la liste', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'OUVERTE',
        verrouillee: false,
        nbQuestions: 1,
        modeleSessionNom: 'M',
      },
    ]);
    fixture.detectChanges();

    fixture.componentInstance['supprimer']('s1');

    const reqSuppression = httpMock.expectOne('/api/sessions/s1');
    expect(reqSuppression.request.method).toBe('DELETE');
    reqSuppression.flush(null);

    httpMock.expectOne('/api/sessions').flush([]);

    expect(fixture.componentInstance['lignes']()).toEqual([]);
  });

  it('navigue vers /sessions/:id au clic sur une ligne', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([]);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['ouvrir']('s1');

    expect(navigateSpy).toHaveBeenCalledWith(['/sessions', 's1']);
  });

  it('affiche un message d’erreur si le chargement échoue', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    const message = TestBed.inject(NzMessageService);
    const erreurSpy = vi.spyOn(message, 'error');

    httpMock.expectOne('/api/sessions').flush(null, { status: 500, statusText: 'Server Error' });

    expect(erreurSpy).toHaveBeenCalledWith('Impossible de charger la liste des Sessions.');
  });
});
