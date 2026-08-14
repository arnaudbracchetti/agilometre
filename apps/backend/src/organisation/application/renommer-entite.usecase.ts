import { Entite, ErreurInvariantEntite } from '../domain/entite';
import {
  EntiteRepository,
  NomEntiteDejaUtiliseError,
} from '../domain/entite.repository';

export type ResultatRenommerEntite =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurInvariantEntite }
  | { type: 'doublon' }
  | { type: 'renomme'; entite: Entite };

export class RenommerEntite {
  constructor(private readonly repository: EntiteRepository) {}

  async executer(id: string, nom: string): Promise<ResultatRenommerEntite> {
    const entite = await this.repository.findById(id);
    if (!entite) {
      return { type: 'introuvable' };
    }

    // Même règle de coordination que CreerEntite (cf. /ddd) : l'Entité trouvée n'est un vrai
    // doublon que si ce n'est pas elle-même (renommer en gardant son propre nom doit rester
    // possible, y compris à la casse près).
    const existante = await this.repository.trouverParNom(nom);
    if (existante && existante.id !== id) {
      return { type: 'doublon' };
    }

    const resultat = entite.renommer(nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    try {
      await this.repository.save(entite);
    } catch (erreur) {
      // Filet de sécurité contre une race condition entre la vérification ci-dessus et l'écriture
      // (contrainte d'unicité en base) — traduit en le même résultat que la garde applicative.
      if (erreur instanceof NomEntiteDejaUtiliseError) {
        return { type: 'doublon' };
      }
      throw erreur;
    }
    return { type: 'renomme', entite };
  }
}
