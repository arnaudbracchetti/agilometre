import { Injectable, computed, inject } from '@angular/core';
import { DroitsService } from '../auth/droits.service';
import { AppHeaderLink } from './header/app-header';

/**
 * Menu applicatif filtré par capacité (docs/design/agregat-politique-des-droits.md §2), partagé
 * par `AppShell` (écrans authentifiés) et `Home` (page d'accueil). `AppHeader` reste agnostique des
 * droits, c'est ce service qui décide quoi lui passer.
 */
@Injectable({ providedIn: 'root' })
export class LiensNavService {
  private readonly droits = inject(DroitsService);

  readonly liens = computed<AppHeaderLink[]>(() => {
    const liens: AppHeaderLink[] = [];

    const enfantsAdministration = [
      this.droits.peut('gererComptes')
        ? { label: 'Comptes', routerLink: '/comptes' }
        : null,
      this.droits.peut('gererOrganisation')
        ? { label: 'Organisation', routerLink: '/organisation' }
        : null,
      this.droits.peut('gererModelesCollecte')
        ? { label: 'Modèles de collecte', routerLink: '/modeles-collecte' }
        : null,
    ].filter((lien) => lien !== null);
    if (enfantsAdministration.length > 0) {
      liens.push({ label: 'Administration', children: enfantsAdministration });
    }

    if (this.droits.peut('gererSessions')) {
      liens.push({ label: 'Sessions', routerLink: '/sessions' });
    }

    // Écran « Collecte d'informations » (doc/spec/annexes/campagne-de-pouls.md §6) : ce ticket ne
    // porte que l'onglet Campagnes, la fusion avec l'onglet Sessions ci-dessus appartient à la
    // carte #81. Lien provisoire, distinct du lien Sessions jusqu'à cette fusion.
    if (this.droits.peut('gererCampagnesPouls')) {
      liens.push({ label: 'Collecte de pouls', routerLink: '/collecte' });
    }

    // Une seule page ('/profil', arbre de sélection) sert le Profil d'Équipe (Coach + Membre
    // d'équipe, #62) et le Profil d'Entité (Coach + Direction, #61) — l'un ou l'autre droit suffit
    // à y accéder, l'arbre lui-même se charge de filtrer ce que chaque Rôle peut y sélectionner
    // (`ArbreOrganisation.entitesNonDepliables`).
    if (this.droits.peut('voirProfilEquipe') || this.droits.peut('voirProfilEntite')) {
      liens.push({ label: 'Profil', routerLink: '/profil' });
    }

    return liens;
  });
}
