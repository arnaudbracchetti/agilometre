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
        path: 'profil-equipe',
        data: { breadcrumb: 'Profil d’équipe' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./organisation/profil-equipe-page/profil-equipe-page').then(
                (m) => m.ProfilEquipePage,
              ),
          },
          {
            path: ':id',
            // Pas de son propre `breadcrumb` (délibérément vide, pas absent) : sans ce garde,
            // `paramsInheritanceStrategy: 'always'` fait hériter le `breadcrumb` du parent
            // `profil-equipe` jusqu'ici, et `buildBreadcrumbs` (voir breadcrumbs.ts) le pousserait
            // une seconde fois — doublon "Profil d’équipe > Profil d’équipe" dans le fil d'Ariane.
            data: { breadcrumb: '' },
            loadComponent: () =>
              import('./organisation/profil-equipe-page/profil-equipe-page').then(
                (m) => m.ProfilEquipePage,
              ),
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
