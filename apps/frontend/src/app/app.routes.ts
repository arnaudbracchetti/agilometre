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
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./organisation/organisation-page/organisation-page').then(
                (m) => m.OrganisationPage,
              ),
          },
          {
            path: 'equipes/:id/profil',
            data: { breadcrumb: 'Profil de l’Équipe' },
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                  import('./organisation/profil-page/profil-page').then(
                    (m) => m.ProfilPage,
                  ),
              },
              {
                path: ':themeId',
                data: { breadcrumb: 'Lecture fine' },
                loadComponent: () =>
                  import('./organisation/lecture-fine-page/lecture-fine-page').then(
                    (m) => m.LectureFinePage,
                  ),
              },
            ],
          },
        ],
      },
      {
        path: 'modeles-session',
        data: { breadcrumb: 'Modèles de session' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./modeles-session/bibliotheque-page/bibliotheque-page').then(
                (m) => m.BibliothequePage,
              ),
          },
          {
            path: ':id',
            data: { breadcrumb: 'Modifier le Modèle' },
            loadComponent: () =>
              import('./modeles-session/composer-page/composer-page').then(
                (m) => m.ComposerPage,
              ),
          },
        ],
      },
      {
        path: 'sessions',
        data: { breadcrumb: 'Sessions' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./sessions/bibliotheque-page/bibliotheque-page').then(
                (m) => m.BibliothequePage,
              ),
          },
          {
            path: ':id',
            data: { breadcrumb: 'Ajuster la session' },
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                  import('./sessions/ajustement-page/ajustement-page').then(
                    (m) => m.AjustementPage,
                  ),
              },
              {
                path: 'pilotage',
                data: { breadcrumb: 'Piloter la séance' },
                loadComponent: () =>
                  import('./sessions/pilotage-page/pilotage-page').then(
                    (m) => m.PilotagePage,
                  ),
              },
              {
                path: 'synthese',
                data: { breadcrumb: 'Synthèse' },
                loadComponent: () =>
                  import('./sessions/synthese-page/synthese-page').then(
                    (m) => m.SynthesePage,
                  ),
              },
            ],
          },
        ],
      },
    ],
  },
];
