import { randomUUID } from 'node:crypto';
import { Equipe, ErreurAjoutMembre } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';

export type ResultatAjouterMembre =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurAjoutMembre }
  | { type: 'ajoute'; equipe: Equipe };

export class AjouterMembre {
  constructor(private readonly repository: EquipeRepository) {}

  async executer(
    equipeId: string,
    nom: string,
    email: string,
  ): Promise<ResultatAjouterMembre> {
    const equipe = await this.repository.findById(equipeId);
    if (!equipe) {
      return { type: 'introuvable' };
    }
    const resultat = equipe.ajouterMembre(randomUUID(), nom, email);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(equipe);
    return { type: 'ajoute', equipe };
  }
}
