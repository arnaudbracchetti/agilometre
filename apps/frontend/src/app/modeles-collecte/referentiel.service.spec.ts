import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReferentielService } from './referentiel.service';

describe('ReferentielService', () => {
  let service: ReferentielService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReferentielService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('obtient le Référentiel actif via GET /api/referentiel', () => {
    service.obtenirReferentielActif().subscribe();

    const req = httpMock.expectOne('/api/referentiel');
    expect(req.request.method).toBe('GET');
    req.flush({ themes: [] });
  });
});
