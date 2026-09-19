import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';

export type ResultatSupprimerModeleCollecte =
  { type: 'introuvable' } | { type: 'supprime' };

export class SupprimerModeleCollecte {
  constructor(private readonly repository: ModeleCollecteRepository) {}

  async executer(id: string): Promise<ResultatSupprimerModeleCollecte> {
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
