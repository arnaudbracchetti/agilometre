import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OrganisationService } from './organisation.service';

describe('OrganisationService', () => {
  let service: OrganisationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrganisationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('liste les Entités via GET /api/organisation/entites', () => {
    service.listerEntites().subscribe();

    const req = httpMock.expectOne('/api/organisation/entites');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'e1', nom: 'DSI' }]);
  });

  it('crée une Entité via POST /api/organisation/entites', () => {
    service.creerEntite('Marketing').subscribe();

    const req = httpMock.expectOne('/api/organisation/entites');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Marketing' });
    req.flush({ id: 'e1', nom: 'Marketing' });
  });

  it('renomme une Entité via PATCH /api/organisation/entites/:id', () => {
    service.renommerEntite('e1', 'Nouveau nom').subscribe();

    const req = httpMock.expectOne('/api/organisation/entites/e1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Nouveau nom' });
    req.flush({ id: 'e1', nom: 'Nouveau nom' });
  });

  it('liste les Équipes d’une Entité via GET /api/organisation/entites/:entiteId/equipes', () => {
    service.listerEquipesParEntite('e1').subscribe();

    const req = httpMock.expectOne('/api/organisation/entites/e1/equipes');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
  });

  it('crée une Équipe via POST /api/organisation/equipes', () => {
    service.creerEquipe('Alpha', 'e1').subscribe();

    const req = httpMock.expectOne('/api/organisation/equipes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Alpha', entiteId: 'e1' });
    req.flush({ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] });
  });

  it('renomme une Équipe via PATCH /api/organisation/equipes/:id', () => {
    service.renommerEquipe('eq1', 'Beta').subscribe();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Beta' });
    req.flush({ id: 'eq1', nom: 'Beta', entiteId: 'e1', membres: [] });
  });

  it('supprime une Équipe via DELETE /api/organisation/equipes/:id', () => {
    service.supprimerEquipe('eq1').subscribe();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('ajoute un Membre via POST /api/organisation/equipes/:id/membres', () => {
    service.ajouterMembre('eq1', 'Jean Dupont', 'jean@example.com').subscribe();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/membres');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Jean Dupont', email: 'jean@example.com' });
    req.flush({
      id: 'eq1',
      nom: 'Alpha',
      entiteId: 'e1',
      membres: [{ id: 'm1', nom: 'Jean Dupont', email: 'jean@example.com', utilisateurId: null }],
    });
  });

  it('retire un Membre via DELETE /api/organisation/equipes/:id/membres/:membreId', () => {
    service.retirerMembre('eq1', 'm1').subscribe();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/membres/m1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] });
  });

  it('modifie un Membre via PATCH /api/organisation/equipes/:id/membres/:membreId', () => {
    service.modifierMembre('eq1', 'm1', 'Jean D.', 'jean.d@example.com').subscribe();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/membres/m1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Jean D.', email: 'jean.d@example.com' });
    req.flush({
      id: 'eq1',
      nom: 'Alpha',
      entiteId: 'e1',
      membres: [{ id: 'm1', nom: 'Jean D.', email: 'jean.d@example.com', utilisateurId: null }],
    });
  });
});
