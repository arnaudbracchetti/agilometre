import { SetMetadata } from '@nestjs/common';
import { Capacite } from '@agilometre/shared';

export const CLE_CAPACITE = 'capacite';

/**
 * Nomme la capacité que protège une route. `AuthGuard` consulte `CAPACITES[capacite]`
 * (`@agilometre/shared`) pour savoir quels Rôles y ont accès — la route ne liste jamais les Rôles
 * en clair, voir docs/design/agregat-politique-des-droits.md §2.
 */
export const Requiert = (capacite: Capacite) =>
  SetMetadata(CLE_CAPACITE, capacite);
