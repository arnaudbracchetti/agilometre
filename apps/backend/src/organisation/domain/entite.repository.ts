import { Entite } from './entite';

/**
 * Levée par une implémentation de repository quand `save()` viole la contrainte d'unicité de nom
 * en base (filet de sécurité contre une race condition — la garde applicative normale passe par
 * `trouverParNom` dans les use cases, voir docs/design/agregat-organisation.md).
 */
export class NomEntiteDejaUtiliseError extends Error {
  constructor() {
    super('Une Entité porte déjà ce nom');
    this.name = 'NomEntiteDejaUtiliseError';
  }
}

export interface EntiteRepository {
  findById(id: string): Promise<Entite | null>;
  findAll(): Promise<Entite[]>;
  /** Recherche insensible à la casse — garde d'unicité pour CreerEntite/RenommerEntite. */
  trouverParNom(nom: string): Promise<Entite | null>;
  /** @throws {NomEntiteDejaUtiliseError} si la contrainte d'unicité de nom est violée en base. */
  save(entite: Entite): Promise<void>;
}
