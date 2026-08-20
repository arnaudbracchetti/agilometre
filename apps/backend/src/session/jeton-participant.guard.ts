import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaJetonSessionRepository } from './infrastructure/prisma-jeton-session.repository';
import type { JetonSessionRepository } from './domain/jeton-session.repository';

export interface RequeteAvecJetonParticipant extends Request {
  jetonId: string;
  sessionId: string;
}

/**
 * Résout le Jeton participant (`Authorization: Bearer <jeton>`) en `sessionId` avant d'entrer
 * dans le contrôleur — docs/design/agregat-tour-de-vote.md §5, "Le Guard résout le Jeton en
 * sessionId". Mécanisme indépendant du "futur guard Coach" annoncé par les commentaires de
 * `participant.controller.ts`/`projection.controller.ts` (portée différente : identification
 * anonyme d'un device participant, pas authentification d'un compte Coach).
 */
@Injectable()
export class JetonParticipantGuard implements CanActivate {
  constructor(
    @Inject(PrismaJetonSessionRepository)
    private readonly jetons: JetonSessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequeteAvecJetonParticipant>();
    const jetonId = this.extraireJeton(request.headers.authorization);
    if (!jetonId) {
      throw new UnauthorizedException('Jeton de session manquant ou invalide');
    }
    const sessionId = await this.jetons.resoudreSessionActive(jetonId);
    if (!sessionId) {
      throw new UnauthorizedException('Jeton de session manquant ou invalide');
    }
    request.jetonId = jetonId;
    request.sessionId = sessionId;
    return true;
  }

  private extraireJeton(authorization: string | undefined): string | null {
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    const jeton = authorization.slice('Bearer '.length).trim();
    return jeton.length > 0 ? jeton : null;
  }
}
