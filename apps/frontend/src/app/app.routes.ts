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
      {
        path: 'modeles-session',
        data: { breadcrumb: 'Modèles de session' },
        loadComponent: () =>
          import('./modeles-session/bibliotheque-page/bibliotheque-page').then(
            (m) => m.BibliothequePage,
          ),
      },
      {
        path: 'modeles-session/:id',
        data: { breadcrumb: 'Modifier le Modèle' },
        loadComponent: () =>
          import('./modeles-session/composer-page/composer-page').then(
            (m) => m.ComposerPage,
          ),
      },
    ],
  },
];
