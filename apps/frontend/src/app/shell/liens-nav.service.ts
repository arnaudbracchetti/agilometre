import { Injectable, computed, inject } from '@angular/core';
import { DroitsService } from '../auth/droits.service';
import { AppHeaderLink } from './header/app-header';

/**
 * Menu applicatif filtré par capacité (docs/design/agregat-politique-des-droits.md §2), partagé
 * par `AppShell` (écrans authentifiés) et `Home` (page d'accueil) — un compte Membre d'équipe sans
 * capacité encore accordée (tranche #62) reçoit un menu vide plutôt que des liens qui
 * échoueraient systématiquement en 403. `AppHeader` reste agnostique des droits, c'est ce service
 * qui décide quoi lui passer.
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
      this.droits.peut('gererModelesSession')
        ? { label: 'Modèles de session', routerLink: '/modeles-session' }
        : null,
    ].filter((lien) => lien !== null);
    if (enfantsAdministration.length > 0) {
      liens.push({ label: 'Administration', children: enfantsAdministration });
    }

    if (this.droits.peut('gererSessions')) {
      liens.push({ label: 'Sessions', routerLink: '/sessions' });
    }
    // Une seule page ('/profil', arbre de sélection) sert le Profil d'Équipe (Coach) et le Profil
    // d'Entité (Coach + Direction, #61) — l'un ou l'autre droit suffit à y accéder, l'arbre lui-même
    // se charge de restreindre ce qu'une Direction peut y sélectionner.
    if (this.droits.peut('voirProfilEquipe') || this.droits.peut('voirProfilEntite')) {
      liens.push({ label: 'Profil', routerLink: '/profil' });
    }

    return liens;
  });
}
