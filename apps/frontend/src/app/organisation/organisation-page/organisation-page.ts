import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzFormatEmitEvent, NzTreeModule, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { EntiteDto, EquipeDto, MembreDto } from '@agilometre/shared';
import { OrganisationService } from '../organisation.service';

type TypeNoeud = 'racine' | 'entite' | 'equipe' | 'membre';

interface NoeudOrganisation extends NzTreeNodeOptions {
  type: TypeNoeud;
}

interface Selection {
  type: TypeNoeud;
  id: string;
}

/**
 * Clé du nœud racine factice, toujours présent en tête de l'arbre. Le sélectionner bascule le
 * panneau contextuel en mode "créer une Entité" — sans lui, revenir à ce mode nécessitait de
 * re-cliquer sur le nœud déjà sélectionné pour le désélectionner, un geste peu découvrable.
 */
const RACINE_KEY = '__racine__';

const RACINE_SELECTIONNEE: Selection = { type: 'racine', id: RACINE_KEY };

function racineVersNoeud(
  entites: EntiteDto[],
  equipesParEntite: Record<string, EquipeDto[]>,
): NoeudOrganisation {
  return {
    title: 'Organisation',
    key: RACINE_KEY,
    type: 'racine',
    isLeaf: false,
    children: entites.map((entite) => entiteVersNoeud(entite, equipesParEntite[entite.id])),
  };
}

function entiteVersNoeud(entite: EntiteDto, equipes: EquipeDto[] | undefined): NoeudOrganisation {
  return {
    title: entite.nom,
    key: entite.id,
    type: 'entite',
    isLeaf: false,
    children: equipes?.map(equipeVersNoeud),
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

@Component({
  selector: 'app-organisation-page',
  imports: [FormsModule, NzButtonModule, NzInputModule, NzPopconfirmModule, NzTreeModule],
  templateUrl: './organisation-page.html',
  styleUrl: './organisation-page.scss',
})
export class OrganisationPage implements OnInit {
  private readonly organisationService = inject(OrganisationService);
  private readonly message = inject(NzMessageService);

  protected readonly entites = signal<EntiteDto[]>([]);
  protected readonly equipesParEntite = signal<Record<string, EquipeDto[]>>({});
  private readonly manuallyExpandedKeys = signal<string[]>([RACINE_KEY]);
  private readonly manuallySelectedKeys = signal<string[]>([RACINE_KEY]);
  private readonly selection = signal<Selection>(RACINE_SELECTIONNEE);

  protected readonly nouveauNomEntite = signal('');
  protected readonly nomRenommeEntite = signal('');
  protected readonly nouveauNomEquipe = signal('');
  protected readonly nomRenommeEquipe = signal('');
  protected readonly nouveauMembreNom = signal('');
  protected readonly nouveauMembreEmail = signal('');
  protected readonly nomModifieMembre = signal('');
  protected readonly emailModifieMembre = signal('');

  protected readonly creationEntiteEnCours = signal(false);
  protected readonly renommageEntiteEnCours = signal(false);
  protected readonly creationEquipeEnCours = signal(false);
  protected readonly renommageEquipeEnCours = signal(false);
  protected readonly ajoutMembreEnCours = signal(false);
  protected readonly modificationMembreEnCours = signal(false);

  protected readonly treeData = computed<NoeudOrganisation[]>(() => [
    racineVersNoeud(this.entites(), this.equipesParEntite()),
  ]);

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
   */
  protected readonly expandedKeys = computed<string[]>(() => {
    this.entites();
    this.equipesParEntite();
    return [...this.manuallyExpandedKeys()];
  });

  protected readonly selectedKeys = computed<string[]>(() => {
    this.entites();
    this.equipesParEntite();
    return [...this.manuallySelectedKeys()];
  });

  protected readonly entiteSelectionnee = computed<EntiteDto | null>(() => {
    const selection = this.selection();
    if (selection.type !== 'entite') {
      return null;
    }
    return this.entites().find((entite) => entite.id === selection.id) ?? null;
  });

  protected readonly equipeSelectionnee = computed<EquipeDto | null>(() => {
    const selection = this.selection();
    if (selection.type !== 'equipe') {
      return null;
    }
    return this.trouverEquipe(selection.id);
  });

  protected readonly membreSelectionne = computed<{ membre: MembreDto; equipeId: string } | null>(
    () => {
      const selection = this.selection();
      if (selection.type !== 'membre') {
        return null;
      }
      for (const equipes of Object.values(this.equipesParEntite())) {
        for (const equipe of equipes) {
          const membre = equipe.membres.find((m) => m.id === selection.id);
          if (membre) {
            return { membre, equipeId: equipe.id };
          }
        }
      }
      return null;
    },
  );

  protected readonly renommageEntitePossible = computed(() => {
    const entite = this.entiteSelectionnee();
    return (
      entite !== null &&
      this.nomRenommeEntite().trim().length > 0 &&
      this.nomRenommeEntite().trim() !== entite.nom
    );
  });

  protected readonly renommageEquipePossible = computed(() => {
    const equipe = this.equipeSelectionnee();
    return (
      equipe !== null &&
      this.nomRenommeEquipe().trim().length > 0 &&
      this.nomRenommeEquipe().trim() !== equipe.nom
    );
  });

  protected readonly modificationMembrePossible = computed(() => {
    const selection = this.membreSelectionne();
    const nom = this.nomModifieMembre().trim();
    const email = this.emailModifieMembre().trim();
    return (
      selection !== null &&
      nom.length > 0 &&
      email.length > 0 &&
      (nom !== selection.membre.nom || email !== selection.membre.email)
    );
  });

  ngOnInit(): void {
    this.organisationService.listerEntites().subscribe((entites) => this.entites.set(entites));
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

  private trouverMembre(id: string): MembreDto | null {
    for (const equipes of Object.values(this.equipesParEntite())) {
      for (const equipe of equipes) {
        const trouve = equipe.membres.find((membre) => membre.id === id);
        if (trouve) {
          return trouve;
        }
      }
    }
    return null;
  }

  private chargerEquipes(entiteId: string): void {
    if (this.equipesParEntite()[entiteId]) {
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
      const membre = this.trouverMembre(node.key);
      this.nomModifieMembre.set(membre?.nom ?? '');
      this.emailModifieMembre.set(membre?.email ?? '');
    }
  }

  /** Sélectionne le nœud racine factice — bascule le panneau contextuel en mode création d'Entité. */
  private selectionnerRacine(): void {
    this.selection.set(RACINE_SELECTIONNEE);
    this.manuallySelectedKeys.set([RACINE_KEY]);
  }

  private selectionnerEntite(entiteId: string): void {
    this.selection.set({ type: 'entite', id: entiteId });
    this.manuallySelectedKeys.set([entiteId]);
    this.manuallyExpandedKeys.update((keys) =>
      keys.includes(entiteId) ? keys : [...keys, entiteId],
    );
    const entite = this.entites().find((e) => e.id === entiteId);
    this.nomRenommeEntite.set(entite?.nom ?? '');
    this.nouveauNomEquipe.set('');
  }

  private selectionnerEquipe(equipeId: string): void {
    this.selection.set({ type: 'equipe', id: equipeId });
    this.manuallySelectedKeys.set([equipeId]);
    this.manuallyExpandedKeys.update((keys) =>
      keys.includes(equipeId) ? keys : [...keys, equipeId],
    );
    const equipe = this.trouverEquipe(equipeId);
    this.nomRenommeEquipe.set(equipe?.nom ?? '');
    this.nouveauMembreNom.set('');
    this.nouveauMembreEmail.set('');
  }

  protected creerEntite(): void {
    const nom = this.nouveauNomEntite().trim();
    if (nom.length === 0) {
      return;
    }
    this.creationEntiteEnCours.set(true);
    this.organisationService.creerEntite(nom).subscribe({
      next: (entite) => {
        this.entites.update((entites) => [...entites, entite]);
        this.nouveauNomEntite.set('');
        this.creationEntiteEnCours.set(false);
      },
      error: (erreur: HttpErrorResponse) => {
        this.creationEntiteEnCours.set(false);
        this.message.error(
          erreur.status === 409 ? 'Une Entité porte déjà ce nom.' : 'Impossible de créer cette Entité.',
        );
      },
    });
  }

  protected renommerEntite(): void {
    const entite = this.entiteSelectionnee();
    if (!entite || !this.renommageEntitePossible()) {
      return;
    }
    const nom = this.nomRenommeEntite().trim();
    this.renommageEntiteEnCours.set(true);
    this.organisationService.renommerEntite(entite.id, nom).subscribe({
      next: (entiteRenommee) => {
        this.entites.update((entites) =>
          entites.map((e) => (e.id === entiteRenommee.id ? entiteRenommee : e)),
        );
        this.renommageEntiteEnCours.set(false);
        this.message.success('Entité renommée.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.renommageEntiteEnCours.set(false);
        this.message.error(
          erreur.status === 409 ? 'Une Entité porte déjà ce nom.' : 'Impossible de renommer cette Entité.',
        );
      },
    });
  }

  protected creerEquipe(): void {
    const entite = this.entiteSelectionnee();
    const nom = this.nouveauNomEquipe().trim();
    if (!entite || nom.length === 0) {
      return;
    }
    this.creationEquipeEnCours.set(true);
    this.organisationService.creerEquipe(nom, entite.id).subscribe({
      next: (equipe) => {
        this.equipesParEntite.update((map) => ({
          ...map,
          [entite.id]: [...(map[entite.id] ?? []), equipe].sort((a, b) => a.nom.localeCompare(b.nom)),
        }));
        this.nouveauNomEquipe.set('');
        this.creationEquipeEnCours.set(false);
      },
      error: (erreur: HttpErrorResponse) => {
        this.creationEquipeEnCours.set(false);
        this.message.error(
          erreur.status === 409 ? 'Une Équipe porte déjà ce nom.' : 'Impossible de créer cette Équipe.',
        );
      },
    });
  }

  protected renommerEquipe(): void {
    const equipe = this.equipeSelectionnee();
    if (!equipe || !this.renommageEquipePossible()) {
      return;
    }
    const nom = this.nomRenommeEquipe().trim();
    this.renommageEquipeEnCours.set(true);
    this.organisationService.renommerEquipe(equipe.id, nom).subscribe({
      next: (equipeRenommee) => {
        this.remplacerEquipe(equipeRenommee);
        this.renommageEquipeEnCours.set(false);
        this.message.success('Équipe renommée.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.renommageEquipeEnCours.set(false);
        this.message.error(
          erreur.status === 409 ? 'Une Équipe porte déjà ce nom.' : 'Impossible de renommer cette Équipe.',
        );
      },
    });
  }

  protected supprimerEquipe(): void {
    const equipe = this.equipeSelectionnee();
    if (!equipe) {
      return;
    }
    this.organisationService.supprimerEquipe(equipe.id).subscribe({
      next: () => {
        this.equipesParEntite.update((map) => ({
          ...map,
          [equipe.entiteId]: (map[equipe.entiteId] ?? []).filter((e) => e.id !== equipe.id),
        }));
        this.selectionnerEntite(equipe.entiteId);
        this.message.success('Équipe supprimée.');
      },
      error: () => {
        this.message.error('Impossible de supprimer cette Équipe.');
      },
    });
  }

  protected ajouterMembre(): void {
    const equipe = this.equipeSelectionnee();
    const nom = this.nouveauMembreNom().trim();
    const email = this.nouveauMembreEmail().trim();
    if (!equipe || nom.length === 0 || email.length === 0) {
      return;
    }
    this.ajoutMembreEnCours.set(true);
    this.organisationService.ajouterMembre(equipe.id, nom, email).subscribe({
      next: (equipeMiseAJour) => {
        this.remplacerEquipe(equipeMiseAJour);
        this.nouveauMembreNom.set('');
        this.nouveauMembreEmail.set('');
        this.ajoutMembreEnCours.set(false);
      },
      error: (erreur: HttpErrorResponse) => {
        this.ajoutMembreEnCours.set(false);
        this.message.error(
          erreur.status === 409
            ? 'Un Membre porte déjà cet email dans cette Équipe.'
            : 'Impossible d’ajouter ce Membre.',
        );
      },
    });
  }

  protected modifierMembre(): void {
    const selection = this.membreSelectionne();
    if (!selection || !this.modificationMembrePossible()) {
      return;
    }
    const nom = this.nomModifieMembre().trim();
    const email = this.emailModifieMembre().trim();
    this.modificationMembreEnCours.set(true);
    this.organisationService
      .modifierMembre(selection.equipeId, selection.membre.id, nom, email)
      .subscribe({
        next: (equipeMiseAJour) => {
          this.remplacerEquipe(equipeMiseAJour);
          this.modificationMembreEnCours.set(false);
          this.message.success('Membre modifié.');
        },
        error: (erreur: HttpErrorResponse) => {
          this.modificationMembreEnCours.set(false);
          this.message.error(
            erreur.status === 409
              ? 'Un Membre porte déjà cet email dans cette Équipe.'
              : 'Impossible de modifier ce Membre.',
          );
        },
      });
  }

  protected retirerMembre(): void {
    const selection = this.membreSelectionne();
    if (!selection) {
      return;
    }
    this.organisationService.retirerMembre(selection.equipeId, selection.membre.id).subscribe({
      next: (equipeMiseAJour) => {
        this.remplacerEquipe(equipeMiseAJour);
        this.selectionnerEquipe(selection.equipeId);
        this.message.success('Membre retiré du roster.');
      },
      error: () => {
        this.message.error('Impossible de retirer ce Membre.');
      },
    });
  }

  private remplacerEquipe(equipe: EquipeDto): void {
    this.equipesParEntite.update((map) => ({
      ...map,
      [equipe.entiteId]: (map[equipe.entiteId] ?? []).map((e) => (e.id === equipe.id ? equipe : e)),
    }));
  }
}
