/** Le cran de consensus restitué pour une Question, à la place de l'écart-type brut. */
export type CranConsensus = 'FORT' | 'MODERE' | 'FAIBLE';

/**
 * Résultat du calcul de Palier sur une population de Niveaux. Un effectif nul n'a jamais de
 * Palier — jamais un Palier 1 par défaut (PRD §6).
 *
 * Deux indicateurs de progression, chacun sur une seule population (jamais de fusion des deux
 * populations en un seul chiffre composite, qui masquerait ce qu'il mesure vraiment) :
 * - `tauxApproche` : proximité du passage au Palier supérieur, normalisée par `seuilPalier` — 100%
 *   coïncide exactement avec le franchissement. `null` quand le Palier est déjà au maximum (4) :
 *   il n'existe pas de Niveau 5 à approcher.
 * - `margeAvantDescente` : proximité de la chute vers le Palier inférieur — 0% signifie que le
 *   Palier n'est validé qu'à la limite stricte du seuil (une seule Réponse en moins et il tombe),
 *   100% qu'il est solidement validé (toutes les Réponses sont au Palier courant ou au-dessus).
 */
export type ResultatPalier =
  | { effectif: 0 }
  | {
      effectif: number;
      palier: 1 | 2 | 3 | 4;
      tauxApproche: number | null;
      margeAvantDescente: number;
    };

/** Un intervalle calendaire contigu : `debut` inclus, `fin` exclue. */
export interface Periode {
  debut: Date;
  fin: Date;
}

/**
 * Concentre les règles de calcul du moteur de scoring (ADR-0019) : Palier + Taux d'approche
 * (grain Thème/Équipe/Entité), Moyenne + Dispersion (grain Question), découpage en Périodes
 * calendaires. Classe abstraite plutôt que fonctions libres ou méthodes statiques : seules les 3
 * méthodes qui *constituent* l'algorithme de scoring proprement dit sont `abstract`, pour
 * permettre plusieurs implémentations choisies à l'instanciation (voir `ScoringV1`) sans que les
 * appelants aient à changer. Le découpage en Périodes et la conversion pourcentage→fraction sont
 * des utilitaires calendaires/mathématiques indépendants de l'algorithme choisi : ils vivent en
 * méthodes concrètes ici, héritées telles quelles par toute implémentation, plutôt que dispersés
 * dans un fichier séparé.
 */
export abstract class Scoring {
  /**
   * Point d'ancrage fixe pour le découpage en Périodes : garantit des Périodes contiguës et
   * identiques pour toutes les Équipes d'une instance, quelle que soit la durée configurée — y
   * compris quand elle ne divise pas 12, où un ancrage sur le 1er janvier de chaque année casserait
   * la contiguïté d'une Période à l'autre. La valeur elle-même est arbitraire (n'importe quelle
   * date fixe antérieure aux données réelles conviendrait) — seule compte sa fixité.
   */
  private static readonly DATE_REFERENCE = new Date(Date.UTC(2000, 0, 1));

  abstract calculerPalier(
    niveaux: number[],
    seuilPalier: number,
  ): ResultatPalier;
  abstract calculerMoyenne(niveaux: number[]): number | null;
  abstract calculerDispersion(niveaux: number[]): CranConsensus | null;

  /** La Période calendaire, de la durée donnée, qui contient `date`. */
  periodeContenant(date: Date, dureePeriodeMois: number): Periode {
    const moisEcoules = Scoring.moisEntre(Scoring.DATE_REFERENCE, date);
    const indexPeriode = Math.floor(moisEcoules / dureePeriodeMois);
    return {
      debut: Scoring.ajouterMois(
        Scoring.DATE_REFERENCE,
        indexPeriode * dureePeriodeMois,
      ),
      fin: Scoring.ajouterMois(
        Scoring.DATE_REFERENCE,
        (indexPeriode + 1) * dureePeriodeMois,
      ),
    };
  }

  /** La Période contiguë immédiatement avant `periode`, de la même durée. */
  periodePrecedente(periode: Periode, dureePeriodeMois: number): Periode {
    return {
      debut: Scoring.ajouterMois(periode.debut, -dureePeriodeMois),
      fin: periode.debut,
    };
  }

  /** Traduit le Seuil de Palier tel que stocké en configuration (pourcentage entier) en fraction. */
  pourcentageVersFraction(seuilPalierPourcentage: number): number {
    return seuilPalierPourcentage / 100;
  }

  private static moisEntre(debut: Date, fin: Date): number {
    return (
      (fin.getUTCFullYear() - debut.getUTCFullYear()) * 12 +
      (fin.getUTCMonth() - debut.getUTCMonth())
    );
  }

  private static ajouterMois(date: Date, mois: number): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + mois, 1),
    );
  }
}
