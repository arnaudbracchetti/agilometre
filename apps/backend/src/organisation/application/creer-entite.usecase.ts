import { randomUUID } from 'node:crypto';
import { Entite, ErreurInvariantEntite } from '../domain/entite';
import {
  EntiteRepository,
  NomEntiteDejaUtiliseError,
} from '../domain/entite.repository';

export type ResultatCreerEntite =
  | { type: 'invalide'; erreur: ErreurInvariantEntite }
  | { type: 'doublon' }
  | { type: 'cree'; entite: Entite };

export class CreerEntite {
  constructor(private readonly repository: EntiteRepository) {}

  async executer(nom: string): Promise<ResultatCreerEntite> {
    const resultat = Entite.creer(randomUUID(), nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    // L'agrégat Entite ne connaît pas les autres instances : l'unicité du nom est une règle de
    // coordination entre Entités, elle vit ici (use case) et non dans Entite.creer() (cf. /ddd).
    const existante = await this.repository.trouverParNom(resultat.valeur.nom);
    if (existante) {
      return { type: 'doublon' };
    }
    try {
      await this.repository.save(resultat.valeur);
    } catch (erreur) {
      // Filet de sécurité contre une race condition entre la vérification ci-dessus et l'écriture
      // (contrainte d'unicité en base) — traduit en le même résultat que la garde applicative.
      if (erreur instanceof NomEntiteDejaUtiliseError) {
        return { type: 'doublon' };
      }
      throw erreur;
    }
    return { type: 'cree', entite: resultat.valeur };
  }
}
