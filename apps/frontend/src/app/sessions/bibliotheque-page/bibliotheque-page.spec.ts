import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { DeleteOutline, DesktopOutline, PlayCircleOutline } from '@ant-design/icons-angular/icons';
import { StatutSession } from '@agilometre/shared';
import { BibliothequePage } from './bibliotheque-page';

describe('BibliothequePage (Sessions)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibliothequePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        // Sans ça, nz-icon tente de récupérer les SVG via HTTP (assets/outline/*.svg), ce que
        // HttpTestingController rejette comme requête non attendue — mêmes icônes qu'app.config.ts.
        provideNzIcons([DeleteOutline, PlayCircleOutline, DesktopOutline]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge et affiche les lignes au démarrage', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Équipe Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'OUVERTE',
        verrouillee: false,
        nbQuestions: 3,
        modeleSessionNom: 'Diagnostic complet',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Équipe Alpha');
    expect(fixture.nativeElement.textContent).toContain('Diagnostic complet');
  });

  it('affiche "Modèle supprimé" quand modeleSessionNom est null', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Équipe Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'CLOTUREE',
        verrouillee: false,
        nbQuestions: 1,
        modeleSessionNom: null,
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Modèle supprimé');
  });

  it('estSupprimable — faux si verrouillée ou clôturée, vrai sinon', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([]);
    fixture.detectChanges();

    const ligneOuverte = {
      id: 's1',
      equipeNom: 'Alpha',
      date: '2026-04-01T00:00:00.000Z',
      statut: StatutSession.Ouverte,
      verrouillee: false,
      nbQuestions: 1,
      modeleSessionNom: 'M',
    };

    expect(fixture.componentInstance['estSupprimable'](ligneOuverte)).toBe(true);
    expect(
      fixture.componentInstance['estSupprimable']({ ...ligneOuverte, verrouillee: true }),
    ).toBe(false);
    expect(
      fixture.componentInstance['estSupprimable']({
        ...ligneOuverte,
        statut: StatutSession.Cloturee,
      }),
    ).toBe(false);
  });

  it('supprimer — appelle le service puis rafraîchit la liste', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'OUVERTE',
        verrouillee: false,
        nbQuestions: 1,
        modeleSessionNom: 'M',
      },
    ]);
    fixture.detectChanges();

    fixture.componentInstance['supprimer']('s1');

    const reqSuppression = httpMock.expectOne('/api/sessions/s1');
    expect(reqSuppression.request.method).toBe('DELETE');
    reqSuppression.flush(null);

    httpMock.expectOne('/api/sessions').flush([]);

    expect(fixture.componentInstance['lignes']()).toEqual([]);
  });

  it('navigue vers /sessions/:id au clic sur une ligne', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([]);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['voirDetail']('s1');

    expect(navigateSpy).toHaveBeenCalledWith(['/sessions', 's1']);
  });

  it('affiche le bouton « Ouvrir la séance » pour une ligne PREPAREE et lance la Session au clic', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'PREPAREE',
        verrouillee: false,
        nbQuestions: 1,
        modeleSessionNom: 'M',
      },
    ]);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const boutonLancer = fixture.nativeElement.querySelector(
      'button[nztooltiptitle="Ouvrir la séance"]',
    ) as HTMLButtonElement;
    expect(boutonLancer).toBeTruthy();
    boutonLancer.click();

    const reqOuvrir = httpMock.expectOne('/api/sessions/s1/ouvrir');
    expect(reqOuvrir.request.method).toBe('POST');
    reqOuvrir.flush({
      id: 's1',
      equipeId: 'e1',
      equipeNom: 'Alpha',
      entiteId: 'ent1',
      date: '2026-04-01T00:00:00.000Z',
      statut: 'OUVERTE',
      modeleSessionId: 'm1',
      verrouillee: true,
      code: '1234',
      selection: [],
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/sessions', 's1', 'pilotage']);
  });

  it('affiche un lien « Piloter la séance » pour une ligne OUVERTE', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'OUVERTE',
        verrouillee: true,
        nbQuestions: 1,
        modeleSessionNom: 'M',
      },
    ]);
    fixture.detectChanges();

    const lien = fixture.nativeElement.querySelector('a[href="/sessions/s1/pilotage"]');
    expect(lien).toBeTruthy();
  });

  it('affiche un message d’erreur si le chargement échoue', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();

    const message = TestBed.inject(NzMessageService);
    const erreurSpy = vi.spyOn(message, 'error');

    httpMock.expectOne('/api/sessions').flush(null, { status: 500, statusText: 'Server Error' });

    expect(erreurSpy).toHaveBeenCalledWith('Impossible de charger la liste des Sessions.');
  });
});
