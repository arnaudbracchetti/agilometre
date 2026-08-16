import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { BibliothequePage } from './bibliotheque-page';

describe('BibliothequePage', () => {
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

  it('charge et affiche les lignes de la bibliothèque au démarrage', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/modeles-session').flush([
      {
        id: 'm1',
        nom: 'Diagnostic complet',
        nbQuestionsActives: 3,
        themesCouverts: ['Thème A'],
        misAJourLe: '2026-01-01T00:00:00.000Z',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Diagnostic complet');
  });

  it('crée un Modèle nommé "nouveau modèle" puis navigue vers /modeles-session/:id', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/modeles-session').flush([]);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['creerNouveauModele']();

    const req = httpMock.expectOne('/api/modeles-session');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'nouveau modèle' });
    req.flush({ id: 'm2', nom: 'nouveau modèle', selection: [] });

    expect(navigateSpy).toHaveBeenCalledWith(['/modeles-session', 'm2']);
  });

  it('duplique un Modèle puis rafraîchit la liste', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/modeles-session').flush([]);
    fixture.detectChanges();

    fixture.componentInstance['dupliquer']('m1');
    httpMock.expectOne('/api/modeles-session/m1/dupliquer').flush({
      id: 'm2',
      nom: 'Diagnostic complet (copie)',
      selection: [],
    });

    httpMock.expectOne('/api/modeles-session').flush([]);
  });

  it('supprime un Modèle puis rafraîchit la liste', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/modeles-session').flush([]);
    fixture.detectChanges();

    fixture.componentInstance['supprimer']('m1');
    httpMock.expectOne('/api/modeles-session/m1').flush(null);

    httpMock.expectOne('/api/modeles-session').flush([]);
  });

  it('affiche un message d’erreur si le chargement échoue', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    const message = TestBed.inject(NzMessageService);
    const erreurSpy = vi.spyOn(message, 'error');

    httpMock
      .expectOne('/api/modeles-session')
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(erreurSpy).toHaveBeenCalledWith('Impossible de charger la bibliothèque de Modèles.');
  });
});
