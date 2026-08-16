import { ModeleSessionRepository } from '../domain/modele-session.repository';

export type ResultatSupprimerModeleSession =
  { type: 'introuvable' } | { type: 'supprime' };

export class SupprimerModeleSession {
  constructor(private readonly repository: ModeleSessionRepository) {}

  async executer(id: string): Promise<ResultatSupprimerModeleSession> {
    const modele = await this.repository.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    // Aucune garde d'usage : un Modèle est toujours supprimable, même déjà utilisé par une ou
    // plusieurs Sessions (ADR-0009) — contrairement à SupprimerEquipe.
    await this.repository.remove(id);
    return { type: 'supprime' };
  }
}
