import { Injectable, inject } from '@angular/core';
import { CAPACITES, Capacite } from '@agilometre/shared';
import { AuthService } from './auth.service';

/**
 * `peut()` compare le Rôle courant à `CAPACITES` (`@agilometre/shared`, même carte que le
 * backend) — la logique n'existe qu'à un seul endroit, voir
 * docs/design/agregat-politique-des-droits.md §2.
 */
@Injectable({ providedIn: 'root' })
export class DroitsService {
  private readonly auth = inject(AuthService);

  peut(capacite: Capacite): boolean {
    const role = this.auth.role();
    return role !== null && CAPACITES[capacite].includes(role);
  }
}
