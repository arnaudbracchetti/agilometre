import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { EntiteDto, UtilisateurDto } from '@agilometre/shared';
import { OrganisationService } from '../../organisation/organisation.service';
import { ComptesService } from '../comptes.service';

export interface DonneesGererHabilitations {
  compte: UtilisateurDto;
}

interface HabilitationAffichee {
  id: string;
  nom: string;
}

/**
 * Réservé aux comptes `Direction` (Coach seul y accède, matrice "Comptes... Habilitations" —
 * doc/spec/annexes/gestion-des-droits.md). Persistance immédiate à chaque geste (pas de brouillon
 * à valider/annuler) : `DialogActions` (Annuler/Action) ne convient pas ici, un simple bouton
 * Fermer referme la modale une fois les mutations déjà effectuées côté serveur.
 */
@Component({
  selector: 'app-gerer-habilitations-modal',
  imports: [FormsModule, NzButtonModule, NzIconModule, NzModalModule, NzSelectModule, NzTooltipModule],
  templateUrl: './gerer-habilitations-modal.html',
  styleUrl: './gerer-habilitations-modal.scss',
})
export class GererHabilitationsModal implements OnInit {
  private readonly comptesService = inject(ComptesService);
  private readonly organisationService = inject(OrganisationService);
  private readonly modalRef = inject(NzModalRef);
  private readonly modal = inject(NzModalService);
  protected readonly data = inject<DonneesGererHabilitations>(NZ_MODAL_DATA);

  protected readonly compte = signal<UtilisateurDto>(this.data.compte);
  private readonly entites = signal<EntiteDto[]>([]);
  protected readonly entiteSelectionnee = signal<string | null>(null);
  protected readonly enCours = signal(false);

  protected readonly entitesDisponibles = computed<EntiteDto[]>(() => {
    const habilitees = new Set(this.compte().habilitations.map((h) => h.entiteId));
    return this.entites().filter((entite) => !habilitees.has(entite.id));
  });

  protected readonly habilitationsAffichees = computed<HabilitationAffichee[]>(() =>
    this.compte().habilitations.map((habilitation) => ({
      id: habilitation.id,
      nom:
        this.entites().find((entite) => entite.id === habilitation.entiteId)?.nom ??
        habilitation.entiteId ??
        '',
    })),
  );

  ngOnInit(): void {
    this.organisationService.listerEntites().subscribe((entites) => this.entites.set(entites));
  }

  protected ajouter(): void {
    const entiteId = this.entiteSelectionnee();
    if (!entiteId) {
      return;
    }
    this.enCours.set(true);
    this.comptesService.ajouterHabilitation(this.compte().id, entiteId).subscribe({
      next: (compte) => {
        this.compte.set(compte);
        this.entiteSelectionnee.set(null);
        this.enCours.set(false);
      },
      error: () => {
        this.enCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent: 'Impossible d’accorder cette Habilitation.',
        });
      },
    });
  }

  protected retirer(habilitationId: string): void {
    this.comptesService.retirerHabilitation(this.compte().id, habilitationId).subscribe({
      next: (compte) => this.compte.set(compte),
      error: () =>
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent: 'Impossible de retirer cette Habilitation.',
        }),
    });
  }

  protected fermer(): void {
    this.modalRef.close(this.compte());
  }
}
