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
    expect(req.request.body).toEqual({ code: '4271', jetonPrecedent: undefined });
    req.flush({ sessionId: 's1', jeton: 'jeton-abc' });
  });

  it('transmet le Jeton précédent quand fourni ("Rejoindre une autre séance")', () => {
    service.rejoindre('4271', 'jeton-ancien').subscribe();

    const req = httpMock.expectOne('/api/participant/rejoindre');
    expect(req.request.body).toEqual({ code: '4271', jetonPrecedent: 'jeton-ancien' });
    req.flush({ sessionId: 's1', jeton: 'jeton-abc' });
  });

  it('lit l’état participant via GET /api/participant/moi avec le Jeton en Authorization', () => {
    service.obtenirMoi('jeton-abc').subscribe();

    const req = httpMock.expectOne('/api/participant/moi');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-abc');
    req.flush({ voteOuvert: false, question: null, optionChoisieIndex: null });
  });

  it('vote via POST /api/participant/voter avec le Jeton en Authorization', () => {
    service.voter('jeton-abc', 2).subscribe();

    const req = httpMock.expectOne('/api/participant/voter');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-abc');
    expect(req.request.body).toEqual({ optionIndex: 2 });
    req.flush({ voteOuvert: true, question: null, optionChoisieIndex: 2 });
  });
});
