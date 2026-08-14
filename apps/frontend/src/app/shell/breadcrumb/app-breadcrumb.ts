import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { buildBreadcrumbs } from './breadcrumbs';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './app-breadcrumb.html',
  styleUrl: './app-breadcrumb.scss',
})
export class AppBreadcrumb {
  private readonly router = inject(Router);

  protected readonly breadcrumbs = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => buildBreadcrumbs(this.router.routerState.snapshot.root)),
    ),
    { initialValue: buildBreadcrumbs(this.router.routerState.snapshot.root) },
  );
}
