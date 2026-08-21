import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { ParticipantService } from '../participant.service';

/**
 * Bouton d'assistance persistant sur l'écran participant (phases attente/vote — un Jeton existe
 * déjà) : affiche Équipe + date d'ouverture de la Session, et permet de s'en déconnecter. Panneau
 * personnalisé plutôt qu'un nz-drawer/nz-dropdown (aucun précédent dans le repo pour ces deux-là,
 * alors que NzModalService.confirm a déjà un usage établi — ajustement-page.ts) : seul le "Se
 * déconnecter" passe par `NzModalService.confirm`, le contenu informatif reste un panneau simple
 * pilotée par signal, pleinement réactif sans indirection de TemplateRef.
 */
@Component({
  selector: 'app-aide-menu',
  imports: [NzButtonModule, NzIconModule, NzModalModule],
  templateUrl: './aide-menu.html',
  styleUrl: './aide-menu.scss',
})
export class AideMenu {
  private readonly participantService = inject(ParticipantService);
  private readonly modal = inject(NzModalService);

  readonly jeton = input.required<string>();
  readonly deconnexion = output<void>();
  /** Jeton rejeté (401, carte #47) en consultant `info-session` — distinct de `deconnexion` :
   * ce n'est pas un choix du Membre, l'écran hôte doit afficher le message de rejet, pas juste
   * repasser en saisie silencieusement. */
  readonly sessionRejetee = output<void>();

  protected readonly ouvert = signal(false);
  protected readonly chargement = signal(false);
  protected readonly equipeNom = signal('');
  protected readonly ouvertureLe = signal<string | null>(null);

  protected readonly ouvertureLeAffichage = computed(() => {
    const iso = this.ouvertureLe();
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  });

  protected ouvrir(): void {
    this.ouvert.set(true);
    this.chargement.set(true);
    this.participantService.obtenirInfoSession(this.jeton()).subscribe({
      next: (info) => {
        this.equipeNom.set(info.equipeNom);
        this.ouvertureLe.set(info.ouvertureLe);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 401) {
          this.sessionRejetee.emit();
        }
      },
    });
  }

  protected fermer(): void {
    this.ouvert.set(false);
  }

  protected confirmerDeconnexion(): void {
    this.modal.confirm({
      nzTitle: 'Se déconnecter de cette séance ?',
      nzContent:
        'Vous pourrez rejoindre une séance à tout moment avec un nouveau Code.',
      nzOkText: 'Se déconnecter',
      nzOkDanger: true,
      nzCancelText: 'Annuler',
      nzOnOk: () => {
        this.ouvert.set(false);
        this.deconnexion.emit();
      },
    });
  }
}
