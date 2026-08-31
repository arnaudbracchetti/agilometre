import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzFormatEmitEvent } from 'ng-zorro-antd/tree';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { ApartmentOutline, SearchOutline, TeamOutline, UserOutline } from '@ant-design/icons-angular/icons';
import { DroitsService } from '../../auth/droits.service';
import { ArbreOrganisation } from './arbre-organisation';

/**
 * Simule un clic sur un nœud de l'arbre en invoquant directement le handler du composant plutôt
 * qu'en simulant un clic DOM réel : nz-tree gère lui-même le déclenchement de (nzClick) via sa
 * propre arborescence interne de composants, hors du périmètre à tester ici.
 */
function noeudEntite(key: string): NzFormatEmitEvent {
  return { eventName: 'click', node: { key, origin: { type: 'entite' } } } as unknown as NzFormatEmitEvent;
}

function noeudEquipe(key: string): NzFormatEmitEvent {
  return { eventName: 'click', node: { key, origin: { type: 'equipe' } } } as unknown as NzFormatEmitEvent;
}

function noeudMembre(key: string): NzFormatEmitEvent {
  return { eventName: 'click', node: { key, origin: { type: 'membre' } } } as unknown as NzFormatEmitEvent;
}

function noeudRacine(): NzFormatEmitEvent {
  return {
    eventName: 'click',
    node: { key: '__racine__', origin: { type: 'racine' } },
  } as unknown as NzFormatEmitEvent;
}

function cliquer(component: ArbreOrganisation, event: NzFormatEmitEvent): void {
  (component as unknown as { onNodeClick(e: NzFormatEmitEvent): void }).onNodeClick(event);
}

/** Simule un clic sur la flèche d'expansion d'un nœud Entité (distinct d'un clic sur son nom). */
function deplierNoeudEntite(component: ArbreOrganisation, key: string): void {
  const event = {
    eventName: 'expand',
    node: { key, isExpanded: true, origin: { type: 'entite' } },
  } as unknown as NzFormatEmitEvent;
  (component as unknown as { onNodeExpand(e: NzFormatEmitEvent): void }).onNodeExpand(event);
}

function saisirFiltre(component: ArbreOrganisation, valeur: string): void {
  (component as unknown as { onFiltreChange(v: string): void }).onFiltreChange(valeur);
}

describe('ArbreOrganisation', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArbreOrganisation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNzIcons([ApartmentOutline, TeamOutline, UserOutline, SearchOutline]),
        // Comportement Coach (non restreint) par défaut — voir le describe dédié plus bas pour
        // la restriction Direction (#61).
        { provide: DroitsService, useValue: { peut: () => true } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('charge et affiche les Entités au démarrage', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([
      { id: 'e1', nom: 'DSI' },
      { id: 'e2', nom: 'Marketing' },
    ]);
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('DSI');
    expect(arbre.textContent).toContain('Marketing');
  });

  it('sélectionner une Entité expose son DTO et déclenche le chargement de ses Équipes', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    cliquer(component, noeudEntite('e1'));
    const req = httpMock.expectOne('/api/organisation/entites/e1/equipes');
    req.flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();

    const selection = component.selectionActuelle();
    expect(selection.type).toBe('entite');
    if (selection.type !== 'entite') return;
    expect(selection.entite.nom).toBe('DSI');
    expect(selection.nombreEquipes).toBe(1);
  });

  it('déplier une Entité via la flèche charge ses Équipes, comme un clic sur son nom', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    deplierNoeudEntite(component, 'e1');
    const req = httpMock.expectOne('/api/organisation/entites/e1/equipes');
    req.flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('Alpha');
  });

  it('sélectionner une Équipe expose son DTO, sans requête réseau supplémentaire', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(component, noeudEntite('e1'));
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();

    cliquer(component, noeudEquipe('eq1'));
    fixture.detectChanges();

    httpMock.verify();
    const selection = component.selectionActuelle();
    expect(selection.type).toBe('equipe');
    if (selection.type !== 'equipe') return;
    expect(selection.equipe.nom).toBe('Alpha');
  });

  it('sélectionner un Membre expose son DTO et l’identifiant de son Équipe', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(component, noeudEntite('e1'));
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([
      {
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [{ id: 'm1', nom: 'Jean Dupont', email: 'jean@example.com', utilisateurId: null }],
      },
    ]);
    fixture.detectChanges();

    cliquer(component, noeudMembre('m1'));
    fixture.detectChanges();

    const selection = component.selectionActuelle();
    expect(selection.type).toBe('membre');
    if (selection.type !== 'membre') return;
    expect(selection.membre.nom).toBe('Jean Dupont');
    expect(selection.equipeId).toBe('eq1');
  });

  it('cliquer sur la racine de l’arbre repasse la sélection en mode racine', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(component, noeudEntite('e1'));
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    fixture.detectChanges();

    cliquer(component, noeudRacine());
    fixture.detectChanges();

    expect(component.selectionActuelle().type).toBe('racine');
  });

  it('le filtre de recherche ne garde que les Entités correspondantes, en chargeant les Équipes des autres Entités pour pouvoir filtrer dessus', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([
      { id: 'e1', nom: 'DSI' },
      { id: 'e2', nom: 'Marketing' },
    ]);
    fixture.detectChanges();

    saisirFiltre(component, 'dsi');
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    httpMock.expectOne('/api/organisation/entites/e2/equipes').flush([]);
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('DSI');
    expect(arbre.textContent).not.toContain('Marketing');
  });

  it('surligne uniquement les nœuds qui correspondent directement au terme recherché, pas leurs ancêtres affichés pour le contexte', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    saisirFiltre(component, 'alpha');
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();

    const titres = Array.from(
      fixture.nativeElement.querySelectorAll('.arbre-organisation__noeud-titre'),
    ) as HTMLElement[];
    const titreDsi = titres.find((t) => t.textContent?.includes('DSI'))!;
    const titreAlpha = titres.find((t) => t.textContent?.includes('Alpha'))!;

    expect(titreDsi.classList).not.toContain('arbre-organisation__noeud-titre--correspond');
    expect(titreAlpha.classList).toContain('arbre-organisation__noeud-titre--correspond');
  });

  it('affiche un message dédié quand la recherche ne trouve rien', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    saisirFiltre(component, 'introuvable');
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    fixture.detectChanges();

    const message: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__recherche-vide');
    expect(message.textContent).toContain('introuvable');
    expect(fixture.nativeElement.querySelector('.arbre-organisation__tree')).toBeFalsy();
  });

  it('sélectionner une Équipe puis la retirer via `retirerEquipe` fait retomber la sélection en racine', () => {
    const fixture = TestBed.createComponent(ArbreOrganisation);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(component, noeudEntite('e1'));
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();
    cliquer(component, noeudEquipe('eq1'));
    fixture.detectChanges();

    component.retirerEquipe('e1', 'eq1');
    fixture.detectChanges();

    expect(component.selectionActuelle().type).toBe('racine');
  });

  describe('restreint à une Direction (#61)', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ArbreOrganisation],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideNoopAnimations(),
          provideNzIcons([ApartmentOutline, TeamOutline, UserOutline, SearchOutline]),
          { provide: DroitsService, useValue: { peut: () => false } },
        ],
      }).compileComponents();
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('affiche les Entités sans flèche d’expansion, aucune Équipe visible', () => {
      const fixture = TestBed.createComponent(ArbreOrganisation);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
      fixture.detectChanges();

      const racine = (component as unknown as { treeData(): { isLeaf: boolean; children?: unknown[] }[] }).treeData();
      const noeudEntite = racine[0].children![0] as { isLeaf: boolean; children?: unknown[] };
      expect(noeudEntite.isLeaf).toBe(true);
      expect(noeudEntite.children).toBeUndefined();
    });

    it('ne charge aucune Équipe en dépliant une Entité', () => {
      const fixture = TestBed.createComponent(ArbreOrganisation);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
      fixture.detectChanges();

      deplierNoeudEntite(component, 'e1');

      httpMock.verify();
    });

    it('ne charge aucune Équipe en recherchant un terme', () => {
      const fixture = TestBed.createComponent(ArbreOrganisation);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
      fixture.detectChanges();

      saisirFiltre(component, 'dsi');
      fixture.detectChanges();

      httpMock.verify();
    });

    it('sélectionner une Entité ne déclenche aucun appel réseau vers ses Équipes', () => {
      const fixture = TestBed.createComponent(ArbreOrganisation);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
      fixture.detectChanges();

      cliquer(component, noeudEntite('e1'));
      fixture.detectChanges();

      httpMock.verify();
    });
  });
});
