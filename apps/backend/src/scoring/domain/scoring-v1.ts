import { CranConsensus, ResultatPalier, Scoring } from './scoring';

/**
 * Implémentation courante des règles de scoring du PRD §6 : Seuil de Palier par comparaison
 * directe, écart-type de population traduit en 3 crans de consensus. Les seuils de dispersion sont un
 * point de départ documenté, amené à évoluer avec l'usage (ADR-0019) — pas une vérité produit
 * figée : bandes égales sur la plage théorique de l'écart-type sur l'échelle 1-4 (maximum
 * théorique 1,5, atteint par le cas bimodal extrême 50/50 aux Niveaux 1 et 4).
 */
export class ScoringV1 extends Scoring {
  static readonly SEUIL_CONSENSUS_FORT = 0.5;
  static readonly SEUIL_CONSENSUS_MODERE = 1.0;

  calculerPalier(niveaux: number[], seuilPalier: number): ResultatPalier {
    const effectif = niveaux.length;
    if (effectif === 0) {
      return { effectif: 0 };
    }

    const palier = this.determinerPalier(niveaux, effectif, seuilPalier);
    const tauxApproche = this.determinerTauxApproche(
      niveaux,
      effectif,
      palier,
      seuilPalier,
    );
    const margeAvantDescente = this.determinerMargeAvantDescente(
      niveaux,
      effectif,
      palier,
      seuilPalier,
    );

    return { effectif, palier, tauxApproche, margeAvantDescente };
  }

  /** Le plus haut Niveau N dont la part des Réponses ≥ N atteint `seuilPalier` (PRD §6). */
  private determinerPalier(
    niveaux: number[],
    effectif: number,
    seuilPalier: number,
  ): 1 | 2 | 3 | 4 {
    let palier: 1 | 2 | 3 | 4 = 1;
    for (const niveau of [2, 3, 4] as const) {
      const part = niveaux.filter((n) => n >= niveau).length / effectif;
      if (part < seuilPalier) {
        break;
      }
      palier = niveau;
    }
    return palier;
  }

  /**
   * Proximité du passage au Palier supérieur : la part des Réponses déjà au Niveau juste au-dessus
   * du Palier, normalisée par `seuilPalier` — 100% coïncide exactement avec le franchissement.
   * `null` si Palier = 4 (pas de Niveau 5 à approcher).
   */
  private determinerTauxApproche(
    niveaux: number[],
    effectif: number,
    palier: 1 | 2 | 3 | 4,
    seuilPalier: number,
  ): number | null {
    if (palier === 4) {
      return null;
    }
    const partNiveauSuivant =
      niveaux.filter((n) => n >= palier + 1).length / effectif;
    return partNiveauSuivant / seuilPalier;
  }

  /**
   * Proximité de la chute vers le Palier inférieur : où se situe la part des Réponses au Palier
   * courant ou au-dessus, entre `seuilPalier` (validation à la limite stricte, 0% — une seule
   * Réponse en moins et le Palier tombe) et 1 (validation maximale, 100%). Cas dégénéré : à
   * `seuilPalier` = 100%, cette part vaut toujours exactement 1 quand le Palier est validé (aucune
   * marge possible par construction) — on renvoie 0 plutôt qu'une division par zéro.
   */
  private determinerMargeAvantDescente(
    niveaux: number[],
    effectif: number,
    palier: 1 | 2 | 3 | 4,
    seuilPalier: number,
  ): number {
    if (seuilPalier === 1) {
      return 0;
    }
    const partPalierCourant =
      niveaux.filter((n) => n >= palier).length / effectif;
    return (partPalierCourant - seuilPalier) / (1 - seuilPalier);
  }

  calculerMoyenne(niveaux: number[]): number | null {
    if (niveaux.length === 0) {
      return null;
    }
    return niveaux.reduce((somme, n) => somme + n, 0) / niveaux.length;
  }

  calculerDispersion(niveaux: number[]): CranConsensus | null {
    if (niveaux.length === 0) {
      return null;
    }
    const ecartType = this.ecartTypePopulation(niveaux);
    if (ecartType <= ScoringV1.SEUIL_CONSENSUS_FORT) {
      return 'FORT';
    }
    if (ecartType <= ScoringV1.SEUIL_CONSENSUS_MODERE) {
      return 'MODERE';
    }
    return 'FAIBLE';
  }

  /** Appelée uniquement après le garde `niveaux.length === 0` de `calculerDispersion`. */
  private ecartTypePopulation(niveaux: number[]): number {
    const moyenne = niveaux.reduce((somme, n) => somme + n, 0) / niveaux.length;
    const variance =
      niveaux.reduce((somme, n) => somme + (n - moyenne) ** 2, 0) /
      niveaux.length;
    return Math.sqrt(variance);
  }
}
