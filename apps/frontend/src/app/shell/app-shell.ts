import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AppHeader, AppHeaderLink } from './header/app-header';
import { AppBreadcrumb } from './breadcrumb/app-breadcrumb';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, AppHeader, AppBreadcrumb, NzButtonModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected deconnecter(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  protected readonly liensNav: AppHeaderLink[] = [
    {
      label: 'Administration',
      children: [
        { label: 'Organisation', routerLink: '/organisation' },
        { label: 'Modèles de session', routerLink: '/modeles-session' },
      ],
    },
    { label: 'Sessions', routerLink: '/sessions' },
    { label: 'Profil d’équipe', routerLink: '/profil' },
  ];
}
