import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AuthService } from '../../auth/auth.service';

/**
 * Bloc d'actions à droite du bandeau — partagé par `AppShell` (écrans authentifiés) et `Home` (le
 * même bandeau ne doit pas proposer « Se connecter » à un visiteur déjà connecté, ni l'inverse).
 */
@Component({
  selector: 'app-header-auth-actions',
  imports: [RouterLink, NzButtonModule],
  templateUrl: './header-auth-actions.html',
})
export class HeaderAuthActions {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly estConnecte = this.auth.estConnecte;

  protected deconnecter(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
