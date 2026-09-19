import { randomUUID } from 'node:crypto';
import {
  ErreurInvariantModeleCollecte,
  ModeleCollecte,
} from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';

export type ResultatCreerModeleCollecte =
  | { type: 'invalide'; erreur: ErreurInvariantModeleCollecte }
  | { type: 'cree'; modele: ModeleCollecte };

export class CreerModeleCollecte {
  constructor(private readonly repository: ModeleCollecteRepository) {}

  async executer(nom: string): Promise<ResultatCreerModeleCollecte> {
    const resultat = ModeleCollecte.creer(randomUUID(), nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(resultat.valeur);
    return { type: 'cree', modele: resultat.valeur };
  }
}
