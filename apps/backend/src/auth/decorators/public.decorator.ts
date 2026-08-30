import { SetMetadata } from '@nestjs/common';

export const CLE_PUBLIC = 'public';

/**
 * Route ouverte, exemptée de `AuthGuard` (parcours participant, écran d'accueil, connexion) —
 * docs/design/agregat-politique-des-droits.md §2.
 */
export const Public = () => SetMetadata(CLE_PUBLIC, true);
