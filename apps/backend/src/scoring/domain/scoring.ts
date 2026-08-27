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
 * Le mouvement d'un Palier entre la Période affichée et la Période immédiatement précédente —
 * distinct de la Tendance (la suite complète des Paliers, cf. CONTEXT.md), qui ne compare que
 * deux Périodes consécutives.
 */
export type Evolution = 'hausse' | 'baisse' | 'stable';

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

  /**
   * Marge de tolérance (en points de fraction, donc 0.1 = 10 points de pourcentage) en-deçà de
   * laquelle un écart de Taux d'approche ou de Marge avant descente entre deux Périodes est lu
   * comme une Évolution stable plutôt qu'une hausse/baisse — sans elle, deux fractions calculées
   * sur des effectifs différents ne tombent quasiment jamais exactement au même point, et `stable`
   * ne se déclencherait presque plus jamais en pratique.
   */
  private static readonly MARGE_STABLE = 0.1;

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

  /**
   * Compare le Palier `actuel` à celui de la Période immédiatement précédente. `null` si l'un des
   * deux n'a pas de Palier (`effectif: 0`) : rien à comparer. À Palier identique, ne s'arrête pas
   * là — un Palier stable peut progresser à l'intérieur de lui-même : compare le Taux d'approche
   * (progression vers le Palier suivant), sauf au Palier 4 où il n'y a pas de Palier suivant à
   * approcher (`tauxApproche` toujours `null`) — on compare alors la Marge avant descente, pour
   * garder un signal utile même au sommet de l'échelle plutôt que de figer l'Évolution à `stable`.
   * Une seule grandeur comparée à la fois (jamais de fusion tauxApproche/margeAvantDescente en un
   * chiffre composite, cf. `ResultatPalier`) — seul le choix de laquelle dépend du Palier. Écart
   * absolu ≤ `MARGE_STABLE` (10 points) entre les deux valeurs : lu comme stable, pas une
   * égalité stricte.
   */
  comparerEvolution(
    actuel: ResultatPalier,
    precedent: ResultatPalier,
  ): Evolution | null {
    if (!('palier' in actuel) || !('palier' in precedent)) {
      return null;
    }
    if (actuel.palier !== precedent.palier) {
      return actuel.palier > precedent.palier ? 'hausse' : 'baisse';
    }
    if (actuel.palier < 4) {
      return Scoring.comparerNombres(
        actuel.tauxApproche,
        precedent.tauxApproche,
      );
    }
    return Scoring.comparerNombres(
      actuel.margeAvantDescente,
      precedent.margeAvantDescente,
    );
  }

  private static comparerNombres(
    actuel: number | null,
    precedent: number | null,
  ): Evolution | null {
    if (actuel === null || precedent === null) {
      return null;
    }
    const ecart = actuel - precedent;
    if (Math.abs(ecart) <= Scoring.MARGE_STABLE) {
      return 'stable';
    }
    return ecart > 0 ? 'hausse' : 'baisse';
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
