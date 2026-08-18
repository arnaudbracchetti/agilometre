import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'projection/:sessionId',
    loadComponent: () =>
      import('./sessions/projection-page/projection-page').then(
        (m) => m.ProjectionPage,
      ),
  },
  {
    path: 'vote',
    loadComponent: () =>
      import('./participant/vote-page/vote-page').then((m) => m.VotePage),
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
      {
        path: 'sessions',
        data: { breadcrumb: 'Sessions' },
        loadComponent: () =>
          import('./sessions/bibliotheque-page/bibliotheque-page').then(
            (m) => m.BibliothequePage,
          ),
      },
      {
        path: 'sessions/nouvelle',
        data: { breadcrumb: 'Créer une session' },
        loadComponent: () =>
          import('./sessions/creer-page/creer-page').then((m) => m.CreerPage),
      },
      {
        path: 'sessions/:id',
        data: { breadcrumb: 'Ajuster la session' },
        loadComponent: () =>
          import('./sessions/ajustement-page/ajustement-page').then(
            (m) => m.AjustementPage,
          ),
      },
      {
        path: 'sessions/:id/pilotage',
        data: { breadcrumb: 'Piloter la séance' },
        loadComponent: () =>
          import('./sessions/pilotage-page/pilotage-page').then(
            (m) => m.PilotagePage,
          ),
      },
    ],
  },
];
