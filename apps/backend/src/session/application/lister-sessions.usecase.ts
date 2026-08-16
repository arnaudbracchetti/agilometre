import {
  LigneListeSession,
  SessionListeQuery,
} from '../domain/session-liste.query';

export class ListerSessions {
  constructor(private readonly query: SessionListeQuery) {}

  async executer(): Promise<LigneListeSession[]> {
    const lignes = await this.query.lister();
    return [...lignes].sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
