import { Periode } from '../../scoring/domain/scoring';
import { Session } from './session';

export interface SessionRepository {
  /** Charge l'agrégat complet, avec sa Sélection. */
  findById(id: string): Promise<Session | null>;
  /**
   * Résout une Session par son Code — restreint aux Sessions OUVERTE, seules à porter un Code
   * unique : deux Sessions closes à des dates différentes ont pu partager le même.
   */
  findByCode(code: string): Promise<Session | null>;
  /** Sessions CLOTUREE d'une Équipe dont la date tombe dans la Période donnée. */
  findFermeesParEquipeEtPeriode(
    equipeId: string,
    periode: Periode,
  ): Promise<Session[]>;
  /** Sessions CLOTUREE de plusieurs Équipes (agrégation par Entité) dont la date tombe dans la Période donnée. */
  findFermeesParEquipesEtPeriode(
    equipeIds: string[],
    periode: Periode,
  ): Promise<Session[]>;
  save(session: Session): Promise<void>;
  remove(id: string): Promise<void>;
  /** Unicité du Code parmi les Sessions OUVERTE. */
  existeCodeOuvert(code: string): Promise<boolean>;
  /** Existe-t-il une Session CLOTUREE de l'Équipe strictement avant `date` ? */
  existeFermeeAvant(equipeId: string, date: Date): Promise<boolean>;
  /** Existe-t-il une Session CLOTUREE de l'une des Équipes strictement avant `date` ? */
  existeFermeeAvantPourEquipes(
    equipeIds: string[],
    date: Date,
  ): Promise<boolean>;
}
