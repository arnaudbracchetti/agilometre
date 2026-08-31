import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Role, UtilisateurDto } from '@agilometre/shared';
import { ComptesService } from '../comptes.service';
import { libelleRole } from '../role-libelle';
import { DialogActions } from '../../shared/dialog-actions/dialog-actions';

export interface DonneesCreerModifierCompte {
  /** `null` : création. Sinon : modification de ce compte (email/prénom/nom, jamais le Rôle). */
  compte: UtilisateurDto | null;
}

/** Le Rôle Manager d'équipe n'a aucun compte créable cette itération
 * (doc/spec/annexes/gestion-des-droits.md). */
const ROLES_CREABLES = [Role.Coach, Role.Direction, Role.Membre];

@Component({
  selector: 'app-creer-modifier-compte-modal',
  imports: [FormsModule, NzInputModule, NzModalModule, NzSelectModule, DialogActions],
  templateUrl: './creer-modifier-compte-modal.html',
  styleUrl: './creer-modifier-compte-modal.scss',
})
export class CreerModifierCompteModal {
  private readonly comptesService = inject(ComptesService);
  private readonly message = inject(NzMessageService);
  private readonly modalRef = inject(NzModalRef);
  private readonly modal = inject(NzModalService);
  protected readonly data = inject<DonneesCreerModifierCompte>(NZ_MODAL_DATA);

  protected readonly rolesCreables = ROLES_CREABLES;
  protected readonly libelleRole = libelleRole;

  protected readonly email = signal(this.data.compte?.email ?? '');
  protected readonly prenom = signal(this.data.compte?.prenom ?? '');
  protected readonly nom = signal(this.data.compte?.nom ?? '');
  protected readonly role = signal<Role>(this.data.compte?.role ?? Role.Membre);
  protected readonly enCours = signal(false);

  protected readonly formulaireValide = computed(
    () => this.email().trim().length > 0 && this.prenom().trim().length > 0 && this.nom().trim().length > 0,
  );

  protected annuler(): void {
    this.modalRef.close();
  }

  protected enregistrer(): void {
    // Le bouton Action de DialogActions est `type="submit"` : un clic dessus émet à la fois
    // (click) → (action) et déclenche le (ngSubmit) du <form> englobant, donc `enregistrer()`
    // est appelé deux fois pour un seul clic. Cette garde ignore le second appel réentrant
    // pendant que la requête du premier est encore en vol (sans elle : deux POST /api/comptes
    // concurrents, l'un des deux échouant à tort en 409 « email déjà utilisé »).
    if (this.enCours() || !this.formulaireValide()) {
      return;
    }
    this.enCours.set(true);
    const compteExistant = this.data.compte;
    const requete = compteExistant
      ? this.comptesService.modifier(compteExistant.id, this.email(), this.prenom(), this.nom())
      : this.comptesService.creer(this.email(), this.prenom(), this.nom(), this.role());

    requete.subscribe({
      next: (compte) => this.apresEnregistrement(compte, compteExistant),
      error: (erreur: HttpErrorResponse) => {
        this.enCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409 ? 'Un compte existe déjà avec cet email.' : 'Impossible d’enregistrer ce compte.',
        });
      },
    });
  }

  /**
   * Le changement de Rôle est une seconde requête, distincte de `modifier`/`creer` (route dédiée
   * `PATCH /comptes/:id/role`, cohérence Rôle/Habilitations vérifiée côté domaine) — jamais
   * envoyé à la création, où le Rôle est déjà celui choisi dans `creer(...)`.
   */
  private apresEnregistrement(compte: UtilisateurDto, compteExistant: UtilisateurDto | null): void {
    const roleAChange = compteExistant !== null && compteExistant.role !== this.role();
    if (!roleAChange) {
      this.modalRef.close(compte);
      this.message.success(compteExistant ? 'Compte modifié.' : 'Compte créé — email d’invitation envoyé.');
      return;
    }

    this.comptesService.changerRole(compte.id, this.role()).subscribe({
      next: (compteAJour) => {
        this.modalRef.close(compteAJour);
        this.message.success('Compte modifié.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.enCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent:
            erreur.status === 409
              ? 'Ce Rôle est incompatible avec les Habilitations existantes — retirez-les d’abord.'
              : 'Impossible de changer le Rôle de ce compte.',
        });
      },
    });
  }
}
