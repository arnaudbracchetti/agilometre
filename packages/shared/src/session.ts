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
  date: string;
  statut: StatutSession;
  modeleSessionId: string;
  verrouillee: boolean;
  selection: SelectionQuestionDto[];
}

export interface LigneListeSessionDto {
  id: string;
  equipeNom: string;
  date: string;
  statut: StatutSession;
  nbQuestions: number;
  modeleSessionNom: string | null;
}
