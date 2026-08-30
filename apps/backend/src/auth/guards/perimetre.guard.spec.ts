import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@agilometre/shared';
import { PerimetreUtilisateur } from '../domain/perimetre-utilisateur';
import { RequeteAuthentifiee } from './auth.guard';
import { PerimetreGuard } from './perimetre.guard';

function creerContexte(
  request: Partial<RequeteAuthentifiee>,
): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PerimetreGuard', () => {
  function creerGuard(type: string | undefined) {
    const reflector = {
      getAllAndOverride: () => type,
    } as unknown as Reflector;
    return new PerimetreGuard(reflector, new PerimetreUtilisateur());
  }

  it('laisse passer si @Perimetre(...) est absent (no-op)', () => {
    const guard = creerGuard(undefined);
    const context = creerContexte({ params: { id: 'entite-1' } });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('laisse passer un Coach sur une ressource "entite"', () => {
    const guard = creerGuard('entite');
    const context = creerContexte({
      params: { id: 'entite-1' },
      utilisateur: { id: 'u1', email: 'coach@example.com', role: Role.Coach },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('propage l’échec de PerimetreUtilisateur pour un Rôle non implémenté', () => {
    const guard = creerGuard('entite');
    const context = creerContexte({
      params: { id: 'entite-1' },
      utilisateur: {
        id: 'u2',
        email: 'direction@example.com',
        role: Role.Direction,
      },
    });

    expect(() => guard.canActivate(context)).toThrow();
  });
});
