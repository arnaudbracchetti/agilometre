import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzFormatEmitEvent } from 'ng-zorro-antd/tree';
import {
  ApartmentOutline,
  SearchOutline,
  TeamOutline,
  UserOutline,
  WarningOutline,
} from '@ant-design/icons-angular/icons';
import { vi } from 'vitest';
import { DroitsService } from '../../auth/droits.service';
import { ArbreOrganisation } from '../arbre-organisation/arbre-organisation';
import { ProfilPage } from './profil-page';

describe('ProfilPage', () => {
  let httpMock: HttpTestingController;

  function creerFixture() {
    return TestBed.configureTestingModule({
      imports: [ProfilPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzIcons([ApartmentOutline, TeamOutline, UserOutline, SearchOutline, WarningOutline]),
        // Comportement non restreint de l'arbre (sélection d'Équipe) — la restriction Direction
        // est couverte séparément par arbre-organisation.spec.ts.
        { provide: DroitsService, useValue: { peut: () => true } },
      ],
    })
      .compileComponents()
      .then(() => TestBed.createComponent(ProfilPage));
  }

  afterEach(() => {
    httpMock?.verify();
  });

  it('invite à sélectionner une Équipe ou une Entité tant qu’aucun Profil n’est affiché', async () => {
    const fixture = await creerFixture();
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sélectionnez une Équipe ou une Entité');
  });

  it('sélectionner une Équipe dans l’arbre navigue vers son Profil', async () => {
    const fixture = await creerFixture();
    httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    const arbre = fixture.debugElement.query(By.directive(ArbreOrganisation))
      .componentInstance as ArbreOrganisation;
    (arbre as unknown as { onNodeClick(e: NzFormatEmitEvent): void }).onNodeClick({
      eventName: 'click',
      node: { key: 'e1', origin: { type: 'entite' } },
    } as unknown as NzFormatEmitEvent);
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();

    (arbre as unknown as { onNodeClick(e: NzFormatEmitEvent): void }).onNodeClick({
      eventName: 'click',
      node: { key: 'eq1', origin: { type: 'equipe' } },
    } as unknown as NzFormatEmitEvent);
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/profil/equipe', 'eq1']);
  });

  it('sélectionner une Entité dans l’arbre navigue vers son Profil agrégé', async () => {
    const fixture = await creerFixture();
    httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    const arbre = fixture.debugElement.query(By.directive(ArbreOrganisation))
      .componentInstance as ArbreOrganisation;
    (arbre as unknown as { onNodeClick(e: NzFormatEmitEvent): void }).onNodeClick({
      eventName: 'click',
      node: { key: 'e1', origin: { type: 'entite' } },
    } as unknown as NzFormatEmitEvent);
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/profil/entite', 'e1']);
  });
});
