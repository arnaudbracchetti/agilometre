import { CranConsensusDto, SyntheseQuestionDto } from '@agilometre/shared';

export type CritereTriLectureFine = 'moyenne' | 'dispersion';

/** Cran de consensus FORT = écart-type le plus faible (accord) ; FAIBLE = écart-type le plus fort
 * (désaccord) — le rang ci-dessous suit donc la dispersion, pas l'ordre alphabétique des crans. */
const RANG_DISPERSION: Record<CranConsensusDto, number> = {
  FAIBLE: 3,
  MODERE: 2,
  FORT: 1,
};

/**
 * Tri d'affichage : score le plus faible en premier, ou dispersion la plus forte en premier —
 * jamais les deux critères combinés (l'un ou l'autre, au choix du Coach). `null` (Question sans
 * Réponse — normalement déjà exclue par CalculerSyntheseScoring) relégué en fin de liste dans les
 * deux cas, par défense. Tri stable : les égalités gardent leur ordre reçu.
 */
export class TrierQuestionsLectureFine {
  static executer(
    questions: readonly SyntheseQuestionDto[],
    critere: CritereTriLectureFine,
  ): SyntheseQuestionDto[] {
    const comparateur =
      critere === 'moyenne'
        ? (a: SyntheseQuestionDto, b: SyntheseQuestionDto) =>
            this.versComparable(a.moyenne) - this.versComparable(b.moyenne)
        : (a: SyntheseQuestionDto, b: SyntheseQuestionDto) =>
            this.rangDispersion(b.consensus) - this.rangDispersion(a.consensus);

    return [...questions].sort(comparateur);
  }

  private static versComparable(moyenne: number | null): number {
    return moyenne ?? Number.POSITIVE_INFINITY;
  }

  private static rangDispersion(consensus: CranConsensusDto | null): number {
    return consensus ? RANG_DISPERSION[consensus] : -1;
  }
}
