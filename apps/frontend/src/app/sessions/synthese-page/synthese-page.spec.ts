import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { convertToParamMap, provideRouter, ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { vi } from 'vitest';
import { SynthesePage } from './synthese-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
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
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge la progression une seule fois (pas de sondage) et affiche chaque Question avec son statut', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
      historique: [],
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
  });

  it('affiche le lien de retour vers le pilotage', () => {
    fixture = TestBed.createComponent(SynthesePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions/s1/pilotage').flush({
      statut: 'OUVERTE',
      code: '654321',
      nbDevicesConnectes: 0,
      questionCourante: null,
      tourOuvert: null,
      historique: [],
      progression: [],
    });
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
    fixture.detectChanges();

    expect(fixture.componentInstance['inaccessible']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Cet écran de synthèse n’est plus accessible.',
    );
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
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      });
      fixture.detectChanges();

      expect(boutonTerminer()).toBeTruthy();
    });

    it('masque le bouton si la Session est déjà CLOTUREE', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'CLOTUREE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      });
      fixture.detectChanges();

      expect(boutonTerminer()).toBeFalsy();
    });

    it('confirme la popconfirm : appelle terminerSession puis navigue vers l’écran de pilotage', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      });
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const bouton = fixture.debugElement
        .queryAll(By.css('button'))
        .find((el) => (el.nativeElement as HTMLElement).textContent?.includes('Terminer la séance'))!;
      bouton.triggerEventHandler('nzOnConfirm', undefined);

      const req = httpMock.expectOne('/api/sessions/s1/terminer');
      expect(req.request.method).toBe('POST');
      req.flush({
        statut: 'CLOTUREE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      });
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(['/sessions', 's1', 'pilotage']);
    });

    it('affiche un message d’erreur si le refus est renvoyé, sans naviguer', () => {
      fixture = TestBed.createComponent(SynthesePage);
      fixture.detectChanges();
      httpMock.expectOne('/api/sessions/s1/pilotage').flush({
        statut: 'OUVERTE',
        code: '654321',
        nbDevicesConnectes: 0,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      });
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
