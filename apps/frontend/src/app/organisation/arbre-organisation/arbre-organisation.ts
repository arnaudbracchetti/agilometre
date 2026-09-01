import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormatEmitEvent, NzTreeModule, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { EntiteDto, EquipeDto, MembreDto } from '@agilometre/shared';
import { DroitsService } from '../../auth/droits.service';
import { OrganisationService } from '../organisation.service';

type TypeNoeud = 'racine' | 'entite' | 'equipe' | 'membre';

interface NoeudOrganisation extends NzTreeNodeOptions {
  type: TypeNoeud;
}

interface SelectionInterne {
  type: TypeNoeud;
  id: string;
}

/** Sélection courante de l'arbre, résolue en DTO — ce que les écrans consommant ce composant lisent. */
export type SelectionArbre =
  | { type: 'racine' }
  | { type: 'entite'; entite: EntiteDto; nombreEquipes: number | null }
  | { type: 'equipe'; equipe: EquipeDto }
  | { type: 'membre'; membre: MembreDto; equipeId: string };

/**
 * Clé du nœud racine factice, toujours présent en tête de l'arbre. Le sélectionner bascule le
 * panneau contextuel en mode "créer une Entité" — sans lui, revenir à ce mode nécessitait de
 * re-cliquer sur le nœud déjà sélectionné pour le désélectionner, un geste peu découvrable.
 */
const RACINE_KEY = '__racine__';

const RACINE_SELECTIONNEE: SelectionInterne = { type: 'racine', id: RACINE_KEY };

function racineVersNoeud(
  entites: EntiteDto[],
  equipesParEntite: Record<string, EquipeDto[]>,
  entitesNonDepliables: boolean,
): NoeudOrganisation {
  return {
    title: 'Organisation',
    key: RACINE_KEY,
    type: 'racine',
    isLeaf: false,
    children: entites.map((entite) =>
      entiteVersNoeud(entite, equipesParEntite[entite.id], entitesNonDepliables),
    ),
  };
}

/**
 * `entitesNonDepliables` réduit l'Entité à une feuille — jamais d'Équipe visible, ni dépliable
 * (doc/spec/annexes/gestion-des-droits.md, matrice "Arbre de navigation Entité → Équipe" pour
 * Direction). Sans `isLeaf: true`, la flèche d'expansion resterait affichée sur un nœud vide.
 */
function entiteVersNoeud(
  entite: EntiteDto,
  equipes: EquipeDto[] | undefined,
  entitesNonDepliables: boolean,
): NoeudOrganisation {
  return {
    title: entite.nom,
    key: entite.id,
    type: 'entite',
    isLeaf: entitesNonDepliables,
    children: entitesNonDepliables ? undefined : equipes?.map(equipeVersNoeud),
  };
}

function equipeVersNoeud(equipe: EquipeDto): NoeudOrganisation {
  return {
    title: equipe.nom,
    key: equipe.id,
    type: 'equipe',
    isLeaf: false,
    children: equipe.membres.map(membreVersNoeud),
  };
}

function membreVersNoeud(membre: MembreDto): NoeudOrganisation {
  return {
    title: `${membre.nom} — ${membre.email}`,
    key: membre.id,
    type: 'membre',
    isLeaf: true,
  };
}

function texteCorrespond(texte: string, terme: string): boolean {
  return texte.toLowerCase().includes(terme);
}

function membreCorrespond(membre: MembreDto, terme: string): boolean {
  return texteCorrespond(membre.nom, terme) || texteCorrespond(membre.email, terme);
}

function equipeCorrespond(equipe: EquipeDto, terme: string): boolean {
  return texteCorrespond(equipe.nom, terme) || equipe.membres.some((membre) => membreCorrespond(membre, terme));
}

function entiteCorrespond(entite: EntiteDto, equipes: EquipeDto[], terme: string): boolean {
  return texteCorrespond(entite.nom, terme) || equipes.some((equipe) => equipeCorrespond(equipe, terme));
}

/**
 * Arbre filtré par terme de recherche : une Entité/Équipe reste affichée si elle correspond
 * elle-même, ou si l'un de ses enfants correspond. Une Entité/Équipe qui correspond directement
 * affiche tous ses enfants (pas de double filtrage) — chercher "DSI" montre bien toutes les
 * Équipes de l'Entité DSI, pas seulement celles dont le nom contient aussi "DSI".
 */
function racineFiltreeVersNoeud(
  entites: EntiteDto[],
  equipesParEntite: Record<string, EquipeDto[]>,
  terme: string,
  entitesNonDepliables: boolean,
): NoeudOrganisation {
  const entitesCorrespondantes = entites.filter((entite) =>
    entitesNonDepliables
      ? texteCorrespond(entite.nom, terme)
      : entiteCorrespond(entite, equipesParEntite[entite.id] ?? [], terme),
  );
  return {
    title: 'Organisation',
    key: RACINE_KEY,
    type: 'racine',
    isLeaf: false,
    children: entitesCorrespondantes.map((entite) =>
      entiteFiltreeVersNoeud(entite, equipesParEntite[entite.id] ?? [], terme, entitesNonDepliables),
    ),
  };
}

/**
 * `entitesNonDepliables` : la recherche ne porte jamais sur les Équipes/Membres, et ne les révèle
 * jamais dans les résultats — la restriction porte sur la structure de l'arbre, pas seulement sur
 * les routes atteignables (gestion-des-droits.md, "Application des droits à l'exécution").
 */
function entiteFiltreeVersNoeud(
  entite: EntiteDto,
  equipes: EquipeDto[],
  terme: string,
  entitesNonDepliables: boolean,
): NoeudOrganisation {
  if (entitesNonDepliables) {
    return { title: entite.nom, key: entite.id, type: 'entite', isLeaf: true };
  }
  const equipesAffichees = texteCorrespond(entite.nom, terme)
    ? equipes
    : equipes.filter((equipe) => equipeCorrespond(equipe, terme));
  return {
    title: entite.nom,
    key: entite.id,
    type: 'entite',
    isLeaf: false,
    children: equipesAffichees.map((equipe) => equipeFiltreeVersNoeud(equipe, terme)),
  };
}

function equipeFiltreeVersNoeud(equipe: EquipeDto, terme: string): NoeudOrganisation {
  const membresAffiches = texteCorrespond(equipe.nom, terme)
    ? equipe.membres
    : equipe.membres.filter((membre) => membreCorrespond(membre, terme));
  return {
    title: equipe.nom,
    key: equipe.id,
    type: 'equipe',
    isLeaf: false,
    children: membresAffiches.map(membreVersNoeud),
  };
}

function collecterCles(noeuds: NoeudOrganisation[]): string[] {
  return noeuds.flatMap((noeud) => [noeud.key as string, ...collecterCles((noeud.children as NoeudOrganisation[]) ?? [])]);
}

/**
 * Arbre Entités → Équipes → Membres, extrait de `OrganisationPage` pour être réutilisable par
 * tout écran ayant besoin de naviguer/sélectionner dans l'organisation (gestion CRUD dans
 * `OrganisationPage`, sélection d'une Équipe dans `ProfilEquipePage`). Possède ses propres données
 * (chargées au démarrage) et sa propre sélection ; expose la sélection résolue en DTO via
 * `selectionActuelle`, et une API impérative (`ajouterEntite`, `remplacerEquipe`,
 * `selectionnerEntite`, …) pour que l'appelant puisse répercuter ses mutations CRUD sans dupliquer
 * l'état ici.
 */
@Component({
  selector: 'app-arbre-organisation',
  imports: [FormsModule, NzIconModule, NzInputModule, NzTreeModule],
  templateUrl: './arbre-organisation.html',
  styleUrl: './arbre-organisation.scss',
})
export class ArbreOrganisation implements OnInit {
  private readonly organisationService = inject(OrganisationService);
  private readonly droits = inject(DroitsService);

  /**
   * Proxy de "cette personne est une Direction restreinte à ses Entités habilitées" (matrice
   * écran/Rôle : "non dépliable, aucune Équipe visible") : `Coach` a `gererOrganisation`, `Membre
   * d'équipe` a `voirProfilEquipe` (son arbre reste dépliable, déjà filtré côté serveur à ses
   * seules Équipes, #62) — Direction seule n'a ni l'un ni l'autre. Pas de dépendance directe au
   * Rôle ici, `DroitsService` reste l'unique source de vérité sur les capacités.
   */
  protected readonly entitesNonDepliables = computed(
    () => !this.droits.peut('gererOrganisation') && !this.droits.peut('voirProfilEquipe'),
  );

  private readonly entites = signal<EntiteDto[]>([]);
  private readonly equipesParEntite = signal<Record<string, EquipeDto[]>>({});
  private readonly manuallyExpandedKeys = signal<string[]>([RACINE_KEY]);
  private readonly manuallySelectedKeys = signal<string[]>([RACINE_KEY]);
  private readonly selection = signal<SelectionInterne>(RACINE_SELECTIONNEE);

  protected readonly filtre = signal('');

  protected readonly treeData = computed<NoeudOrganisation[]>(() => {
    const terme = this.filtre().trim().toLowerCase();
    const restreint = this.entitesNonDepliables();
    if (terme.length === 0) {
      return [racineVersNoeud(this.entites(), this.equipesParEntite(), restreint)];
    }
    return [racineFiltreeVersNoeud(this.entites(), this.equipesParEntite(), terme, restreint)];
  });

  protected readonly aucunResultat = computed<boolean>(() => {
    if (this.filtre().trim().length === 0) {
      return false;
    }
    return (this.treeData()[0].children as NoeudOrganisation[] | undefined)?.length === 0;
  });

  /**
   * nz-tree réinitialise son état d'expansion/de sélection interne à chaque changement de
   * `nzData` sauf si `nzExpandedKeys`/`nzSelectedKeys` reçoivent eux aussi une référence de
   * tableau différente sur le même cycle de détection de changements (vérifié en lisant
   * `renderTreeProperties` dans `ng-zorro-antd/tree` : sans ça, `newExpandedKeys` — et le
   * mécanisme équivalent pour la sélection — retombent sur l'état interne déjà remis à zéro par
   * le rebuild de `nzData`, collapsant/désélectionnant silencieusement l'arbre à chaque
   * création/modification/suppression). D'où ces deux `computed` qui dépendent des mêmes signaux
   * que `treeData`, pour produire un nouveau tableau à chaque fois que l'arbre change, même quand
   * le set manuel sous-jacent est inchangé.
   *
   * Pendant une recherche active, toutes les branches affichées (déjà filtrées à ne garder que
   * les correspondances) sont dépliées de force — sans ça une Équipe/un Membre trouvé resterait
   * caché sous une Entité repliée.
   */
  protected readonly expandedKeys = computed<string[]>(() => {
    if (this.filtre().trim().length > 0) {
      return collecterCles(this.treeData());
    }
    this.entites();
    this.equipesParEntite();
    return [...this.manuallyExpandedKeys()];
  });

  protected readonly selectedKeys = computed<string[]>(() => {
    this.entites();
    this.equipesParEntite();
    return [...this.manuallySelectedKeys()];
  });

  /** Aucune Entité créée pour l'instant — utile à l'écran hôte pour son état vide initial. */
  readonly aucuneEntite = computed<boolean>(() => this.entites().length === 0);

  /** Sélection courante résolue en DTO — API publique lue par l'écran hôte. */
  readonly selectionActuelle = computed<SelectionArbre>(() => {
    const sel = this.selection();
    if (sel.type === 'racine') {
      return { type: 'racine' };
    }
    if (sel.type === 'entite') {
      const entite = this.entites().find((e) => e.id === sel.id);
      if (!entite) {
        return { type: 'racine' };
      }
      return {
        type: 'entite',
        entite,
        nombreEquipes: this.equipesParEntite()[entite.id]?.length ?? null,
      };
    }
    if (sel.type === 'equipe') {
      const equipe = this.trouverEquipe(sel.id);
      if (!equipe) {
        return { type: 'racine' };
      }
      return { type: 'equipe', equipe };
    }
    const trouve = this.trouverMembreAvecEquipeId(sel.id);
    if (!trouve) {
      return { type: 'racine' };
    }
    return { type: 'membre', membre: trouve.membre, equipeId: trouve.equipeId };
  });

  ngOnInit(): void {
    this.organisationService.listerEntites().subscribe((entites) => this.entites.set(entites));
  }

  /**
   * Le filtrage se fait côté client sur les données déjà en cache : dès qu'une recherche
   * démarre, on charge d'un coup les Équipes de toutes les Entités pas encore dépliées (au plus
   * une dizaine d'appels à cette échelle) pour que le filtre porte aussi sur les Équipes/Membres
   * des Entités jamais dépliées manuellement. `chargerEquipes` ne refait pas de requête pour une
   * Entité déjà en cache.
   */
  protected onFiltreChange(valeur: string): void {
    this.filtre.set(valeur);
    if (valeur.trim().length > 0) {
      for (const entite of this.entites()) {
        this.chargerEquipes(entite.id);
      }
    }
  }

  /**
   * Distingue un nœud qui correspond lui-même au terme recherché d'un nœud affiché seulement
   * comme contexte (ancêtre d'une correspondance, ou enfant d'une Entité/Équipe qui correspond
   * directement — voir `entiteFiltreeVersNoeud`/`equipeFiltreeVersNoeud`). `node.title` porte déjà
   * `nom` seul (Entité/Équipe) ou `nom — email` (Membre), donc une correspondance sur l'un ou
   * l'autre reste détectable par une simple sous-chaîne sur le titre affiché.
   */
  protected estCorrespondanceDirecte(titre: string): boolean {
    const terme = this.filtre().trim().toLowerCase();
    return terme.length > 0 && titre.toLowerCase().includes(terme);
  }

  /**
   * Synchronise le dépli/repli manuel de l'utilisateur. nz-tree n'émet PAS (nzExpandedKeysChange)
   * quand on clique sur la flèche d'un nœud (vérifié dans `eventTriggerChanged` du composant
   * `NzTreeComponent` : le cas `'expand'` ne fait que ré-émettre `(nzExpandChange)`) — seul ce
   * dernier événement nous dit qu'un dépli/repli manuel a eu lieu. Sans cette mise à jour de
   * `manuallyExpandedKeys` ici, le premier clic sur la flèche déplie le nœud dans l'état interne
   * de nz-tree (mutation directe, indépendante d'Angular) pendant que `chargerEquipes` charge en
   * arrière-plan ; puis quand la réponse arrive, notre `[nzExpandedKeys]` contrôlé — toujours sans
   * la clé de ce nœud — écrase silencieusement cet état et referme le nœud pile au moment où ses
   * Équipes arrivent. Un second clic « collait » seulement parce que les données étaient déjà en
   * cache et ne déclenchaient plus ce recalcul. Cliquer sur le nom (sélection) passe par
   * `selectionnerEntite`/`selectionnerEquipe`, qui alimentent déjà `manuallyExpandedKeys` — ce
   * handler aligne le comportement de la flèche sur celui du nom.
   */
  protected onNodeExpand(event: NzFormatEmitEvent): void {
    const node = event.node;
    if (!node) {
      return;
    }
    this.manuallyExpandedKeys.update((keys) =>
      node.isExpanded
        ? keys.includes(node.key)
          ? keys
          : [...keys, node.key]
        : keys.filter((key) => key !== node.key),
    );
    const origin = node.origin as NoeudOrganisation;
    if (node.isExpanded && origin.type === 'entite') {
      this.chargerEquipes(node.key);
    }
  }

  private trouverEquipe(id: string): EquipeDto | null {
    for (const equipes of Object.values(this.equipesParEntite())) {
      const trouvee = equipes.find((equipe) => equipe.id === id);
      if (trouvee) {
        return trouvee;
      }
    }
    return null;
  }

  private trouverMembreAvecEquipeId(id: string): { membre: MembreDto; equipeId: string } | null {
    for (const equipes of Object.values(this.equipesParEntite())) {
      for (const equipe of equipes) {
        const membre = equipe.membres.find((m) => m.id === id);
        if (membre) {
          return { membre, equipeId: equipe.id };
        }
      }
    }
    return null;
  }

  /**
   * No-op pour une Direction restreinte : sans cette garde, la recherche (`onFiltreChange`)
   * déclencherait quand même un appel réseau par Entité en arrière-plan, même si l'arbre ne
   * l'affiche jamais — la garantie de fond reste côté serveur (`ListerEquipesParEntite` renvoie une
   * liste vide à une Direction, même appelée directement), cette garde n'évite qu'un appel inutile.
   */
  private chargerEquipes(entiteId: string): void {
    if (this.entitesNonDepliables() || this.equipesParEntite()[entiteId]) {
      return;
    }
    this.organisationService.listerEquipesParEntite(entiteId).subscribe((equipes) => {
      this.equipesParEntite.update((map) => ({ ...map, [entiteId]: equipes }));
    });
  }

  protected onNodeClick(event: NzFormatEmitEvent): void {
    const node = event.node;
    if (!node) {
      return;
    }
    const origin = node.origin as NoeudOrganisation;

    if (origin.type === 'racine') {
      this.selectionnerRacine();
      return;
    }

    const actuelle = this.selection();
    if (actuelle.type === origin.type && actuelle.id === node.key) {
      this.selectionnerRacine();
      return;
    }

    if (origin.type === 'entite') {
      this.selectionnerEntite(node.key);
      this.chargerEquipes(node.key);
    } else if (origin.type === 'equipe') {
      this.selectionnerEquipe(node.key);
    } else if (origin.type === 'membre') {
      this.selection.set({ type: 'membre', id: node.key });
      this.manuallySelectedKeys.set([node.key]);
      this.manuallyExpandedKeys.update((keys) =>
        keys.includes(node.key) ? keys : [...keys, node.key],
      );
    }
  }

  /** Sélectionne le nœud racine factice — bascule le panneau contextuel en mode création d'Entité. */
  public selectionnerRacine(): void {
    this.selection.set(RACINE_SELECTIONNEE);
    this.manuallySelectedKeys.set([RACINE_KEY]);
  }

  public selectionnerEntite(entiteId: string): void {
    this.selection.set({ type: 'entite', id: entiteId });
    this.manuallySelectedKeys.set([entiteId]);
    this.manuallyExpandedKeys.update((keys) =>
      keys.includes(entiteId) ? keys : [...keys, entiteId],
    );
  }

  public selectionnerEquipe(equipeId: string): void {
    this.selection.set({ type: 'equipe', id: equipeId });
    this.manuallySelectedKeys.set([equipeId]);
    this.manuallyExpandedKeys.update((keys) =>
      keys.includes(equipeId) ? keys : [...keys, equipeId],
    );
  }

  public ajouterEntite(entite: EntiteDto): void {
    this.entites.update((entites) => [...entites, entite]);
  }

  public remplacerEntite(entite: EntiteDto): void {
    this.entites.update((entites) => entites.map((e) => (e.id === entite.id ? entite : e)));
  }

  public ajouterEquipe(entiteId: string, equipe: EquipeDto): void {
    this.equipesParEntite.update((map) => ({
      ...map,
      [entiteId]: [...(map[entiteId] ?? []), equipe].sort((a, b) => a.nom.localeCompare(b.nom)),
    }));
  }

  public remplacerEquipe(equipe: EquipeDto): void {
    this.equipesParEntite.update((map) => ({
      ...map,
      [equipe.entiteId]: (map[equipe.entiteId] ?? []).map((e) => (e.id === equipe.id ? equipe : e)),
    }));
  }

  public retirerEquipe(entiteId: string, equipeId: string): void {
    this.equipesParEntite.update((map) => ({
      ...map,
      [entiteId]: (map[entiteId] ?? []).filter((e) => e.id !== equipeId),
    }));
  }

  public retirerEntite(entiteId: string): void {
    this.entites.update((entites) => entites.filter((e) => e.id !== entiteId));
    this.equipesParEntite.update((map) =>
      Object.fromEntries(Object.entries(map).filter(([id]) => id !== entiteId)),
    );
  }
}
