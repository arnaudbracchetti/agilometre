import { vi } from 'vitest';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzFormatEmitEvent } from 'ng-zorro-antd/tree';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { ApartmentOutline, SearchOutline, TeamOutline, UserOutline } from '@ant-design/icons-angular/icons';
import { Role, UtilisateurDto } from '@agilometre/shared';
import { DroitsService } from '../../auth/droits.service';
import { ArbreOrganisation } from '../arbre-organisation/arbre-organisation';
import { CreerModifierCompteModal } from '../../comptes/creer-modifier-compte-modal/creer-modifier-compte-modal';
import { OrganisationPage } from './organisation-page';

/**
 * Simule la saisie utilisateur en passant par NgModel.viewToModelUpdate plutôt que par un
 * dispatchEvent('input') natif : dans ce projet, les événements DOM synthétiques ne traversent
 * pas le mécanisme d'écoute d'Angular en dehors d'un bootstrap applicatif complet (vérifié en
 * isolant le problème — dispatchEvent('input') n'atteint aucun listener compilé, y compris ceux
 * de ng-zorro-antd, alors que viewToModelUpdate déclenche exactement la même chaîne
 * (ngModelChange → mise à jour du signal) que le ferait un DefaultValueAccessor réel.
 */
function saisir(fixture: ComponentFixture<OrganisationPage>, selecteur: string, valeur: string): void {
  const debug = fixture.debugElement.query(By.css(selecteur));
  debug.injector.get(NgModel).viewToModelUpdate(valeur);
  fixture.detectChanges();
}

function arbreComponent(fixture: ComponentFixture<OrganisationPage>): ArbreOrganisation {
  return fixture.debugElement.query(By.directive(ArbreOrganisation)).componentInstance;
}

/**
 * Simule un clic sur un nœud de l'arbre en invoquant directement le handler du composant
 * `ArbreOrganisation` monté par `OrganisationPage`, plutôt qu'en simulant un clic DOM réel :
 * nz-tree gère lui-même le déclenchement de (nzClick) via sa propre arborescence interne de
 * composants, hors du périmètre à tester ici (même logique que `saisir()` ci-dessus pour NgModel
 * — on teste notre propre logique, pas le câblage interne de la bibliothèque tierce).
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

function cliquer(fixture: ComponentFixture<OrganisationPage>, event: NzFormatEmitEvent): void {
  (arbreComponent(fixture) as unknown as { onNodeClick(e: NzFormatEmitEvent): void }).onNodeClick(event);
}

describe('OrganisationPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganisationPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        provideNzIcons([ApartmentOutline, TeamOutline, UserOutline, SearchOutline]),
        // Écran Coach seul (route gardée par `droitGuard('gererOrganisation')`) — ces tests
        // exercent le comportement non restreint de l'arbre, pas la restriction Direction (voir
        // arbre-organisation.spec.ts pour cette dernière).
        { provide: DroitsService, useValue: { peut: () => true } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('affiche par défaut le formulaire de création d’Entité', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    const formulaire = fixture.debugElement.query(By.css('#nouveauNomEntite'));
    expect(formulaire).toBeTruthy();
  });

  it('affiche l’Entité créée dans l’arbre après soumission du formulaire de création', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    saisir(fixture, '#nouveauNomEntite', 'Achats');
    const formDebug = fixture.debugElement.query(By.css('#nouveauNomEntite')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/entites');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Achats' });
    req.flush({ id: 'e3', nom: 'Achats' });
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('Achats');
  });

  it('sélectionner une Entité charge ses Équipes et affiche le panneau contextuel', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/organisation/entites/e1/equipes');
    req.flush([]);
    fixture.detectChanges();

    const detailTitre: HTMLElement = fixture.nativeElement.querySelector(
      '.organisation__detail .organisation__titre',
    );
    expect(detailTitre.textContent).toContain('DSI');
    expect(fixture.debugElement.query(By.css('#nouveauNomEquipe'))).toBeTruthy();
  });

  it('renomme l’Entité sélectionnée après soumission du formulaire de renommage', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    fixture.detectChanges();

    saisir(fixture, '#nomRenommeEntite', 'Direction des Systèmes d’Information');
    const formDebug = fixture.debugElement.query(By.css('#nomRenommeEntite')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/entites/e1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Direction des Systèmes d’Information' });
    req.flush({ id: 'e1', nom: 'Direction des Systèmes d’Information' });
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('Direction des Systèmes d’Information');
  });

  it('crée une Équipe depuis le panneau d’une Entité sélectionnée', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    fixture.detectChanges();

    saisir(fixture, '#nouveauNomEquipe', 'Équipe Alpha');
    const formDebug = fixture.debugElement.query(By.css('#nouveauNomEquipe')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/equipes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Équipe Alpha', entiteId: 'e1' });
    req.flush({ id: 'eq1', nom: 'Équipe Alpha', entiteId: 'e1', membres: [] });
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('Équipe Alpha');
  });

  it('sélectionner une Équipe affiche le panneau d’ajout de Membre, sans requête réseau supplémentaire', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();

    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();

    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();

    httpMock.verify();
    const detailTitre: HTMLElement = fixture.nativeElement.querySelector(
      '.organisation__detail .organisation__titre',
    );
    expect(detailTitre.textContent).toContain('Alpha');
    expect(fixture.debugElement.query(By.css('#nouveauMembreNom'))).toBeTruthy();
  });

  it('affiche un lien vers le Profil de l’Équipe sélectionnée', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();

    const lien = fixture.nativeElement.querySelector('a[href="/profil/equipe/eq1"]');
    expect(lien).toBeTruthy();
    expect(lien.textContent).toContain('Voir le profil');
  });

  it('ajoute un Membre au roster depuis le panneau d’une Équipe sélectionnée', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();

    saisir(fixture, '#nouveauMembreNom', 'Jean Dupont');
    saisir(fixture, '#nouveauMembreEmail', 'jean@example.com');
    const formDebug = fixture.debugElement.query(By.css('#nouveauMembreNom')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/membres');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Jean Dupont', email: 'jean@example.com' });
    req.flush({
      id: 'eq1',
      nom: 'Alpha',
      entiteId: 'e1',
      membres: [{ id: 'm1', nom: 'Jean Dupont', email: 'jean@example.com', utilisateurId: null }],
    });
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('Jean Dupont');
  });

  it('retire un Membre sélectionné du roster', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([
      {
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [{ id: 'm1', nom: 'Jean Dupont', email: 'jean@example.com', utilisateurId: null }],
      },
    ]);
    fixture.detectChanges();

    cliquer(fixture, noeudMembre('m1'));
    fixture.detectChanges();

    const bouton = fixture.debugElement
      .queryAll(By.css('button'))
      .find((b) => b.nativeElement.textContent.includes('Retirer du roster'))!;
    bouton.triggerEventHandler('nzOnConfirm', undefined);

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/membres/m1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] });
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).not.toContain('Jean Dupont');

    const detailTitre: HTMLElement = fixture.nativeElement.querySelector(
      '.organisation__detail .organisation__titre',
    );
    expect(detailTitre.textContent).toContain('Alpha');
    expect(fixture.debugElement.query(By.css('#nouveauMembreNom'))).toBeTruthy();
  });

  it('modifie le nom et l’email d’un Membre sélectionné', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([
      {
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [{ id: 'm1', nom: 'Jean Dupont', email: 'jean@example.com', utilisateurId: null }],
      },
    ]);
    fixture.detectChanges();

    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();
    cliquer(fixture, noeudMembre('m1'));
    fixture.detectChanges();

    saisir(fixture, '#nomModifieMembre', 'Jean D.');
    saisir(fixture, '#emailModifieMembre', 'jean.d@example.com');
    const formDebug = fixture.debugElement.query(By.css('#nomModifieMembre')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/membres/m1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nom: 'Jean D.', email: 'jean.d@example.com' });
    req.flush({
      id: 'eq1',
      nom: 'Alpha',
      entiteId: 'e1',
      membres: [{ id: 'm1', nom: 'Jean D.', email: 'jean.d@example.com', utilisateurId: null }],
    });
    fixture.detectChanges();

    const arbre: HTMLElement = fixture.nativeElement.querySelector('.arbre-organisation__tree');
    expect(arbre.textContent).toContain('Jean D.');
    expect(arbre.textContent).toContain('jean.d@example.com');
  });

  it('affiche un Membre lié à un compte en lecture seule, avec un renvoi vers l’écran Comptes', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([
      {
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [
          {
            id: 'm1',
            nom: 'Dupont',
            prenom: 'Jean',
            email: 'jean@example.com',
            utilisateurId: 'u1',
          },
        ],
      },
    ]);
    fixture.detectChanges();
    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();
    cliquer(fixture, noeudMembre('m1'));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#nomModifieMembre'))).toBeFalsy();
    const panneau: HTMLElement = fixture.nativeElement.querySelector('.organisation__detail');
    expect(panneau.textContent).toContain('Jean');
    expect(panneau.textContent).toContain('Dupont');
    expect(panneau.textContent).toContain('jean@example.com');
    expect(panneau.textContent).toContain('Retirer du roster');
    expect(panneau.querySelector('a[href="/comptes"]')).toBeTruthy();
  });

  it('« Créer un compte » ouvre CreerModifierCompteModal préremplie avec le nom et l’email du Membre', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([
      {
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [{ id: 'm1', nom: 'Jean Dupont', prenom: null, email: 'jean@example.com', utilisateurId: null }],
      },
    ]);
    fixture.detectChanges();
    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();
    cliquer(fixture, noeudMembre('m1'));
    fixture.detectChanges();
    const modal = fixture.debugElement.injector.get(NzModalService);
    const createSpy = vi
      .spyOn(modal, 'create')
      .mockReturnValue({ afterClose: of(undefined) } as ReturnType<NzModalService['create']>);

    fixture.componentInstance['creerCompteDepuisRoster']();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nzContent: CreerModifierCompteModal,
        nzData: { compte: null, emailInitial: 'jean@example.com', nomInitial: 'Jean Dupont' },
      }),
    );
  });

  it('après création du compte depuis le roster, rafraîchit l’Équipe affichée', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([
      {
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [{ id: 'm1', nom: 'Jean Dupont', prenom: null, email: 'jean@example.com', utilisateurId: null }],
      },
    ]);
    fixture.detectChanges();
    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();
    cliquer(fixture, noeudMembre('m1'));
    fixture.detectChanges();
    const compteCree: UtilisateurDto = {
      id: 'u1',
      email: 'jean@example.com',
      prenom: 'Jean',
      nom: 'Dupont',
      role: Role.Membre,
      actif: true,
      habilitations: [],
    };
    const modal = fixture.debugElement.injector.get(NzModalService);
    vi.spyOn(modal, 'create').mockReturnValue({
      afterClose: of(compteCree),
    } as ReturnType<NzModalService['create']>);

    fixture.componentInstance['creerCompteDepuisRoster']();

    const req = httpMock.expectOne('/api/organisation/equipes/eq1');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'eq1',
      nom: 'Alpha',
      entiteId: 'e1',
      membres: [
        { id: 'm1', nom: 'Dupont', prenom: 'Jean', email: 'jean@example.com', utilisateurId: 'u1' },
      ],
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#nomModifieMembre'))).toBeFalsy();
    const panneau: HTMLElement = fixture.nativeElement.querySelector('.organisation__detail');
    expect(panneau.textContent).toContain('jean@example.com');
  });

  it('supprimer une Équipe sélectionne son Entité parente plutôt que de perdre la sélection', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();

    const bouton = fixture.debugElement
      .queryAll(By.css('button'))
      .find((b) => b.nativeElement.textContent.includes('Supprimer l’Équipe'))!;
    bouton.triggerEventHandler('nzOnConfirm', undefined);

    httpMock.expectOne('/api/organisation/equipes/eq1').flush(null);
    fixture.detectChanges();

    const detailTitre: HTMLElement = fixture.nativeElement.querySelector(
      '.organisation__detail .organisation__titre',
    );
    expect(detailTitre.textContent).toContain('DSI');
    expect(fixture.debugElement.query(By.css('#nouveauNomEquipe'))).toBeTruthy();
  });

  it('cliquer sur la racine de l’arbre repasse en mode création d’Entité', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    fixture.detectChanges();

    cliquer(fixture, noeudRacine());
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#nouveauNomEntite'))).toBeTruthy();
  });

  it('la sélection reste visuellement surlignée après une action qui modifie l’arbre', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites/e1/equipes').flush([]);
    fixture.detectChanges();

    saisir(fixture, '#nouveauNomEquipe', 'Équipe Alpha');
    const formDebug = fixture.debugElement.query(By.css('#nouveauNomEquipe')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));
    httpMock
      .expectOne('/api/organisation/equipes')
      .flush({ id: 'eq1', nom: 'Équipe Alpha', entiteId: 'e1', membres: [] });
    fixture.detectChanges();

    const noeudSelectionne = fixture.nativeElement.querySelector('.ant-tree-node-selected');
    expect(noeudSelectionne?.textContent).toContain('DSI');
  });

  it('affiche un message dédié en cas de doublon (409) à la création d’Entité', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    const modal = fixture.debugElement.injector.get(NzModalService);
    const erreurSpy = vi
      .spyOn(modal, 'error')
      .mockReturnValue({} as ReturnType<NzModalService['error']>);

    saisir(fixture, '#nouveauNomEntite', 'DSI');
    const formDebug = fixture.debugElement.query(By.css('#nouveauNomEntite')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/entites');
    req.flush(
      { message: 'Une Entité porte déjà ce nom' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(erreurSpy).toHaveBeenCalledWith({
      nzTitle: 'Erreur',
      nzContent: 'Une Entité porte déjà ce nom.',
    });
  });

  it('affiche un message dédié en cas de doublon (409) à l’ajout d’un Membre', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([{ id: 'e1', nom: 'DSI' }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEntite('e1'));
    fixture.detectChanges();
    httpMock
      .expectOne('/api/organisation/entites/e1/equipes')
      .flush([{ id: 'eq1', nom: 'Alpha', entiteId: 'e1', membres: [] }]);
    fixture.detectChanges();
    cliquer(fixture, noeudEquipe('eq1'));
    fixture.detectChanges();

    const modal = fixture.debugElement.injector.get(NzModalService);
    const erreurSpy = vi
      .spyOn(modal, 'error')
      .mockReturnValue({} as ReturnType<NzModalService['error']>);

    saisir(fixture, '#nouveauMembreNom', 'Jean Dupont');
    saisir(fixture, '#nouveauMembreEmail', 'jean@example.com');
    const formDebug = fixture.debugElement.query(By.css('#nouveauMembreNom')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    const req = httpMock.expectOne('/api/organisation/equipes/eq1/membres');
    req.flush(
      { message: 'Un Membre porte déjà cet email dans cette Équipe' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(erreurSpy).toHaveBeenCalledWith({
      nzTitle: 'Erreur',
      nzContent: 'Un Membre porte déjà cet email dans cette Équipe.',
    });
  });

  it('replace le focus sur le champ de création d’Entité après une création, pour enchaîner les créations', () => {
    const fixture = TestBed.createComponent(OrganisationPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/organisation/entites').flush([]);
    fixture.detectChanges();

    const champ = fixture.debugElement.query(By.css('#nouveauNomEntite')).nativeElement as HTMLInputElement;
    const focusSpy = vi.spyOn(champ, 'focus');

    saisir(fixture, '#nouveauNomEntite', 'Achats');
    const formDebug = fixture.debugElement.query(By.css('#nouveauNomEntite')).parent!;
    formDebug.triggerEventHandler('submit', new Event('submit'));

    httpMock.expectOne('/api/organisation/entites').flush({ id: 'e3', nom: 'Achats' });
    fixture.detectChanges();

    expect(focusSpy).toHaveBeenCalled();
  });
});
