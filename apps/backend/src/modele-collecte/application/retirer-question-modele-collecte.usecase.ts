import { ModeleCollecte } from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';

export type ResultatRetirerQuestionModeleCollecte =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | { type: 'retiree'; modele: ModeleCollecte };

export class RetirerQuestionModeleCollecte {
  constructor(private readonly repository: ModeleCollecteRepository) {}

  async executer(
    id: string,
    questionId: string,
  ): Promise<ResultatRetirerQuestionModeleCollecte> {
    const modele = await this.repository.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    const resultat = modele.retirerQuestion(questionId);
    if (resultat.estEchec) {
      return { type: 'question_introuvable' };
    }
    await this.repository.save(modele);
    return { type: 'retiree', modele };
  }
}
