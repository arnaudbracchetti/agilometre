import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ParticipantService } from './participant.service';

describe('ParticipantService', () => {
  let service: ParticipantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ParticipantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('rejoint une Session via POST /api/participant/rejoindre', () => {
    service.rejoindre('4271').subscribe();

    const req = httpMock.expectOne('/api/participant/rejoindre');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: '4271' });
    req.flush({ sessionId: 's1', jeton: 'jeton-abc' });
  });
});
