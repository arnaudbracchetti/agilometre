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
});
