import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader, AppHeaderLink } from './header/app-header';
import { AppBreadcrumb } from './breadcrumb/app-breadcrumb';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, AppHeader, AppBreadcrumb],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly liensNav: AppHeaderLink[] = [
    { label: 'Organisation', routerLink: '/organisation' },
    { label: 'Modèles de session', routerLink: '/modeles-session' },
    { label: 'Sessions', routerLink: '/sessions' },
  ];
}
