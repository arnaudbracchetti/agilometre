import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProjectionService } from './projection.service';

describe('ProjectionService', () => {
  let service: ProjectionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('obtient la projection via GET /api/projection/:sessionId', () => {
    service.obtenir('s1').subscribe();

    const req = httpMock.expectOne('/api/projection/s1');
    expect(req.request.method).toBe('GET');
    req.flush({ statut: 'OUVERTE', code: '654321', nbDevicesConnectes: 2 });
  });
});
