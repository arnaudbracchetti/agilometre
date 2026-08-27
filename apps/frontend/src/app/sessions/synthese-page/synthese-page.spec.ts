import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { convertToParamMap, provideRouter, ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { WarningOutline } from '@ant-design/icons-angular/icons';
import { vi } from 'vitest';
import { PilotageSessionDto, StatutSession, SyntheseSessionDto, SyntheseThemeDto } from '@agilometre/shared';
import { GlossaireSynthese } from './glossaire-synthese';
import { SynthesePage } from './synthese-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
  };
}

const SYNTHESE_PAR_DEFAUT: SyntheseSessionDto = {
  equipeNom: 'Équipe Filière',
  date: '2026-08-15T00:00:00.000Z',
  code: '654321',
  statut: StatutSession.Ouverte,
  seuilPalier: 0.6,
  themes: [],
  palierGlobal: null,
  tauxApprocheGlobal: null,
  margeAvantDescenteGlobal: null,
  effectifGlobal: 0,
};

function theme(overrides: Partial<SyntheseThemeDto> = {}): SyntheseThemeDto {
  return {
    themeId: 't1',
    libelle: 'Thème collaboration',
    position: 0,
    palier: 3,
    tauxApproche: 0.8,
    margeAvantDescente: 0.4,
    effectif: 4,
    questions: [
      {
        questionId: 'q1',
        libelle: 'Question sur le daily',
        effectif: 4,
        moyenne: 2.357142857142857,
        consensus: 'MODERE',
        repartition: { 1: 0, 2: 2, 3: 2, 4: 0 },
      },
    ],
    ...overrides,
  };
}

describe('SynthesePage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<SynthesePage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SynthesePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('s1') },
        // Sans ça, nz-icon (alerte de Marge avant descente) tente de récupérer le SVG via HTTP
        // (assets/outline/warning.svg), ce que HttpTestingController rejette comme requête non
        // attendue — même pattern que pilotage-page.spec.ts.
        provideNzIcons([WarningOutline]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function repondre(synthese: Partial<SyntheseSessionDto> = {}): void {
    httpMock
      .expectOne('/api/sessions/s1/synthese')
      .flush({ ...SYNTHESE_PAR_DEFAUT, ...synthese });
  }

  it("ne fait qu'un seul appel réseau, à /synthese (plus de forkJoin avec /pilotage)", () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();

    repondre();
    fixture.detectChanges();

    httpMock.expectNone('/api/sessions/s1/pilotage');
  });

  it('affiche « Synthèse de la séance du » suivi de la date dans le titre', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    const titre = fixture.nativeElement.querySelector('.synthese__titre') as HTMLElement;
    expect(titre.textContent).toContain('Synthèse de la séance du');
    expect(titre.textContent).toContain('15/08/2026');
  });

  it('affiche le nom de l’Équipe en sous-titre', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    const sousTitre = fixture.nativeElement.querySelector('.synthese__sous-titre') as HTMLElement;
    expect(sousTitre.textContent).toContain('Équipe Filière');
  });

  it('affiche le lien de retour vers le pilotage', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    const lien = fixture.nativeElement.querySelector('a[href="/sessions/s1/pilotage"]');
    expect(lien).toBeTruthy();
  });

  it('affiche un message d’erreur si l’écran n’est plus accessible', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/sessions/s1/synthese')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.componentInstance['inaccessible']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Cet écran de synthèse n’est plus accessible.',
    );
  });

  it('« Comprendre les résultats » ouvre le glossaire dans un modal, avec le Seuil de cette instance', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();
    repondre();
    fixture.detectChanges();

    // `fixture.debugElement.injector` (pas `TestBed.inject`) : NzModalModule fournit
    // NzModalService à l'échelle du composant qui l'importe, pas au niveau racine — même pattern
    // déjà établi dans bibliotheque-page.spec.ts.
    const modal = fixture.debugElement.injector.get(NzModalService);
    const createSpy = vi
      .spyOn(modal, 'create')
      .mockReturnValue({} as ReturnType<NzModalService['create']>);

    const bouton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.includes('Comprendre les résultats'),
    ) as HTMLButtonElement;
    bouton.click();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nzContent: GlossaireSynthese,
        nzData: { seuilPalierPourcent: 60 },
        nzFooter: null,
      }),
    );
  });

  describe('Palier par Thème et lecture fine (carte #52)', () => {
    it('affiche un Palier par Thème traité, avec la Moyenne arrondie et le cran de consensus par Question une fois le Thème déplié', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ themes: [theme()] });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Thème collaboration');
      expect(texte).toContain('Palier 3');
      // Replié par défaut : le drill-down par Question ne s'affiche qu'après dépli.
      expect(texte).not.toContain('Question sur le daily');

      (fixture.nativeElement.querySelector('.synthese__theme-entete') as HTMLElement).click();
      fixture.detectChanges();

      const texteDeplie = fixture.nativeElement.textContent as string;
      expect(texteDeplie).toContain('Question sur le daily');
      // Arrondi à 1 décimale (Règle du Chiffre Mono) — jamais le flottant brut 2.357142857142857.
      expect(texteDeplie).toContain('Moyenne 2.4');
      expect(texteDeplie).not.toContain('2.357142857142857');
      expect(texteDeplie).toContain('Consensus modéré');
    });

    it('replie et déplie le contenu d’un Thème au clic sur son en-tête, replié par défaut', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ themes: [theme()] });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Question sur le daily');

      const entete = fixture.nativeElement.querySelector('.synthese__theme-entete') as HTMLElement;
      expect(entete.getAttribute('aria-expanded')).toBe('false');

      entete.click();
      fixture.detectChanges();
      expect(entete.getAttribute('aria-expanded')).toBe('true');
      expect(fixture.nativeElement.textContent).toContain('Question sur le daily');
      expect(fixture.nativeElement.textContent).toContain('Thème collaboration');

      entete.click();
      fixture.detectChanges();
      expect(entete.getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.textContent).not.toContain('Question sur le daily');
    });

    it('affiche le Taux d’approche et la Marge avant descente du Thème (P0 : ne plus les jeter)', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ themes: [theme({ tauxApproche: 0.941, margeAvantDescente: 0.138 })] });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('94 %');
      expect(texte).toContain('14 %');
    });

    it('trie les Thèmes par Taux d’approche décroissant, Palier max puis "Aucune donnée" en dernier', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({
        themes: [
          theme({ themeId: 'faible', libelle: 'Faible approche', position: 0, tauxApproche: 0.2 }),
          theme({ themeId: 'nulle', libelle: 'Sans donnée', position: 1, palier: null, tauxApproche: null, margeAvantDescente: null, effectif: 0, questions: [] }),
          theme({ themeId: 'forte', libelle: 'Forte approche', position: 2, tauxApproche: 0.9 }),
          theme({ themeId: 'max', libelle: 'Palier maximal', position: 3, palier: 4, tauxApproche: null }),
        ],
      });
      fixture.detectChanges();

      const libelles = Array.from(
        fixture.nativeElement.querySelectorAll('.synthese__theme-libelle'),
      ).map((el) => (el as HTMLElement).textContent);
      expect(libelles).toEqual(['Forte approche', 'Faible approche', 'Palier maximal', 'Sans donnée']);
    });

    it("n'affiche aucun bloc Thème quand la synthèse est vide, avec un état vide explicite", () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ themes: [] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.synthese__themes')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Aucune réponse enregistrée sur cette séance.');
    });

    it('affiche le compte de Questions répondues et de Réponses par Thème et au global', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({
        themes: [
          theme(),
          theme({
            themeId: 't2',
            libelle: 'Thème communication',
            position: 1,
            palier: 2,
            tauxApproche: 0.5,
            margeAvantDescente: 0.5,
            effectif: 5,
            questions: [
              {
                questionId: 'q2',
                libelle: 'Question sur les rétros',
                effectif: 3,
                moyenne: 2,
                consensus: 'FAIBLE',
                repartition: { 1: 1, 2: 1, 3: 1, 4: 0 },
              },
              {
                questionId: 'q3',
                libelle: 'Question sur les démos',
                effectif: 2,
                moyenne: 3,
                consensus: 'FORT',
                repartition: { 1: 0, 2: 0, 3: 2, 4: 0 },
              },
            ],
          }),
        ],
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('3');
      expect(texte).toContain('Questions répondues');
      expect(texte).toContain('9');
      expect(texte).toContain('Réponses totales');
      expect(texte).toContain('1 question');
      expect(texte).toContain('4 réponses');
      expect(texte).toContain('2 questions');
      expect(texte).toContain('5 réponses');
    });

    it('affiche le Palier global de la séance dans la bande de compteurs', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({
        themes: [theme()],
        palierGlobal: 3,
        tauxApprocheGlobal: 0.941,
        margeAvantDescenteGlobal: 0.138,
        effectifGlobal: 9,
      });
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Palier global');
      expect(texte).toContain('Palier 3');
      expect(texte).toContain('94 %');
      expect(texte).toContain('14 %');
    });

    it("affiche 'Aucune donnée' pour le Palier global quand la séance n'a reçu aucune Réponse scorable", () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({
        themes: [theme({ palier: null, tauxApproche: null, margeAvantDescente: null, effectif: 0, questions: [] })],
        palierGlobal: null,
        tauxApprocheGlobal: null,
        margeAvantDescenteGlobal: null,
        effectifGlobal: 0,
      });
      fixture.detectChanges();

      const stat = fixture.nativeElement.querySelector('.synthese__stat') as HTMLElement;
      expect(stat.textContent).toContain('Palier global');
      expect(stat.textContent).toContain('Aucune donnée');
    });

    it("affiche 'Aucune donnée' pour un Thème sans Réponse, sans drill-down par Question", () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({
        themes: [
          theme(),
          theme({
            themeId: 't2',
            libelle: 'Thème sans vote',
            position: 1,
            palier: null,
            tauxApproche: null,
            margeAvantDescente: null,
            effectif: 0,
            questions: [],
          }),
        ],
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Thème sans vote');
      expect(fixture.nativeElement.textContent).toContain('Aucune donnée');
      expect(fixture.nativeElement.textContent).not.toContain('Palier null');

      // Le message vide vit dans le contenu repliable, replié par défaut : il faut déplier le
      // Thème « Thème sans vote » (2e entête, trié après le Thème traité) pour le voir.
      const entetes = fixture.nativeElement.querySelectorAll('.synthese__theme-entete');
      (entetes[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Aucune réponse enregistrée sur ce Thème.');
    });

    it("n'affiche plus la liste Traitée/Sautée (retirée, superset déjà présent sur le pilotage)", () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ themes: [theme()] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.synthese__liste')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Sautée');
    });
  });

  describe('Terminer la séance (carte G1)', () => {
    function boutonTerminer(): HTMLButtonElement {
      return Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
        (b as HTMLButtonElement).textContent?.includes('Terminer la séance'),
      ) as HTMLButtonElement;
    }

    it('affiche le bouton quand la Session est encore OUVERTE', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ statut: StatutSession.Ouverte });
      fixture.detectChanges();

      expect(boutonTerminer()).toBeTruthy();
    });

    it('masque le bouton si la Session est déjà CLOTUREE', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ statut: StatutSession.Cloturee });
      fixture.detectChanges();

      expect(boutonTerminer()).toBeFalsy();
    });

    it('confirme la popconfirm : appelle terminerSession puis navigue vers l’écran de pilotage', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ statut: StatutSession.Ouverte });
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const bouton = fixture.debugElement
        .queryAll(By.css('button'))
        .find((el) => (el.nativeElement as HTMLElement).textContent?.includes('Terminer la séance'))!;
      bouton.triggerEventHandler('nzOnConfirm', undefined);

      const req = httpMock.expectOne('/api/sessions/s1/terminer');
      expect(req.request.method).toBe('POST');
      const pilotageApresTerminaison: PilotageSessionDto = {
        statut: StatutSession.Cloturee,
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        dernierTourClos: null,
        historique: [],
        progression: [],
      };
      req.flush(pilotageApresTerminaison);
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(['/sessions', 's1', 'pilotage']);
    });

    it('affiche un message d’erreur si le refus est renvoyé, sans naviguer', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({ statut: StatutSession.Ouverte });
      fixture.detectChanges();
      const messageService = fixture.debugElement.injector.get(NzMessageService);
      const errorSpy = vi.spyOn(messageService, 'error');
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const bouton = fixture.debugElement
        .queryAll(By.css('button'))
        .find((el) => (el.nativeElement as HTMLElement).textContent?.includes('Terminer la séance'))!;
      bouton.triggerEventHandler('nzOnConfirm', undefined);

      httpMock
        .expectOne('/api/sessions/s1/terminer')
        .flush('Refusé', { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
