import { Component, inject, input } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface AppHeaderLink {
  label: string;
  routerLink?: string;
  href?: string;
  children?: AppHeaderLink[];
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, NzDropdownModule, NzMenuModule, NzIconModule],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  private readonly router = inject(Router);

  readonly liens = input<AppHeaderLink[]>([]);

  private readonly urlActuelle = toSignal(
    this.router.events.pipe(
      filter((evenement): evenement is NavigationEnd => evenement instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected estActif(lien: AppHeaderLink): boolean {
    if (lien.routerLink) {
      const url = this.urlActuelle();
      return url === lien.routerLink || url.startsWith(`${lien.routerLink}/`);
    }
    return (lien.children ?? []).some((enfant) => this.estActif(enfant));
  }
}
