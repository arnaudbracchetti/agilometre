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
