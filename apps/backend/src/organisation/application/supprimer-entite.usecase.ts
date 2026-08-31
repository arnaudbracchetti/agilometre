import { EntiteRepository } from '../domain/entite.repository';
import { EquipeRepository } from '../domain/equipe.repository';

export type ResultatSupprimerEntite =
  { type: 'introuvable' } | { type: 'referencee' } | { type: 'supprimee' };

/**
 * Garde de suppression : refusée tant qu'au moins une Équipe est rattachée
 * (`EquipeRepository.compterParEntite`, docs/design/agregat-organisation.md §2) — pas une méthode
 * de domaine sur `Entite`, qui ne possède pas la liste de ses Équipes (ADR-0005). Le nettoyage des
 * Habilitations `entiteId` orphelines (ADR-0006) est fait par `EntiteRepository.remove`, dans la
 * même transaction Postgres que la suppression.
 */
export class SupprimerEntite {
  constructor(
    private readonly entites: EntiteRepository,
    private readonly equipes: EquipeRepository,
  ) {}

  async executer(id: string): Promise<ResultatSupprimerEntite> {
    const entite = await this.entites.findById(id);
    if (!entite) {
      return { type: 'introuvable' };
    }

    if ((await this.equipes.compterParEntite(id)) > 0) {
      return { type: 'referencee' };
    }

    await this.entites.remove(id);
    return { type: 'supprimee' };
  }
}
