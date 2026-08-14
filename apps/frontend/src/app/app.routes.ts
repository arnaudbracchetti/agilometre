import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: '',
    loadComponent: () => import('./shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'organisation',
        data: { breadcrumb: 'Organisation' },
        loadComponent: () =>
          import('./organisation/organisation-page/organisation-page').then(
            (m) => m.OrganisationPage,
          ),
      },
    ],
  },
];
