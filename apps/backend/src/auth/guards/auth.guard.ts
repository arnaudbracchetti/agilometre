import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { Capacite, CAPACITES } from '@agilometre/shared';
import { CLE_PUBLIC } from '../decorators/public.decorator';
import { CLE_CAPACITE } from '../decorators/requiert.decorator';
import {
  ChargeJetonUtilisateur,
  UtilisateurConnecte,
} from '../jeton-utilisateur';

export interface RequeteAuthentifiee extends Request {
  utilisateur: UtilisateurConnecte;
}

const EN_TETE_JETON_RENOUVELE = 'X-Auth-Token';

/**
 * Fail-closed : toute route exige un compte valide par défaut. Laisse passer si `@Public()` est
 * présent, sinon vérifie le JWT et consulte `CAPACITES[@Requiert(...)]` —
 * docs/design/agregat-politique-des-droits.md §2. Réémet le jeton à chaque requête réussie
 * (renouvellement glissant, doc/spec/annexes/gestion-des-droits.md, "Authentification").
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const estPublique = this.reflector.getAllAndOverride<boolean>(CLE_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (estPublique) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequeteAuthentifiee>();
    const jeton = this.extraireJeton(request.headers.authorization);
    if (!jeton) {
      throw new UnauthorizedException(
        'Jeton de connexion manquant ou invalide',
      );
    }

    let charge: ChargeJetonUtilisateur;
    try {
      charge = await this.jwt.verifyAsync<ChargeJetonUtilisateur>(jeton);
    } catch {
      throw new UnauthorizedException(
        'Jeton de connexion manquant ou invalide',
      );
    }

    const capacite = this.reflector.getAllAndOverride<Capacite | undefined>(
      CLE_CAPACITE,
      [context.getHandler(), context.getClass()],
    );
    if (!capacite) {
      // Route ni publique ni protégée par une capacité : configuration manquante, jamais un accès
      // par défaut — voir le test matriciel (apps/backend/test/droits.e2e-spec.ts) qui garantit
      // qu'aucune route réellement enregistrée ne se trouve dans ce cas.
      throw new ForbiddenException(
        'Route non configurée pour un contrôle de droits',
      );
    }
    if (!CAPACITES[capacite].includes(charge.role)) {
      throw new ForbiddenException(
        `Le Rôle ${charge.role} n'a pas accès à cette action`,
      );
    }

    request.utilisateur = {
      id: charge.sub,
      email: charge.email,
      role: charge.role,
    };

    // Réémis avec l'expiration par défaut de JwtModule (SESSION_DUREE_HEURES, voir AuthModule) —
    // un seul endroit fixe la durée de session, jamais recopiée ici.
    const response = context.switchToHttp().getResponse<Response>();
    const jetonRenouvele = await this.jwt.signAsync({
      sub: charge.sub,
      email: charge.email,
      role: charge.role,
    });
    response.setHeader(EN_TETE_JETON_RENOUVELE, jetonRenouvele);

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
