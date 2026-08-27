import { StatutSession as StatutSessionDto } from '@agilometre/shared';
import { StatutSession } from './domain/session';

/**
 * Le domaine ignore délibérément `@agilometre/shared` (frontière API) — mapping explicite ici,
 * partagé par le contrôleur et les mappers plutôt que redéclaré à chaque endroit qui en a besoin.
 */
export const STATUT_VERS_DTO: Record<StatutSession, StatutSessionDto> = {
  PREPAREE: StatutSessionDto.Preparee,
  OUVERTE: StatutSessionDto.Ouverte,
  CLOTUREE: StatutSessionDto.Cloturee,
};
