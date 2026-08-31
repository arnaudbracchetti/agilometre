import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Role } from '@agilometre/shared';
import { ComptesService } from './comptes.service';

describe('ComptesService', () => {
  let service: ComptesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ComptesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('liste les comptes via GET /api/comptes', () => {
    service.lister().subscribe();

    const req = httpMock.expectOne('/api/comptes');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crée un compte via POST /api/comptes', () => {
    service.creer('ada@example.com', 'Ada', 'Lovelace', Role.Direction).subscribe();

    const req = httpMock.expectOne('/api/comptes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'ada@example.com',
      prenom: 'Ada',
      nom: 'Lovelace',
      role: Role.Direction,
    });
    req.flush({});
  });

  it('modifie un compte via PATCH /api/comptes/:id', () => {
    service.modifier('u1', 'grace@example.com', 'Grace', 'Hopper').subscribe();

    const req = httpMock.expectOne('/api/comptes/u1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ email: 'grace@example.com', prenom: 'Grace', nom: 'Hopper' });
    req.flush({});
  });

  it('désactive un compte via POST /api/comptes/:id/desactiver', () => {
    service.desactiver('u1').subscribe();

    const req = httpMock.expectOne('/api/comptes/u1/desactiver');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('réactive un compte via POST /api/comptes/:id/reactiver', () => {
    service.reactiver('u1').subscribe();

    const req = httpMock.expectOne('/api/comptes/u1/reactiver');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
