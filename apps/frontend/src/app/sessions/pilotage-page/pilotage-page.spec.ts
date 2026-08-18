import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PilotagePage } from './pilotage-page';

function activatedRouteAvecId(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) } as ActivatedRoute['snapshot'],
  };
}

describe('PilotagePage', () => {
  let httpMock: HttpTestingController;
  let fixture: ReturnType<typeof TestBed.createComponent<PilotagePage>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PilotagePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: activatedRouteAvecId('s1') },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('affiche le Code et le lien vers la projection une fois le pilotage chargé', () => {
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();

    httpMock.expectOne('/api/sessions/s1/pilotage').flush({ statut: 'OUVERTE', code: '654321' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('654321');
    const lien = fixture.nativeElement.querySelector('a[href="/projection/s1"]');
    expect(lien).toBeTruthy();
  });

  it('sonde /api/sessions/:id/pilotage toutes les 2 secondes', () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/sessions/s1/pilotage').flush({ statut: 'OUVERTE', code: '654321' });

    vi.advanceTimersByTime(2000);

    httpMock.expectOne('/api/sessions/s1/pilotage').flush({ statut: 'OUVERTE', code: '654321' });
  });

  it('affiche un message d’erreur si le pilotage n’est plus accessible', () => {
    fixture = TestBed.createComponent(PilotagePage);
    fixture.detectChanges();
    const messageService = fixture.debugElement.injector.get(NzMessageService);
    const errorSpy = vi.spyOn(messageService, 'error');

    httpMock
      .expectOne('/api/sessions/s1/pilotage')
      .flush('Introuvable', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['inaccessible']()).toBe(true);
  });
});
