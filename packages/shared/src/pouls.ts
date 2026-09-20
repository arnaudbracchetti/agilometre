import { SelectionQuestionDto } from './modele-collecte';

export type StatutCampagneDto = 'BROUILLON' | 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE';

export interface CampagnePoulsDto {
  id: string;
  equipeId: string;
  statut: StatutCampagneDto;
  modeleCollecteId: string;
  joursEnvoi: number[];
  heureEnvoi: number;
  questionsParEnvoi: number;
  panel: SelectionQuestionDto[];
}
