import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './header/app-header';
import { HeaderAuthActions } from './header/header-auth-actions';
import { AppBreadcrumb } from './breadcrumb/app-breadcrumb';
import { LiensNavService } from './liens-nav.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, AppHeader, HeaderAuthActions, AppBreadcrumb],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly liensNav = inject(LiensNavService).liens;
}
