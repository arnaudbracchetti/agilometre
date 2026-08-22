import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { convertToParamMap, provideRouter, ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { vi } from 'vitest';
import { PilotageSessionDto, StatutSession, SyntheseSessionDto } from '@agilometre/shared';
import { SynthesePage } from './synthese-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
  };
}

const PILOTAGE_PAR_DEFAUT: PilotageSessionDto = {
  statut: StatutSession.Ouverte,
  code: '654321',
  nbDevicesConnectes: 0,
  questionCourante: null,
  tourOuvert: null,
  dernierTourClos: null,
  historique: [],
  progression: [],
};

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
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function repondre(
    pilotage: Partial<PilotageSessionDto> = {},
    synthese: SyntheseSessionDto = { themes: [] },
  ): void {
    httpMock
      .expectOne('/api/sessions/s1/pilotage')
      .flush({ ...PILOTAGE_PAR_DEFAUT, ...pilotage });
    httpMock.expectOne('/api/sessions/s1/synthese').flush(synthese);
  }

  it('charge la progression une seule fois (pas de sondage) et affiche chaque Question avec son statut', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();

    repondre({
      progression: [
        { questionId: 'q1', libelle: 'Question traitée', statut: 'TRAITEE', reactivable: false },
        { questionId: 'q2', libelle: 'Question sautée', statut: 'SAUTEE', reactivable: false },
      ],
    });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Question traitée');
    expect(texte).toContain('Traitée');
    expect(texte).toContain('Question sautée');
    expect(texte).toContain('Sautée');
    httpMock.expectNone('/api/sessions/s1/pilotage');
    httpMock.expectNone('/api/sessions/s1/synthese');
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
      .expectOne('/api/sessions/s1/pilotage')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    // forkJoin annule la requête synthese dès que pilotage échoue — pas de second flush à faire.
    httpMock.expectOne('/api/sessions/s1/synthese');
    fixture.detectChanges();

    expect(fixture.componentInstance['inaccessible']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Cet écran de synthèse n’est plus accessible.',
    );
  });

  describe('Palier par Thème et lecture fine (carte #52)', () => {
    function syntheseAUnTheme(): SyntheseSessionDto {
      return {
        themes: [
          {
            themeId: 't1',
            libelle: 'Thème collaboration',
            palier: 3,
            tauxApproche: 0.8,
            margeAvantDescente: 0.2,
            effectif: 4,
            questions: [
              {
                questionId: 'q1',
                libelle: 'Question sur le daily',
                effectif: 4,
                moyenne: 2.5,
                consensus: 'MODERE',
                repartition: { 1: 0, 2: 2, 3: 2, 4: 0 },
              },
            ],
          },
        ],
      };
    }

    it('affiche un Palier par Thème traité, avec la Moyenne et le cran de consensus par Question', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({}, syntheseAUnTheme());
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      expect(texte).toContain('Thème collaboration');
      expect(texte).toContain('Palier 3');
      expect(texte).toContain('Question sur le daily');
      expect(texte).toContain('Moyenne 2.5');
      expect(texte).toContain('Consensus modéré');
    });

    it('affiche la répartition en % par Niveau sous chaque Question', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({}, syntheseAUnTheme());
      fixture.detectChanges();

      const texte = fixture.nativeElement.textContent as string;
      // 2/4 = 50 % pour les Niveaux 2 et 3, 0 % pour 1 et 4.
      expect(texte).toContain('Niveau 2');
      expect(texte).toContain('50 %');
      expect(texte).toContain('Niveau 1');
      expect(texte).toContain('0 %');
    });

    it("n'affiche aucun bloc Thème quand la synthèse est vide", () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      repondre({}, { themes: [] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('nz-collapse')).toBeNull();
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
      req.flush({ ...PILOTAGE_PAR_DEFAUT, statut: StatutSession.Cloturee });
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
