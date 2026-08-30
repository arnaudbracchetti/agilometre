import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, NzButtonModule, NzInputModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly email = signal('');
  protected readonly motDePasse = signal('');
  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected seConnecter(): void {
    this.erreur.set(null);
    this.enCours.set(true);
    this.auth.login(this.email(), this.motDePasse()).subscribe({
      next: () => {
        const retour = this.route.snapshot.queryParamMap.get('retour');
        this.router.navigateByUrl(retour ?? '/');
      },
      error: (erreur: HttpErrorResponse) => {
        this.enCours.set(false);
        this.erreur.set(
          erreur.status === 401
            ? 'Email ou mot de passe incorrect.'
            : 'Connexion impossible pour le moment.',
        );
      },
    });
  }
}
