import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaJetonSessionRepository } from './infrastructure/prisma-jeton-session.repository';
import {
  JetonParticipantGuard,
  RequeteAvecJetonParticipant,
} from './jeton-participant.guard';

function contexte(authorization: string | undefined): {
  context: ExecutionContext;
  request: Partial<RequeteAvecJetonParticipant>;
} {
  const request: Partial<RequeteAvecJetonParticipant> = {
    headers: { authorization },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JetonParticipantGuard', () => {
  it('rejette une requête sans en-tête Authorization', async () => {
    const jetons = { resoudreSessionActive: jest.fn() };
    const guard = new JetonParticipantGuard(
      jetons as unknown as PrismaJetonSessionRepository,
    );
    const { context } = contexte(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jetons.resoudreSessionActive).not.toHaveBeenCalled();
  });

  it('rejette un en-tête mal formé (pas de préfixe "Bearer ")', async () => {
    const jetons = { resoudreSessionActive: jest.fn() };
    const guard = new JetonParticipantGuard(
      jetons as unknown as PrismaJetonSessionRepository,
    );
    const { context } = contexte('jeton-1');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejette un Jeton inconnu ou invalidé', async () => {
    const jetons = {
      resoudreSessionActive: jest.fn().mockResolvedValue(null),
    };
    const guard = new JetonParticipantGuard(
      jetons as unknown as PrismaJetonSessionRepository,
    );
    const { context } = contexte('Bearer jeton-1');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jetons.resoudreSessionActive).toHaveBeenCalledWith('jeton-1');
  });

  it('laisse passer et pose sessionId/jetonId sur la requête pour un Jeton valide', async () => {
    const jetons = {
      resoudreSessionActive: jest.fn().mockResolvedValue('s1'),
    };
    const guard = new JetonParticipantGuard(
      jetons as unknown as PrismaJetonSessionRepository,
    );
    const { context, request } = contexte('Bearer jeton-1');

    const resultat = await guard.canActivate(context);

    expect(resultat).toBe(true);
    expect(request.sessionId).toBe('s1');
    expect(request.jetonId).toBe('jeton-1');
  });
});
