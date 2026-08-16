export interface OptionReferentielDto {
  libelle: string;
  niveau: number;
}

export interface QuestionReferentielDto {
  id: string;
  libelle: string;
  themeId: string;
  options: OptionReferentielDto[];
}

export interface ThemeReferentielDto {
  id: string;
  libelle: string;
  questions: QuestionReferentielDto[];
}

export interface ReferentielDto {
  themes: ThemeReferentielDto[];
}
