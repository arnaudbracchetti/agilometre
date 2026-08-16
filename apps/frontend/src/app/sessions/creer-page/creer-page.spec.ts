import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { provideNzI18n, fr_FR } from 'ng-zorro-antd/i18n';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import { CreerPage } from './creer-page';

describe('CreerPage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<CreerPage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreerPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        provideNzI18n(fr_FR),
        provideNzNativeDateAdapter(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(CreerPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'ent1', nom: 'DSI' }]);
    httpMock.expectOne('/api/modeles-session').flush([
      {
        id: 'm1',
        nom: 'Diagnostic',
        nbQuestionsActives: 2,
        themesCouverts: ['Thème A'],
        misAJourLe: '2026-01-01T00:00:00.000Z',
      },
    ]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge les Entités et les Modèles au démarrage', () => {
    expect(fixture.componentInstance['entites']()).toEqual([{ id: 'ent1', nom: 'DSI' }]);
    expect(fixture.componentInstance['modeles']()).toHaveLength(1);
  });

  it('onEntiteChange — charge les Équipes de l’Entité choisie', () => {
    fixture.componentInstance['onEntiteChange']('ent1');

    const req = httpMock.expectOne('/api/organisation/entites/ent1/equipes');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'e1', nom: 'Alpha', entiteId: 'ent1', membres: [] }]);

    expect(fixture.componentInstance['equipesDeLEntite']()).toHaveLength(1);
  });

  it('onModeleChange — charge l’aperçu en lecture seule du Modèle choisi', () => {
    fixture.componentInstance['onModeleChange']('m1');

    const req = httpMock.expectOne('/api/modeles-session/m1');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'm1',
      nom: 'Diagnostic',
      selection: [{ questionId: 'q1', libelle: 'Q1', themeId: 't1', themeLibelle: 'Thème A' }],
    });

    expect(fixture.componentInstance['apercuModele']()?.selection).toHaveLength(1);
  });

  it('formulaireValide — faux tant qu’Équipe, date et Modèle ne sont pas tous renseignés', () => {
    expect(fixture.componentInstance['formulaireValide']()).toBe(false);

    fixture.componentInstance['onEntiteChange']('ent1');
    httpMock.expectOne('/api/organisation/entites/ent1/equipes').flush([]);
    fixture.componentInstance['equipeId'].set('e1');
    fixture.componentInstance['modeleSessionId'].set('m1');

    expect(fixture.componentInstance['formulaireValide']()).toBe(true);
  });

  it('creer — crée la Session puis navigue vers /sessions/:id', () => {
    fixture.componentInstance['equipeId'].set('e1');
    fixture.componentInstance['modeleSessionId'].set('m1');
    fixture.componentInstance['date'].set(new Date('2026-04-01T00:00:00.000Z'));

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['creer']();

    const req = httpMock.expectOne('/api/sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      equipeId: 'e1',
      date: '2026-04-01T00:00:00.000Z',
      modeleSessionId: 'm1',
    });
    req.flush({
      id: 's1',
      equipeId: 'e1',
      equipeNom: 'Alpha',
      date: '2026-04-01T00:00:00.000Z',
      statut: 'OUVERTE',
      modeleSessionId: 'm1',
      verrouillee: false,
      selection: [],
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/sessions', 's1']);
  });

  it('affiche un message d’erreur si la création échoue', () => {
    fixture.componentInstance['equipeId'].set('e1');
    fixture.componentInstance['modeleSessionId'].set('m1');
    fixture.componentInstance['date'].set(new Date('2026-04-01T00:00:00.000Z'));

    const message = TestBed.inject(NzMessageService);
    const erreurSpy = vi.spyOn(message, 'error');

    fixture.componentInstance['creer']();

    httpMock.expectOne('/api/sessions').flush(null, { status: 404, statusText: 'Not Found' });

    expect(erreurSpy).toHaveBeenCalledWith('Impossible de créer cette Session.');
  });
});
