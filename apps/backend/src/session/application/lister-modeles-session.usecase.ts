import {
  LigneBibliothequeModeleSession,
  ModeleSessionBibliothequeQuery,
} from '../domain/modele-session-bibliotheque.query';

export class ListerModelesSession {
  constructor(private readonly query: ModeleSessionBibliothequeQuery) {}

  async executer(): Promise<LigneBibliothequeModeleSession[]> {
    const lignes = await this.query.lister();
    return [...lignes].sort((a, b) => a.nom.localeCompare(b.nom));
  }
}
