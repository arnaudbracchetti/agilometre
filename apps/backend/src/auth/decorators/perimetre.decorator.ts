import { SetMetadata } from '@nestjs/common';

export const CLE_PERIMETRE = 'perimetre';

export type TypeRessourcePerimetre = 'entite' | 'equipe';

/**
 * Marque une route à ressource unique (`:id`) pour un contrôle dynamique par `PerimetreGuard`,
 * exécuté après `AuthGuard` — docs/design/agregat-politique-des-droits.md §3. Non posé sur aucune
 * route par la carte #59 (aucun Rôle autre que Coach n'a encore de périmètre restreint
 * implémenté) : le mécanisme existe, prêt à être consommé par #61 (`entite`) et #62 (`equipe`).
 */
export const Perimetre = (type: TypeRessourcePerimetre) =>
  SetMetadata(CLE_PERIMETRE, type);
