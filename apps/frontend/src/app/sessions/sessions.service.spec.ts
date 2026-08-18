import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('liste les Sessions via GET /api/sessions', () => {
    service.lister().subscribe();

    const req = httpMock.expectOne('/api/sessions');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crée une Session via POST /api/sessions', () => {
    service.creer('e1', '2026-04-01', 'm1').subscribe();

    const req = httpMock.expectOne('/api/sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ equipeId: 'e1', date: '2026-04-01', modeleSessionId: 'm1' });
    req.flush({
      id: 's1',
      equipeId: 'e1',
      equipeNom: 'Alpha',
      entiteId: 'ent1',
      date: '2026-04-01',
      statut: 'OUVERTE',
      modeleSessionId: 'm1',
      verrouillee: false,
      selection: [],
    });
  });

  it('obtient une Session via GET /api/sessions/:id', () => {
    service.obtenir('s1').subscribe();

    const req = httpMock.expectOne('/api/sessions/s1');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 's1',
      equipeId: 'e1',
      equipeNom: 'Alpha',
      entiteId: 'ent1',
      date: '2026-04-01',
      statut: 'OUVERTE',
      modeleSessionId: 'm1',
      verrouillee: false,
      selection: [],
    });
  });

  it('obtient le pilotage via GET /api/sessions/:id/pilotage', () => {
    service.obtenirPilotage('s1').subscribe();

    const req = httpMock.expectOne('/api/sessions/s1/pilotage');
    expect(req.request.method).toBe('GET');
    req.flush({ statut: 'OUVERTE', code: '654321' });
  });

  it('modifie Équipe et Date via PATCH /api/sessions/:id', () => {
    service.modifierInfos('s1', 'e2', '2026-05-01').subscribe();

    const req = httpMock.expectOne('/api/sessions/s1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ equipeId: 'e2', date: '2026-05-01' });
    req.flush({
      id: 's1',
      equipeId: 'e2',
      equipeNom: 'Beta',
      entiteId: 'ent1',
      date: '2026-05-01',
      statut: 'OUVERTE',
      modeleSessionId: 'm1',
      verrouillee: false,
      selection: [],
    });
  });

  it('change le Modèle via PATCH /api/sessions/:id/modele', () => {
    service.changerModele('s1', 'm2').subscribe();

    const req = httpMock.expectOne('/api/sessions/s1/modele');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ modeleSessionId: 'm2' });
    req.flush({
      id: 's1',
      equipeId: 'e1',
      equipeNom: 'Alpha',
      entiteId: 'ent1',
      date: '2026-04-01',
      statut: 'OUVERTE',
      modeleSessionId: 'm2',
      verrouillee: false,
      selection: [],
    });
  });

  it('supprime une Session via DELETE /api/sessions/:id', () => {
    service.supprimer('s1').subscribe();

    const req = httpMock.expectOne('/api/sessions/s1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('ajoute une Question via POST /api/sessions/:id/questions', () => {
    service.ajouterQuestion('s1', 'q1', 2).subscribe();

    const req = httpMock.expectOne('/api/sessions/s1/questions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionId: 'q1', position: 2 });
    req.flush(null);
  });

  it('ajoute un Thème entier via POST /api/sessions/:id/themes', () => {
    service.ajouterTheme('s1', ['q1', 'q2']).subscribe();

    const req = httpMock.expectOne('/api/sessions/s1/themes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionIds: ['q1', 'q2'], position: undefined });
    req.flush(null);
  });

  it('retire une Question via DELETE /api/sessions/:id/questions/:questionId', () => {
    service.retirerQuestion('s1', 'q1').subscribe();

    const req = httpMock.expectOne('/api/sessions/s1/questions/q1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('réordonne une Question via PATCH /api/sessions/:id/questions/:questionId', () => {
    service.reordonnerQuestion('s1', 'q1', 0).subscribe();

    const req = httpMock.expectOne('/api/sessions/s1/questions/q1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ position: 0 });
    req.flush(null);
  });
});
