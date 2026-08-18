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

export interface ProjectionSessionDto {
  statut: StatutSession;
  code: string;
  nbDevicesConnectes: number;
}

export interface PilotageSessionDto {
  statut: StatutSession;
  code: string;
}

export interface JetonSessionDto {
  sessionId: string;
  jeton: string;
}
