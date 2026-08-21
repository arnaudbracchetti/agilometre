import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AideMenu } from './aide-menu';

describe('AideMenu', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<AideMenu>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AideMenu],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AideMenu);
    fixture.componentRef.setInput('jeton', 'jeton-abc');
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function bouton(texte: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes(texte),
    ) as HTMLButtonElement | undefined;
  }

  it('le panneau est fermé par défaut', () => {
    expect(fixture.nativeElement.querySelector('.aide-menu__panneau')).toBeFalsy();
  });

  it('ouvrir() interroge /api/participant/info-session avec le Jeton et affiche Équipe + date', () => {
    fixture.componentInstance['ouvrir']();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/participant/info-session');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-abc');
    req.flush({ equipeNom: 'Les Mangoustes', ouvertureLe: '2026-08-21T09:00:00.000Z' });
    fixture.detectChanges();

    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Les Mangoustes');
    expect(fixture.nativeElement.querySelector('.aide-menu__panneau')).toBeTruthy();
  });

  it('fermer() referme le panneau', () => {
    fixture.componentInstance['ouvrir']();
    httpMock
      .expectOne('/api/participant/info-session')
      .flush({ equipeNom: 'Les Mangoustes', ouvertureLe: null });
    fixture.detectChanges();

    fixture.componentInstance['fermer']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.aide-menu__panneau')).toBeFalsy();
  });

  it('« Se déconnecter » demande confirmation puis émet deconnexion() si confirmé', () => {
    fixture.componentInstance['ouvrir']();
    httpMock
      .expectOne('/api/participant/info-session')
      .flush({ equipeNom: 'Les Mangoustes', ouvertureLe: null });
    fixture.detectChanges();

    const modal = fixture.debugElement.injector.get(NzModalService);
    const confirmSpy = vi.spyOn(modal, 'confirm');
    const deconnexionSpy = vi.fn();
    fixture.componentInstance.deconnexion.subscribe(deconnexionSpy);

    bouton('Se déconnecter')?.click();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(deconnexionSpy).not.toHaveBeenCalled();

    const config = confirmSpy.mock.calls[0]?.[0];
    (config?.nzOnOk as (() => void) | undefined)?.();
    fixture.detectChanges();

    expect(deconnexionSpy).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.aide-menu__panneau')).toBeFalsy();
  });

  it('un 401 sur /api/participant/info-session émet sessionRejetee (carte #47)', () => {
    const sessionRejeteeSpy = vi.fn();
    fixture.componentInstance.sessionRejetee.subscribe(sessionRejeteeSpy);

    fixture.componentInstance['ouvrir']();
    httpMock
      .expectOne('/api/participant/info-session')
      .flush('Jeton invalide', { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(sessionRejeteeSpy).toHaveBeenCalledTimes(1);
  });
});
