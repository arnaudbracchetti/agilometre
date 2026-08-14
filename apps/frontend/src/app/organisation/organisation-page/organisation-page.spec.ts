import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { OrganisationPage } from './organisation-page';

/**
 * Simule la saisie utilisateur en passant par NgModel.viewToModelUpdate plutôt que par un
 * dispatchEvent('input') natif : dans ce projet, les événements DOM synthétiques ne traversent
 * pas le mécanisme d'écoute d'Angular en dehors d'un bootstrap applicatif complet (vérifié en
 * isolant le problème — dispatchEvent('input') n'atteint aucun listener compilé, y compris ceux
 * de ng-zorro-antd, alors que viewToModelUpdate déclenche exactement la même chaîne
 * (ngModelChange → mise à jour du signal) que le ferait un DefaultValueAccessor réel.
 */
function saisir(fixture: ReturnType<typeof TestBed.createComponent>, selecteur: string, valeur: string): void {
  const debug = fixture.debugElement.query(By.css(selecteur));
  debug.injector.get(NgModel).viewToModelUpdate(valeur);
  fixture.detectChanges();
}

describe('OrganisationPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganisationPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge et affiche la liste des Entités au démarrage', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();

    httpMock.expectOne('/api/organisation/entites').flush([
      { id: 'e1', nom: 'DSI' },
      { id: 'e2', nom: 'Marketing' },
    ]);
    fixture.detectChanges();

    const noms = fixture.nativeElement.querySelectorAll('.organisation__item');
    expect(noms.length).toBe(2);
    expect(noms[0].textContent).toContain('DSI');
  });

  it('affiche l’Entité créée, sélectionnée, après soumission du formulaire de création', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    saisir(fixture, '.organisation__creation input', 'Achats');

    const formDebug = fixture.debugElement.query(By.css('.organisation__creation'));
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/entites');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Achats' });
    req.flush({ id: 'e3', nom: 'Achats' });
    fixture.detectChanges();

    const detailTitre: HTMLElement = fixture.nativeElement.querySelector(
      '.organisation__detail .organisation__titre',
    );
    expect(detailTitre.textContent).toContain('Achats');
  });

  it('renomme l’Entité sélectionnée après soumission du formulaire de renommage', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    const item = fixture.debugElement.query(By.css('.organisation__item'));
    item.triggerEventHandler('click', null);
    fixture.detectChanges();

    saisir(fixture, '.organisation__renommage input', 'Direction des Systèmes d’Information');

    const formDebug = fixture.debugElement.query(By.css('.organisation__renommage'));
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/entites/e1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Direction des Systèmes d’Information' });
    req.flush({ id: 'e1', nom: 'Direction des Systèmes d’Information' });
    fixture.detectChanges();

    const item2 = fixture.nativeElement.querySelector('.organisation__item');
    expect(item2.textContent).toContain('Direction des Systèmes d’Information');
  });

  it('affiche un message dédié en cas de doublon (409) à la création', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    const message = TestBed.inject(NzMessageService);
    const erreurSpy = vi.spyOn(message, 'error');

    saisir(fixture, '.organisation__creation input', 'DSI');
    const formDebug = fixture.debugElement.query(By.css('.organisation__creation'));
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/entites');
    req.flush(
      { message: 'Une Entité porte déjà ce nom' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(erreurSpy).toHaveBeenCalledWith('Une Entité porte déjà ce nom.');
  });

  it('affiche un message dédié en cas de doublon (409) au renommage', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    const item = fixture.debugElement.query(By.css('.organisation__item'));
    item.triggerEventHandler('click', null);
    fixture.detectChanges();

    const message = TestBed.inject(NzMessageService);
    const erreurSpy = vi.spyOn(message, 'error');

    saisir(fixture, '.organisation__renommage input', 'Marketing');
    const formDebug = fixture.debugElement.query(By.css('.organisation__renommage'));
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/entites/e1');
    req.flush(
      { message: 'Une Entité porte déjà ce nom' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(erreurSpy).toHaveBeenCalledWith('Une Entité porte déjà ce nom.');
  });
});
