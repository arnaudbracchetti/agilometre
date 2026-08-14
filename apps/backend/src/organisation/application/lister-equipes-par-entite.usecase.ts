import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';

export class ListerEquipesParEntite {
  constructor(private readonly repository: EquipeRepository) {}

  async executer(entiteId: string): Promise<Equipe[]> {
    const equipes = await this.repository.findByEntiteId(entiteId);
    return [...equipes].sort((a, b) => a.nom.localeCompare(b.nom));
  }
}
