import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ModelesSessionService } from './modeles-session.service';

describe('ModelesSessionService', () => {
  let service: ModelesSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ModelesSessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('liste la bibliothèque via GET /api/modeles-session', () => {
    service.listerBibliotheque().subscribe();

    const req = httpMock.expectOne('/api/modeles-session');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crée un Modèle via POST /api/modeles-session', () => {
    service.creerModele('Diagnostic complet').subscribe();

    const req = httpMock.expectOne('/api/modeles-session');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Diagnostic complet' });
    req.flush({ id: 'm1', nom: 'Diagnostic complet', selection: [] });
  });

  it('obtient un Modèle via GET /api/modeles-session/:id', () => {
    service.obtenirModele('m1').subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'm1', nom: 'Alpha', selection: [] });
  });

  it('renomme un Modèle via PATCH /api/modeles-session/:id', () => {
    service.renommerModele('m1', 'Beta').subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Beta' });
    req.flush({ id: 'm1', nom: 'Beta', selection: [] });
  });

  it('duplique un Modèle via POST /api/modeles-session/:id/dupliquer', () => {
    service.dupliquerModele('m1').subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1/dupliquer');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'm2', nom: 'Alpha (copie)', selection: [] });
  });

  it('supprime un Modèle via DELETE /api/modeles-session/:id', () => {
    service.supprimerModele('m1').subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('ajoute une Question via POST /api/modeles-session/:id/questions', () => {
    service.ajouterQuestion('m1', 'q1', 2).subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1/questions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionId: 'q1', position: 2 });
    req.flush({ id: 'm1', nom: 'Alpha', selection: [] });
  });

  it('ajoute un Thème entier via POST /api/modeles-session/:id/themes', () => {
    service.ajouterTheme('m1', ['q1', 'q2']).subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1/themes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionIds: ['q1', 'q2'], position: undefined });
    req.flush({ id: 'm1', nom: 'Alpha', selection: [] });
  });

  it('retire une Question via DELETE /api/modeles-session/:id/questions/:questionId', () => {
    service.retirerQuestion('m1', 'q1').subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1/questions/q1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 'm1', nom: 'Alpha', selection: [] });
  });

  it('réordonne une Question via PATCH /api/modeles-session/:id/questions/:questionId', () => {
    service.reordonnerQuestion('m1', 'q1', 0).subscribe();

    const req = httpMock.expectOne('/api/modeles-session/m1/questions/q1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ position: 0 });
    req.flush({ id: 'm1', nom: 'Alpha', selection: [] });
  });
});
