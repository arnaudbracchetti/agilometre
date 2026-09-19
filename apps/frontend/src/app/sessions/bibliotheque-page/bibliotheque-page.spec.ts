import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  BarChartOutline,
  CaretDownOutline,
  CaretUpOutline,
  DeleteOutline,
  DesktopOutline,
  PlayCircleOutline,
  SearchOutline,
} from '@ant-design/icons-angular/icons';
import { StatutSession } from '@agilometre/shared';
import { BibliothequePage } from './bibliotheque-page';
import { CreerPage } from '../creer-page/creer-page';

/** Même choix que dans organisation-page.spec.ts : passer par NgModel plutôt qu'un dispatchEvent('input') natif. */
function saisir(fixture: ReturnType<typeof TestBed.createComponent>, selecteur: string, valeur: string): void {
  const debug = fixture.debugElement.query(By.css(selecteur));
  debug.injector.get(NgModel).viewToModelUpdate(valeur);
  fixture.detectChanges();
}

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
        provideNzIcons([
          DeleteOutline,
          PlayCircleOutline,
          DesktopOutline,
          BarChartOutline,
          CaretUpOutline,
          CaretDownOutline,
          SearchOutline,
        ]),
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
        modeleCollecteNom: 'Diagnostic complet',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Équipe Alpha');
    expect(fixture.nativeElement.textContent).toContain('Diagnostic complet');
  });

  it('affiche "Modèle supprimé" quand modeleCollecteNom est null', () => {
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
        modeleCollecteNom: null,
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
      modeleCollecteNom: 'M',
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
        modeleCollecteNom: 'M',
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

  it('« Créer une session » ouvre CreerPage dans un modal au-dessus de la liste', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([]);
    fixture.detectChanges();

    // `fixture.debugElement.injector` (pas `TestBed.inject`) : NzModalModule fournit
    // NzModalService à l'échelle du composant qui l'importe, pas au niveau racine — même
    // pattern déjà établi dans ajustement-page.spec.ts.
    const modal = fixture.debugElement.injector.get(NzModalService);
    const createSpy = vi
      .spyOn(modal, 'create')
      .mockReturnValue({} as ReturnType<NzModalService['create']>);

    const bouton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Créer une session',
    ) as HTMLButtonElement;
    bouton.click();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: CreerPage, nzFooter: null }),
    );
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
        modeleCollecteNom: 'M',
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
      modeleCollecteId: 'm1',
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
        modeleCollecteNom: 'M',
      },
    ]);
    fixture.detectChanges();

    const lien = fixture.nativeElement.querySelector('a[href="/sessions/s1/pilotage"]');
    expect(lien).toBeTruthy();
  });

  it('affiche un lien « Voir la synthèse » pour une ligne CLOTUREE (carte #52)', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions').flush([
      {
        id: 's1',
        equipeNom: 'Alpha',
        date: '2026-04-01T00:00:00.000Z',
        statut: 'CLOTUREE',
        verrouillee: true,
        nbQuestions: 1,
        modeleCollecteNom: 'M',
      },
    ]);
    fixture.detectChanges();

    const lien = fixture.nativeElement.querySelector('a[href="/sessions/s1/synthese"]');
    expect(lien).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('a[href="/sessions/s1/pilotage"]'),
    ).toBeFalsy();
  });

  // Comme pour `cliquer()`/`noeudEntite()` dans organisation-page.spec.ts : on teste les
  // comparateurs eux-mêmes plutôt que de simuler un clic sur l'en-tête `nz-table`, dont le tri
  // au clic est câblé en interne par la bibliothèque (mécanisme hors du périmètre à tester ici).
  it('trierParEquipe compare les Équipes par ordre alphabétique', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    const trier = fixture.componentInstance['trierParEquipe'] as (a: unknown, b: unknown) => number;

    expect(trier({ equipeNom: 'Alpha' }, { equipeNom: 'Zebra' })).toBeLessThan(0);
    expect(trier({ equipeNom: 'Zebra' }, { equipeNom: 'Alpha' })).toBeGreaterThan(0);
  });

  it('trierParDate compare les dates chronologiquement', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    const trier = fixture.componentInstance['trierParDate'] as (a: unknown, b: unknown) => number;

    expect(
      trier({ date: '2026-04-01T00:00:00.000Z' }, { date: '2026-04-02T00:00:00.000Z' }),
    ).toBeLessThan(0);
  });

  it('trierParNbQuestions compare les comptes numériquement', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    const trier = fixture.componentInstance['trierParNbQuestions'] as (a: unknown, b: unknown) => number;

    expect(trier({ nbQuestions: 2 }, { nbQuestions: 10 })).toBeLessThan(0);
  });

  it('trierParModele traite un Modèle supprimé (null) comme une chaîne vide', () => {
    const fixture = TestBed.createComponent(BibliothequePage);
    const trier = fixture.componentInstance['trierParModele'] as (a: unknown, b: unknown) => number;

    expect(
      trier({ modeleCollecteNom: null }, { modeleCollecteNom: 'Diagnostic complet' }),
    ).toBeLessThan(0);
  });

  it('filtre les lignes par Équipe ou Modèle utilisé', () => {
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
        modeleCollecteNom: 'Diagnostic complet',
      },
      {
        id: 's2',
        equipeNom: 'Marketing',
        date: '2026-04-02T00:00:00.000Z',
        statut: 'OUVERTE',
        verrouillee: false,
        nbQuestions: 1,
        modeleCollecteNom: 'Pouls rapide',
      },
    ]);
    fixture.detectChanges();

    saisir(fixture, '.bibliotheque__recherche-champ', 'alpha');

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Alpha');
    expect(texte).not.toContain('Marketing');
  });

  it('affiche un message dédié quand la recherche ne trouve rien', () => {
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
        modeleCollecteNom: 'M',
      },
    ]);
    fixture.detectChanges();

    saisir(fixture, '.bibliotheque__recherche-champ', 'introuvable');

    expect(fixture.nativeElement.textContent).toContain('Aucun résultat pour « introuvable ».');
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
