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
