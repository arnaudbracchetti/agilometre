import { Equipe, ErreurInvariantEquipe } from '../domain/equipe';
import {
  EquipeRepository,
  NomEquipeDejaUtiliseError,
} from '../domain/equipe.repository';

export type ResultatRenommerEquipe =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurInvariantEquipe }
  | { type: 'doublon' }
  | { type: 'renommee'; equipe: Equipe };

export class RenommerEquipe {
  constructor(private readonly repository: EquipeRepository) {}

  async executer(id: string, nom: string): Promise<ResultatRenommerEquipe> {
    const equipe = await this.repository.findById(id);
    if (!equipe) {
      return { type: 'introuvable' };
    }

    // Même règle de coordination que CreerEquipe (cf. /ddd) : l'Équipe trouvée n'est un vrai
    // doublon que si ce n'est pas elle-même (renommer en gardant son propre nom doit rester
    // possible, y compris à la casse près).
    const existante = await this.repository.trouverParNom(nom);
    if (existante && existante.id !== id) {
      return { type: 'doublon' };
    }

    const resultat = equipe.renommer(nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    try {
      await this.repository.save(equipe);
    } catch (erreur) {
      if (erreur instanceof NomEquipeDejaUtiliseError) {
        return { type: 'doublon' };
      }
      throw erreur;
    }
    return { type: 'renommee', equipe };
  }
}
