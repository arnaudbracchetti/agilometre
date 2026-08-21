import { Question } from '../../referentiel/domain/question';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { RepartitionTourQuery } from '../domain/repartition-tour.query';

export interface DernierTourClos {
  numero: number;
  comptesParNiveau: Record<number, number>;
}

/**
 * Le dernier Tour clos de la Question courante — seul celui-ci compte pour l'affichage, un revote
 * ne fait que rendre ce "dernier" mouvant, sans rien changer ici. Partagé par
 * ObtenirPilotageSession et ObtenirProjectionSession pour ne jamais diverger, même principe que
 * `resoudreQuestionCourante`.
 */
export async function resoudreDernierTourClos(
  sessionId: string,
  questionCourante: Question | null,
  etatTours: EtatToursQuery,
  repartitions: RepartitionTourQuery,
): Promise<DernierTourClos | null> {
  if (!questionCourante) {
    return null;
  }
  const tours = await etatTours.listerEtatsDesToursDeLaSession(sessionId);
  const dernier = tours
    .filter((t) => t.questionId === questionCourante.id && t.clos)
    .reduce<(typeof tours)[number] | null>(
      (max, tour) => (!max || tour.numero > max.numero ? tour : max),
      null,
    );
  if (!dernier) {
    return null;
  }
  const [repartition] = await repartitions.listerRepartitionsDesTours([
    dernier.tourId,
  ]);
  return {
    numero: dernier.numero,
    comptesParNiveau: repartition?.comptesParNiveau ?? {},
  };
}
