import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule, NzTableSortFn } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { UtilisateurDto } from '@agilometre/shared';
import { ComptesService } from '../comptes.service';
import { libelleRole } from '../role-libelle';
import { CreerModifierCompteModal } from '../creer-modifier-compte-modal/creer-modifier-compte-modal';

/** Écran Comptes, réservé au Coach (capacité `gererComptes`) —
 * doc/spec/annexes/gestion-des-droits.md, "Matrice écran / Rôle". */
@Component({
  selector: 'app-comptes-page',
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
  ],
  templateUrl: './comptes-page.html',
  styleUrl: './comptes-page.scss',
})
export class ComptesPage implements OnInit {
  private readonly comptesService = inject(ComptesService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  protected readonly libelleRole = libelleRole;
  protected readonly comptes = signal<UtilisateurDto[]>([]);
  protected readonly chargementEnCours = signal(false);
  protected readonly filtre = signal('');

  protected readonly comptesFiltres = computed<UtilisateurDto[]>(() => {
    const terme = this.filtre().trim().toLowerCase();
    if (terme.length === 0) {
      return this.comptes();
    }
    return this.comptes().filter(
      (compte) =>
        compte.email.toLowerCase().includes(terme) ||
        compte.prenom.toLowerCase().includes(terme) ||
        compte.nom.toLowerCase().includes(terme),
    );
  });

  protected readonly trierParNom: NzTableSortFn<UtilisateurDto> = (a, b) =>
    `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);

  protected readonly trierParRole: NzTableSortFn<UtilisateurDto> = (a, b) =>
    libelleRole(a.role).localeCompare(libelleRole(b.role));

  ngOnInit(): void {
    this.rafraichir();
  }

  private rafraichir(): void {
    this.chargementEnCours.set(true);
    this.comptesService.lister().subscribe({
      next: (comptes) => {
        this.comptes.set(comptes);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent: 'Impossible de charger la liste des comptes.',
        });
      },
    });
  }

  protected ouvrirCreation(): void {
    this.modal
      .create({
        nzTitle: 'Créer un compte',
        nzContent: CreerModifierCompteModal,
        nzData: { compte: null },
        nzFooter: null,
      })
      .afterClose.subscribe((compte?: UtilisateurDto) => {
        if (compte) {
          this.rafraichir();
        }
      });
  }

  protected ouvrirModification(compte: UtilisateurDto): void {
    this.modal
      .create({
        nzTitle: 'Modifier le compte',
        nzContent: CreerModifierCompteModal,
        nzData: { compte },
        nzFooter: null,
      })
      .afterClose.subscribe((compteModifie?: UtilisateurDto) => {
        if (compteModifie) {
          this.rafraichir();
        }
      });
  }

  /** Boîte de dialogue générique (NzModalService) plutôt qu'un popconfirm posé à côté du bouton —
   * même choix que pilotage-page/ajustement-page pour toute confirmation de l'app. */
  protected confirmerDesactivation(compte: UtilisateurDto): void {
    this.modal.confirm({
      nzTitle: 'Désactiver ce compte ?',
      nzContent: 'La connexion sera refusée jusqu’à réactivation.',
      nzOkText: 'Désactiver',
      nzOkDanger: true,
      nzCancelText: 'Annuler',
      nzOnOk: () => this.desactiver(compte),
    });
  }

  protected desactiver(compte: UtilisateurDto): void {
    this.comptesService.desactiver(compte.id).subscribe({
      next: () => {
        this.rafraichir();
        this.message.success('Compte désactivé.');
      },
      error: () =>
        this.modal.error({ nzTitle: 'Erreur', nzContent: 'Impossible de désactiver ce compte.' }),
    });
  }

  protected reactiver(compte: UtilisateurDto): void {
    this.comptesService.reactiver(compte.id).subscribe({
      next: () => {
        this.rafraichir();
        this.message.success('Compte réactivé.');
      },
      error: () =>
        this.modal.error({ nzTitle: 'Erreur', nzContent: 'Impossible de réactiver ce compte.' }),
    });
  }
}
