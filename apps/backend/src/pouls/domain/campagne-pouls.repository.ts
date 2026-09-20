import { CampagnePouls } from './campagne-pouls';

export interface CampagnePoulsRepository {
  findParEquipe(equipeId: string): Promise<CampagnePouls | null>;
  save(campagne: CampagnePouls): Promise<void>;
}
