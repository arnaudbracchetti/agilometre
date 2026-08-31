import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthService } from '../auth.service';

/**
 * Partagé entre l'invitation initiale et la réinitialisation — un seul mécanisme de Jeton de
 * compte (doc/spec/annexes/gestion-des-droits.md, "Authentification"), donc un seul écran.
 */
@Component({
  selector: 'app-definir-mot-de-passe-page',
  imports: [FormsModule, RouterLink, NzButtonModule, NzInputModule],
  templateUrl: './definir-mot-de-passe-page.html',
  styleUrl: './definir-mot-de-passe-page.scss',
})
export class DefinirMotDePassePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly jeton = this.route.snapshot.queryParamMap.get('jeton');

  protected readonly motDePasse = signal('');
  protected readonly confirmation = signal('');
  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly jetonInvalide = signal(this.jeton === null);

  protected readonly formulaireValide = computed(
    () => this.motDePasse().length >= 8 && this.motDePasse() === this.confirmation(),
  );

  protected definir(): void {
    if (!this.jeton || !this.formulaireValide()) {
      return;
    }
    this.erreur.set(null);
    this.enCours.set(true);
    this.auth.definirMotDePasse(this.jeton, this.motDePasse()).subscribe({
      next: () => this.router.navigateByUrl('/connexion'),
      error: (erreur: HttpErrorResponse) => {
        this.enCours.set(false);
        if (erreur.status === 410) {
          this.jetonInvalide.set(true);
          return;
        }
        this.erreur.set('Le mot de passe doit contenir au moins 8 caractères.');
      },
    });
  }
}
