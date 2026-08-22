import { Referentiel } from '../../referentiel/domain/referentiel';
import { RepartitionTourQuery } from '../domain/repartition-tour.query';
import { EtatTour, Session } from '../domain/session';

export interface HistoriqueTourClos {
  questionId: string;
  libelle: string;
  numero: number;
  comptesParNiveau: Record<number, number>;
}

/**
 * Tous les Tours clos de la Session (toutes Questions, tous numéros) — contrairement à
 * `resoudreDernierTourClos`, aucun filtre "dernier seulement" : un revote (#41) garde ses Tours
 * précédents visibles ici. Triés par ordre de Sélection puis par numéro croissant, pour que le
 * frontend reçoive déjà les Tours d'une même Question groupés et consécutifs.
 *
 * `etatsDesTours`/`referentielCharge` sont déjà résolus par l'appelant (`ObtenirPilotageSession`,
 * partagés avec `resoudreProgression`) — jamais une deuxième lecture ici, ce read model reste
 * volontairement léger sur un écran sondé toutes les 2s (docs/design/agregat-tour-de-vote.md §5).
 */
export async function resoudreHistoriqueToursClos(
  session: Session,
  etatsDesTours: readonly EtatTour[],
  repartitions: RepartitionTourQuery,
  referentielCharge: Referentiel,
): Promise<HistoriqueTourClos[]> {
  // Session.estTourValable() est le seul point de vérité pour "un Tour clos sur une Question
  // sautée ne peut venir que d'une fermeture forcée (#44) — aucun résultat n'en découle".
  const tours = etatsDesTours.filter((tour) => session.estTourValable(tour));
  if (tours.length === 0) {
    return [];
  }

  const questions = session.selectionEnrichie(referentielCharge);
  const indexQuestion = new Map(questions.map((q, index) => [q.id, index]));
  const libelleQuestion = new Map(questions.map((q) => [q.id, q.libelle]));

  const repartitionsParTour = await repartitions.listerRepartitionsDesTours(
    tours.map((tour) => tour.tourId),
  );
  const comptesParTourId = new Map(
    repartitionsParTour.map((r) => [r.tourId, r.comptesParNiveau]),
  );

  return tours
    .filter((tour) => indexQuestion.has(tour.questionId))
    .map((tour) => ({
      questionId: tour.questionId,
      libelle: libelleQuestion.get(tour.questionId)!,
      numero: tour.numero,
      comptesParNiveau: comptesParTourId.get(tour.tourId) ?? {},
    }))
    .sort((a, b) => {
      const parIndex =
        indexQuestion.get(a.questionId)! - indexQuestion.get(b.questionId)!;
      return parIndex !== 0 ? parIndex : a.numero - b.numero;
    });
}
