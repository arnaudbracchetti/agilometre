import { Role } from '@agilometre/shared';

const LIBELLES: Record<Role, string> = {
  [Role.Coach]: 'Coach',
  [Role.Direction]: 'Direction',
  [Role.Membre]: 'Membre d’équipe',
  [Role.Manager]: 'Manager d’équipe',
};

export function libelleRole(role: Role): string {
  return LIBELLES[role];
}
