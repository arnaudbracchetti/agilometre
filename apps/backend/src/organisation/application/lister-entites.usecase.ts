import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';

export class ListerEntites {
  constructor(private readonly repository: EntiteRepository) {}

  async executer(): Promise<Entite[]> {
    const entites = await this.repository.findAll();
    return [...entites].sort((a, b) => a.nom.localeCompare(b.nom));
  }
}
