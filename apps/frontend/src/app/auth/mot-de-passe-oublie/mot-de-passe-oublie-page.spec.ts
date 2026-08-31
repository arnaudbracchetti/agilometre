import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MotDePasseOubliePage } from './mot-de-passe-oublie-page';

describe('MotDePasseOubliePage', () => {
  let httpMock: HttpTestingController;

  async function creerFixture() {
    await TestBed.configureTestingModule({
      imports: [MotDePasseOubliePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(MotDePasseOubliePage);
  }

  afterEach(() => httpMock?.verify());

  it('affiche le succès après une réponse 201 du backend', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['email'].set('ada@example.com');

    fixture.componentInstance['demander']();
    httpMock.expectOne('/api/mot-de-passe/oubli').flush(null);

    expect(fixture.componentInstance['envoye']()).toBe(true);
  });

  it('affiche aussi le succès en cas d’erreur réseau — jamais d’échec visible (anti-oracle)', async () => {
    const fixture = await creerFixture();
    fixture.componentInstance['email'].set('ada@example.com');

    fixture.componentInstance['demander']();
    httpMock
      .expectOne('/api/mot-de-passe/oubli')
      .flush({ message: 'erreur' }, { status: 500, statusText: 'Internal Server Error' });

    expect(fixture.componentInstance['envoye']()).toBe(true);
  });
});
