export interface SelectionQuestionDto {
  questionId: string;
  libelle: string;
  themeId: string;
  themeLibelle: string;
}

export interface ModeleCollecteDto {
  id: string;
  nom: string;
  selection: SelectionQuestionDto[];
}

export interface LigneBibliothequeModeleCollecteDto {
  id: string;
  nom: string;
  nbQuestionsActives: number;
  themesCouverts: string[];
  misAJourLe: string;
}
