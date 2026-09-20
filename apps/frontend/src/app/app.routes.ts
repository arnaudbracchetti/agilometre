import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { droitGuard } from './auth/droit.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'connexion',
    loadComponent: () =>
      import('./auth/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () =>
      import('./auth/mot-de-passe-oublie/mot-de-passe-oublie-page').then(
        (m) => m.MotDePasseOubliePage,
      ),
  },
  {
    path: 'definir-mot-de-passe',
    loadComponent: () =>
      import('./auth/definir-mot-de-passe/definir-mot-de-passe-page').then(
        (m) => m.DefinirMotDePassePage,
      ),
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
    canActivate: [authGuard],
    loadComponent: () => import('./shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'comptes',
        data: { breadcrumb: 'Comptes' },
        loadComponent: () =>
          import('./comptes/comptes-page/comptes-page').then((m) => m.ComptesPage),
      },
      {
        path: 'mon-compte',
        data: { breadcrumb: 'Mon compte' },
        loadComponent: () =>
          import('./auth/mon-compte/mon-compte-page').then((m) => m.MonComptePage),
      },
      {
        path: 'organisation',
        canActivate: [droitGuard('gererOrganisation')],
        data: { breadcrumb: 'Organisation' },
        loadComponent: () =>
          import('./organisation/organisation-page/organisation-page').then(
            (m) => m.OrganisationPage,
          ),
      },
      {
        path: 'profil',
        // Label neutre : cette page sert le Profil d'Équipe (Coach + Membre d'équipe, #62) et le
        // Profil d'Entité (Coach + Direction, #61) selon la sélection faite dans l'arbre — le même
        // arbre pour les trois Rôles, filtré côté serveur à ce que chacun peut voir (#62 : Direction
        // n'y déplie aucune Équipe, un Membre n'y voit que les siennes).
        data: { breadcrumb: 'Profil' },
        loadComponent: () =>
          import('./organisation/profil-page/profil-page').then((m) => m.ProfilPage),
        children: [
          {
            path: 'equipe/:id',
            // Pas de son propre `breadcrumb` (délibérément vide, pas absent) : sans ce garde,
            // `paramsInheritanceStrategy: 'always'` fait hériter le `breadcrumb` du parent
            // `profil` jusqu'ici, et `buildBreadcrumbs` (voir breadcrumbs.ts) le pousserait une
            // seconde fois — doublon "Profil > Profil" dans le fil d'Ariane.
            data: { breadcrumb: '' },
            canActivate: [droitGuard('voirProfilEquipe')],
            loadComponent: () =>
              import('./organisation/profil-equipe-page/profil-equipe-page').then(
                (m) => m.ProfilEquipePage,
              ),
          },
          {
            path: 'entite/:id',
            data: { breadcrumb: '' },
            loadComponent: () =>
              import('./organisation/profil-entite-page/profil-entite-page').then(
                (m) => m.ProfilEntitePage,
              ),
          },
        ],
      },
      {
        path: 'collecte',
        canActivate: [droitGuard('gererCampagnesPouls')],
        data: { breadcrumb: 'Collecte de pouls' },
        loadComponent: () =>
          import('./collecte/collecte-page/collecte-page').then((m) => m.CollectePage),
      },
      {
        path: 'modeles-collecte',
        data: { breadcrumb: 'Modèles de collecte' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./modeles-collecte/bibliotheque-page/bibliotheque-page').then(
                (m) => m.BibliothequePage,
              ),
          },
          {
            path: ':id',
            data: { breadcrumb: 'Modifier le Modèle' },
            loadComponent: () =>
              import('./modeles-collecte/composer-page/composer-page').then(
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
