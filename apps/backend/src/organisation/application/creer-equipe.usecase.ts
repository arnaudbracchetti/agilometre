import { randomUUID } from 'node:crypto';
import { Equipe, ErreurInvariantEquipe } from '../domain/equipe';
import {
  EquipeRepository,
  NomEquipeDejaUtiliseError,
} from '../domain/equipe.repository';
import { EntiteRepository } from '../domain/entite.repository';

export type ResultatCreerEquipe =
  | { type: 'entite_introuvable' }
  | { type: 'invalide'; erreur: ErreurInvariantEquipe }
  | { type: 'doublon' }
  | { type: 'creee'; equipe: Equipe };

export class CreerEquipe {
  constructor(
    private readonly equipes: EquipeRepository,
    private readonly entites: EntiteRepository,
  ) {}

  async executer(nom: string, entiteId: string): Promise<ResultatCreerEquipe> {
    const entite = await this.entites.findById(entiteId);
    if (!entite) {
      return { type: 'entite_introuvable' };
    }

    const resultat = Equipe.creer(randomUUID(), nom, entiteId);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    // L'agrégat Equipe ne connaît pas les autres instances : l'unicité du nom est une règle de
    // coordination entre Équipes, elle vit ici (use case) et non dans Equipe.creer() (cf. /ddd).
    const existante = await this.equipes.trouverParNom(resultat.valeur.nom);
    if (existante) {
      return { type: 'doublon' };
    }
    try {
      await this.equipes.save(resultat.valeur);
    } catch (erreur) {
      // Filet de sécurité contre une race condition entre la vérification ci-dessus et l'écriture
      // (contrainte d'unicité en base) — traduit en le même résultat que la garde applicative.
      if (erreur instanceof NomEquipeDejaUtiliseError) {
        return { type: 'doublon' };
      }
      throw erreur;
    }
    return { type: 'creee', equipe: resultat.valeur };
  }
}
