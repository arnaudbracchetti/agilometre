import { StatutSession } from './scoring';

export interface SelectionQuestionDto {
  questionId: string;
  libelle: string;
  themeId: string;
  themeLibelle: string;
}

export interface ModeleSessionDto {
  id: string;
  nom: string;
  selection: SelectionQuestionDto[];
}

export interface LigneBibliothequeModeleSessionDto {
  id: string;
  nom: string;
  nbQuestionsActives: number;
  themesCouverts: string[];
  misAJourLe: string;
}

export interface SessionDto {
  id: string;
  equipeId: string;
  equipeNom: string;
  entiteId: string;
  date: string;
  statut: StatutSession;
  modeleSessionId: string;
  verrouillee: boolean;
  code: string | null;
  selection: SelectionQuestionDto[];
}

export interface LigneListeSessionDto {
  id: string;
  equipeNom: string;
  date: string;
  statut: StatutSession;
  verrouillee: boolean;
  nbQuestions: number;
  modeleSessionNom: string | null;
}

export interface OptionAffichageDto {
  libelle: string;
}

export interface QuestionCouranteDto {
  questionId: string;
  libelle: string;
  options: OptionAffichageDto[];
}

export interface TourOuvertDto {
  numero: number;
  nbVotants: number;
}

/** Répartition des votes d'un Tour clos, par Niveau — jamais un objet partiel (carte #40). */
export interface RepartitionVotesDto {
  1: number;
  2: number;
  3: number;
  4: number;
}

export interface TourClosDto {
  numero: number;
  repartition: RepartitionVotesDto;
}

export interface TourHistoriqueDto {
  questionId: string;
  libelle: string;
  numero: number;
  repartition: RepartitionVotesDto;
  /** Une entrée par Niveau (1 à 4, même ordre que `repartition`) — voir `QuestionCouranteDto`. */
  options: OptionAffichageDto[];
}

export type StatutQuestionProgressionDto = 'A_VENIR' | 'COURANTE' | 'TRAITEE' | 'SAUTEE';

export interface ProgressionQuestionDto {
  questionId: string;
  libelle: string;
  statut: StatutQuestionProgressionDto;
  /** Pertinent seulement si statut === 'SAUTEE' — index de la Question devant indexCourant. */
  reactivable: boolean;
}

export interface ProjectionSessionDto {
  statut: StatutSession;
  code: string;
  nbDevicesConnectes: number;
  questionCourante: QuestionCouranteDto | null;
  tourOuvert: TourOuvertDto | null;
  dernierTourClos: TourClosDto | null;
}

export interface PilotageSessionDto {
  statut: StatutSession;
  code: string;
  nbDevicesConnectes: number;
  questionCourante: QuestionCouranteDto | null;
  tourOuvert: TourOuvertDto | null;
  dernierTourClos: TourClosDto | null;
  historique: TourHistoriqueDto[];
  progression: ProgressionQuestionDto[];
}

export type CranConsensusDto = 'FORT' | 'MODERE' | 'FAIBLE';

export interface SyntheseQuestionDto {
  questionId: string;
  libelle: string;
  effectif: number;
  moyenne: number | null;
  consensus: CranConsensusDto | null;
  repartition: RepartitionVotesDto;
}

/**
 * Le mouvement d'un Palier entre la Période affichée et la Période immédiatement précédente —
 * distinct de la Tendance (la suite complète des Paliers, cf. CONTEXT.md).
 */
export type Evolution = 'hausse' | 'baisse' | 'stable';

export interface SyntheseThemeDto {
  themeId: string;
  libelle: string;
  /**
   * Rang du Thème dans le Référentiel (actifs d'abord). Pilote sa couleur catégorielle : le même
   * Thème doit porter la même couleur sur tous les écrans où il apparaît.
   */
  position: number;
  /** null : aucune Réponse sur la Portée ("aucune donnée"). */
  palier: 1 | 2 | 3 | 4 | null;
  tauxApproche: number | null;
  margeAvantDescente: number | null;
  effectif: number;
  questions: SyntheseQuestionDto[];
  /** Absent pour la Synthèse de séance (pas de Période précédente) ; toujours fourni pour le Profil d'Équipe. */
  evolution?: Evolution | null;
}

export interface SyntheseSessionDto {
  /** Nom de l'Équipe et date de la séance — l'écran de synthèse doit nommer ce qu'il restitue. */
  equipeNom: string;
  date: string;
  code: string | null;
  statut: StatutSession;
  /**
   * Seuil de Palier de l'instance, en fraction (0-1). Nécessaire à l'écran : il trace le seuil sur
   * les barres de répartition et l'explicite dans son glossaire. Réglage d'instance, jamais par
   * Équipe (PRD §6).
   */
  seuilPalier: number;
  themes: SyntheseThemeDto[];
  /** Palier global de la séance : même calcul que `palier` par Thème, tous Thèmes confondus (PRD §6). */
  palierGlobal: 1 | 2 | 3 | 4 | null;
  tauxApprocheGlobal: number | null;
  margeAvantDescenteGlobal: number | null;
  effectifGlobal: number;
}

export interface JetonSessionDto {
  sessionId: string;
  jeton: string;
}

export interface MoiParticipantDto {
  voteOuvert: boolean;
  question: QuestionCouranteDto | null;
  optionChoisieIndex: number | null;
}

export interface InfoSessionParticipantDto {
  equipeNom: string;
  ouvertureLe: string | null;
}
