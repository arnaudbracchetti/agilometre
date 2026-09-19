import {
  ErreurInvariantModeleCollecte,
  ModeleCollecte,
} from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';

export type ResultatRenommerModeleCollecte =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurInvariantModeleCollecte }
  | { type: 'renomme'; modele: ModeleCollecte };

export class RenommerModeleCollecte {
  constructor(private readonly repository: ModeleCollecteRepository) {}

  async executer(
    id: string,
    nom: string,
  ): Promise<ResultatRenommerModeleCollecte> {
    const modele = await this.repository.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    const resultat = modele.renommer(nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(modele);
    return { type: 'renomme', modele };
  }
}
