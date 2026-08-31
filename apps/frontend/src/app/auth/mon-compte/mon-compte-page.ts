import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { UtilisateurDto } from '@agilometre/shared';
import { AuthService } from '../auth.service';
import { libelleRole } from '../../comptes/role-libelle';

/** Accessible à tout Rôle connecté (capacité `gererSonCompte`) — jamais le mot de passe d'autrui. */
@Component({
  selector: 'app-mon-compte-page',
  imports: [FormsModule, NzButtonModule, NzInputModule, NzModalModule],
  templateUrl: './mon-compte-page.html',
  styleUrl: './mon-compte-page.scss',
})
export class MonComptePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  protected readonly libelleRole = libelleRole;
  protected readonly compte = signal<UtilisateurDto | null>(null);

  protected readonly motDePasseActuel = signal('');
  protected readonly nouveauMotDePasse = signal('');
  protected readonly confirmation = signal('');
  protected readonly enCours = signal(false);

  protected readonly formulaireValide = computed(
    () =>
      this.motDePasseActuel().length > 0 &&
      this.nouveauMotDePasse().length >= 8 &&
      this.nouveauMotDePasse() === this.confirmation(),
  );

  ngOnInit(): void {
    this.auth.obtenirMonCompte().subscribe({
      next: (compte) => this.compte.set(compte),
      error: () =>
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent: 'Impossible de charger les informations du compte.',
        }),
    });
  }

  protected changer(): void {
    if (!this.formulaireValide()) {
      return;
    }
    this.enCours.set(true);
    this.auth
      .changerMotDePasse(this.motDePasseActuel(), this.nouveauMotDePasse())
      .subscribe({
        next: () => {
          this.enCours.set(false);
          this.motDePasseActuel.set('');
          this.nouveauMotDePasse.set('');
          this.confirmation.set('');
          this.message.success('Mot de passe changé.');
        },
        error: (erreur: HttpErrorResponse) => {
          this.enCours.set(false);
          this.modal.error({
            nzTitle: 'Erreur',
            nzContent:
              erreur.status === 400
                ? 'Mot de passe actuel incorrect, ou nouveau mot de passe trop court.'
                : 'Impossible de changer le mot de passe pour le moment.',
          });
        },
      });
  }
}
