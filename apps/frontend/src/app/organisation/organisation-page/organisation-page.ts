import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { MembreDto, UtilisateurDto } from '@agilometre/shared';
import { ArbreOrganisation } from '../arbre-organisation/arbre-organisation';
import { OrganisationService } from '../organisation.service';
import { CreerModifierCompteModal } from '../../comptes/creer-modifier-compte-modal/creer-modifier-compte-modal';

/**
 * Gestion CRUD de l'organisation (Entités/Équipes/Membres) : l'arbre de navigation/sélection vit
 * dans `ArbreOrganisation` (réutilisé aussi par `ProfilEquipePage`) ; cet écran ne porte plus que
 * le panneau contextuel de droite, piloté par la sélection résolue en DTO qu'expose l'arbre
 * (`selectionActuelle`) et par son API impérative (`ajouterEntite`, `remplacerEquipe`, …) pour
 * répercuter les mutations CRUD sans dupliquer l'état de l'arbre ici.
 */
@Component({
  selector: 'app-organisation-page',
  imports: [
    RouterLink,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    ArbreOrganisation,
  ],
  templateUrl: './organisation-page.html',
  styleUrl: './organisation-page.scss',
})
export class OrganisationPage {
  private readonly organisationService = inject(OrganisationService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  protected readonly arbre = viewChild.required(ArbreOrganisation);
  protected readonly selection = computed(() => this.arbre().selectionActuelle());

  private readonly champNouvelleEntite = viewChild<ElementRef<HTMLInputElement>>('champNouvelleEntite');
  private readonly champNouvelleEquipe = viewChild<ElementRef<HTMLInputElement>>('champNouvelleEquipe');
  private readonly champNouveauMembre = viewChild<ElementRef<HTMLInputElement>>('champNouveauMembre');

  protected readonly nouveauNomEntite = signal('');
  protected readonly nomRenommeEntite = signal('');
  protected readonly nouveauNomEquipe = signal('');
  protected readonly nomRenommeEquipe = signal('');
  protected readonly nouveauMembreNom = signal('');
  protected readonly nouveauMembrePrenom = signal('');
  protected readonly nouveauMembreEmail = signal('');
  protected readonly nomModifieMembre = signal('');
  protected readonly prenomModifieMembre = signal('');
  protected readonly emailModifieMembre = signal('');

  protected readonly creationEntiteEnCours = signal(false);
  protected readonly renommageEntiteEnCours = signal(false);
  protected readonly creationEquipeEnCours = signal(false);
  protected readonly renommageEquipeEnCours = signal(false);
  protected readonly ajoutMembreEnCours = signal(false);
  protected readonly modificationMembreEnCours = signal(false);

  protected readonly entiteSelectionnee = computed(() => {
    const selection = this.selection();
    return selection.type === 'entite' ? selection.entite : null;
  });

  protected readonly equipeSelectionnee = computed(() => {
    const selection = this.selection();
    return selection.type === 'equipe' ? selection.equipe : null;
  });

  protected readonly nombreEquipesEntiteSelectionnee = computed<number | null>(() => {
    const selection = this.selection();
    return selection.type === 'entite' ? selection.nombreEquipes : null;
  });

  protected readonly nombreMembresEquipeSelectionnee = computed<number | null>(
    () => this.equipeSelectionnee()?.membres.length ?? null,
  );

  protected readonly membreSelectionne = computed<{ membre: MembreDto; equipeId: string } | null>(() => {
    const selection = this.selection();
    return selection.type === 'membre' ? { membre: selection.membre, equipeId: selection.equipeId } : null;
  });

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
    const prenom = this.prenomModifieMembre().trim();
    const email = this.emailModifieMembre().trim();
    return (
      selection !== null &&
      nom.length > 0 &&
      email.length > 0 &&
      (nom !== selection.membre.nom ||
        prenom !== (selection.membre.prenom ?? '') ||
        email !== selection.membre.email)
    );
  });

  constructor() {
    // Réinitialise les champs du panneau contextuel à chaque changement de sélection dans
    // l'arbre — qu'il soit déclenché par un clic utilisateur ou par une mutation CRUD (ex.
    // `supprimerEquipe` qui reporte la sélection sur l'Entité parente).
    effect(() => {
      const selection = this.selection();
      if (selection.type === 'entite') {
        this.nomRenommeEntite.set(selection.entite.nom);
        this.nouveauNomEquipe.set('');
      } else if (selection.type === 'equipe') {
        this.nomRenommeEquipe.set(selection.equipe.nom);
        this.nouveauMembreNom.set('');
        this.nouveauMembrePrenom.set('');
        this.nouveauMembreEmail.set('');
      } else if (selection.type === 'membre') {
        this.nomModifieMembre.set(selection.membre.nom);
        this.prenomModifieMembre.set(selection.membre.prenom ?? '');
        this.emailModifieMembre.set(selection.membre.email);
      }
    });
  }

  protected creerEntite(): void {
    const nom = this.nouveauNomEntite().trim();
    if (nom.length === 0) {
      return;
    }
    this.creationEntiteEnCours.set(true);
    this.organisationService.creerEntite(nom).subscribe({
      next: (entite) => {
        this.arbre().ajouterEntite(entite);
        this.nouveauNomEntite.set('');
        this.creationEntiteEnCours.set(false);
        this.champNouvelleEntite()?.nativeElement.focus();
      },
      error: (erreur: HttpErrorResponse) => {
        this.creationEntiteEnCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409 ? 'Une Entité porte déjà ce nom.' : 'Impossible de créer cette Entité.',
        });
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
        this.arbre().remplacerEntite(entiteRenommee);
        this.renommageEntiteEnCours.set(false);
        this.message.success('Entité renommée.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.renommageEntiteEnCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409 ? 'Une Entité porte déjà ce nom.' : 'Impossible de renommer cette Entité.',
        });
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
        this.arbre().ajouterEquipe(entite.id, equipe);
        this.nouveauNomEquipe.set('');
        this.creationEquipeEnCours.set(false);
        this.champNouvelleEquipe()?.nativeElement.focus();
      },
      error: (erreur: HttpErrorResponse) => {
        this.creationEquipeEnCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409 ? 'Une Équipe porte déjà ce nom.' : 'Impossible de créer cette Équipe.',
        });
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
        this.arbre().remplacerEquipe(equipeRenommee);
        this.renommageEquipeEnCours.set(false);
        this.message.success('Équipe renommée.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.renommageEquipeEnCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409 ? 'Une Équipe porte déjà ce nom.' : 'Impossible de renommer cette Équipe.',
        });
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
        this.arbre().retirerEquipe(equipe.entiteId, equipe.id);
        this.arbre().selectionnerEntite(equipe.entiteId);
        this.message.success('Équipe supprimée.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409
              ? 'Cette Équipe est encore référencée par une Séance ou une campagne Pouls, elle ne peut pas être supprimée.'
              : 'Impossible de supprimer cette Équipe.',
        });
      },
    });
  }

  protected supprimerEntite(): void {
    const entite = this.entiteSelectionnee();
    if (!entite) {
      return;
    }
    this.organisationService.supprimerEntite(entite.id).subscribe({
      next: () => {
        this.arbre().retirerEntite(entite.id);
        this.arbre().selectionnerRacine();
        this.message.success('Entité supprimée.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409
              ? 'Cette Entité a encore des Équipes rattachées, elle ne peut pas être supprimée.'
              : 'Impossible de supprimer cette Entité.',
        });
      },
    });
  }

  protected ajouterMembre(): void {
    const equipe = this.equipeSelectionnee();
    const nom = this.nouveauMembreNom().trim();
    const prenom = this.nouveauMembrePrenom().trim();
    const email = this.nouveauMembreEmail().trim();
    if (!equipe || nom.length === 0 || email.length === 0) {
      return;
    }
    this.ajoutMembreEnCours.set(true);
    this.organisationService
      .ajouterMembre(equipe.id, nom, prenom.length > 0 ? prenom : null, email)
      .subscribe({
        next: (equipeMiseAJour) => {
          this.arbre().remplacerEquipe(equipeMiseAJour);
          this.nouveauMembreNom.set('');
          this.nouveauMembrePrenom.set('');
          this.nouveauMembreEmail.set('');
          this.ajoutMembreEnCours.set(false);
          this.champNouveauMembre()?.nativeElement.focus();
        },
        error: (erreur: HttpErrorResponse) => {
          this.ajoutMembreEnCours.set(false);
          this.modal.error({
            nzTitle: 'Erreur',
            nzContent:
              erreur.status === 409
                ? 'Un Membre porte déjà cet email dans cette Équipe.'
                : 'Impossible d’ajouter ce Membre.',
          });
        },
      });
  }

  protected modifierMembre(): void {
    const selection = this.membreSelectionne();
    if (!selection || !this.modificationMembrePossible()) {
      return;
    }
    const nom = this.nomModifieMembre().trim();
    const prenom = this.prenomModifieMembre().trim();
    const email = this.emailModifieMembre().trim();
    this.modificationMembreEnCours.set(true);
    this.organisationService
      .modifierMembre(
        selection.equipeId,
        selection.membre.id,
        nom,
        prenom.length > 0 ? prenom : null,
        email,
      )
      .subscribe({
        next: (equipeMiseAJour) => {
          this.arbre().remplacerEquipe(equipeMiseAJour);
          this.modificationMembreEnCours.set(false);
          this.message.success('Membre modifié.');
        },
        error: (erreur: HttpErrorResponse) => {
          this.modificationMembreEnCours.set(false);
          this.modal.error({
            nzTitle: 'Erreur',
            nzContent:
              erreur.status === 409
                ? 'Un Membre porte déjà cet email dans cette Équipe.'
                : 'Impossible de modifier ce Membre.',
          });
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
        this.arbre().remplacerEquipe(equipeMiseAJour);
        this.arbre().selectionnerEquipe(selection.equipeId);
        this.message.success('Membre retiré du roster.');
      },
      error: () => {
        this.modal.error({ nzTitle: 'Erreur', nzContent: 'Impossible de retirer ce Membre.' });
      },
    });
  }

  /**
   * Créer un compte n'est pas nécessaire pour répondre à une Session ou un Pouls, seulement pour
   * consulter — au choix du Coach ligne par ligne, jamais en masse
   * (doc/spec/annexes/gestion-des-droits.md, "Comptes Membre d'équipe"). Le rattachement à cette
   * ligne de roster est automatique côté serveur (email identique) ; ce composant se contente de
   * rafraîchir l'Équipe affichée une fois le compte créé — la réponse HTTP de la création est un
   * `UtilisateurDto`, pas l'`EquipeDto` mis à jour par la propagation.
   */
  protected creerCompteDepuisRoster(): void {
    const selection = this.membreSelectionne();
    if (!selection) {
      return;
    }
    this.modal
      .create({
        nzTitle: 'Créer un compte',
        nzContent: CreerModifierCompteModal,
        nzData: {
          compte: null,
          emailInitial: selection.membre.email,
          nomInitial: selection.membre.nom,
        },
        nzFooter: null,
      })
      .afterClose.subscribe((compte?: UtilisateurDto) => {
        if (!compte) {
          return;
        }
        this.organisationService.obtenirEquipe(selection.equipeId).subscribe((equipeMiseAJour) => {
          // Pas de `selectionnerEquipe` : le Membre sélectionné existe toujours (même id), la
          // sélection se re-résout automatiquement vers sa version à jour (désormais liée) — voir
          // `ArbreOrganisation.selectionActuelle`, dérivée en direct de `equipesParEntite`.
          this.arbre().remplacerEquipe(equipeMiseAJour);
          this.message.success('Compte créé — le Membre y est désormais lié.');
        });
      });
  }
}
