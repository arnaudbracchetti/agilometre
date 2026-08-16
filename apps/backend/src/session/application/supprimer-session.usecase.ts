import { SessionRepository } from '../domain/session.repository';

export type ResultatSupprimerSession =
  { type: 'introuvable' } | { type: 'non_supprimable' } | { type: 'supprime' };

export class SupprimerSession {
  constructor(private readonly repository: SessionRepository) {}

  async executer(id: string): Promise<ResultatSupprimerSession> {
    const session = await this.repository.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    if (!session.estModifiable()) {
      return { type: 'non_supprimable' };
    }
    await this.repository.remove(id);
    return { type: 'supprime' };
  }
}
