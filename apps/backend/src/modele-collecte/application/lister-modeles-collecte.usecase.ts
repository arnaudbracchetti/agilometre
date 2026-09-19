import {
  LigneBibliothequeModeleCollecte,
  ModeleCollecteBibliothequeQuery,
} from '../domain/modele-collecte-bibliotheque.query';

export class ListerModelesCollecte {
  constructor(private readonly query: ModeleCollecteBibliothequeQuery) {}

  async executer(): Promise<LigneBibliothequeModeleCollecte[]> {
    const lignes = await this.query.lister();
    return [...lignes].sort((a, b) => a.nom.localeCompare(b.nom));
  }
}
