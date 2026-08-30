import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@agilometre/shared';
import { AuthGuard, RequeteAuthentifiee } from './auth.guard';

function creerContexte(options: {
  authorization?: string;
  metadataParCle: Record<string, unknown>;
}): {
  context: ExecutionContext;
  request: Partial<RequeteAuthentifiee>;
  reponseHeaders: Record<string, string>;
} {
  const reponseHeaders: Record<string, string> = {};
  const request: Partial<RequeteAuthentifiee> = {
    headers: { authorization: options.authorization },
    params: {},
  };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        setHeader: (nom: string, valeur: string) => {
          reponseHeaders[nom] = valeur;
        },
      }),
    }),
  } as unknown as ExecutionContext;
  return { context, request, reponseHeaders };
}

describe('AuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });

  function creerGuard(metadataParCle: Record<string, unknown>) {
    const reflector = {
      getAllAndOverride: (cle: string) => metadataParCle[cle],
    } as unknown as Reflector;
    return new AuthGuard(reflector, jwt);
  }

  it('laisse passer une route @Public() sans jeton', async () => {
    const guard = creerGuard({ public: true });
    const { context } = creerContexte({ metadataParCle: { public: true } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('401 sans jeton sur une route protégée', async () => {
    const guard = creerGuard({ capacite: 'gererOrganisation' });
    const { context } = creerContexte({ metadataParCle: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('401 avec un jeton invalide', async () => {
    const guard = creerGuard({ capacite: 'gererOrganisation' });
    const { context } = creerContexte({
      authorization: 'Bearer jeton-invalide',
      metadataParCle: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('403 si la route ne porte ni @Public() ni @Requiert(...)', async () => {
    const guard = creerGuard({});
    const jeton = await jwt.signAsync({
      sub: 'u1',
      email: 'coach@example.com',
      role: Role.Coach,
    });
    const { context } = creerContexte({
      authorization: `Bearer ${jeton}`,
      metadataParCle: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('403 si le Rôle du jeton ne figure pas dans CAPACITES', async () => {
    const guard = creerGuard({ capacite: 'gererOrganisation' });
    const jeton = await jwt.signAsync({
      sub: 'u1',
      email: 'direction@example.com',
      role: Role.Direction,
    });
    const { context } = creerContexte({
      authorization: `Bearer ${jeton}`,
      metadataParCle: { capacite: 'gererOrganisation' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('laisse passer et réémet un jeton glissant pour un Rôle autorisé', async () => {
    const guard = creerGuard({ capacite: 'gererOrganisation' });
    const jeton = await jwt.signAsync({
      sub: 'u1',
      email: 'coach@example.com',
      role: Role.Coach,
    });
    const { context, request, reponseHeaders } = creerContexte({
      authorization: `Bearer ${jeton}`,
      metadataParCle: { capacite: 'gererOrganisation' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.utilisateur).toEqual({
      id: 'u1',
      email: 'coach@example.com',
      role: Role.Coach,
    });
    expect(reponseHeaders['X-Auth-Token']).toEqual(expect.any(String));
  });
});
