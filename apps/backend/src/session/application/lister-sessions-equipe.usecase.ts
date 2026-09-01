import {
  LigneListeSession,
  SessionListeQuery,
} from '../domain/session-liste.query';

export class ListerSessionsEquipe {
  constructor(private readonly query: SessionListeQuery) {}

  async executer(equipeId: string): Promise<LigneListeSession[]> {
    const lignes = await this.query.listerParEquipe(equipeId);
    return [...lignes].sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
