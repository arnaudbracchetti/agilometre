import { Injectable, computed, inject } from '@angular/core';
import { DroitsService } from '../auth/droits.service';
import { AppHeaderLink } from './header/app-header';

/**
 * Menu applicatif filtré par capacité (docs/design/agregat-politique-des-droits.md §2), partagé
 * par `AppShell` (écrans authentifiés) et `Home` (page d'accueil) — un compte Direction/Membre
 * d'équipe sans capacité encore accordée (tranches #61/#62) reçoit un menu vide plutôt que des
 * liens qui échoueraient systématiquement en 403. `AppHeader` reste agnostique des droits, c'est
 * ce service qui décide quoi lui passer.
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
    if (this.droits.peut('voirProfilEquipe')) {
      liens.push({ label: 'Profil d’équipe', routerLink: '/profil' });
    }

    return liens;
  });
}
