import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CLE_PERIMETRE,
  TypeRessourcePerimetre,
} from '../decorators/perimetre.decorator';
import { PerimetreUtilisateur } from '../domain/perimetre-utilisateur';
import { RequeteAuthentifiee } from './auth.guard';

/**
 * No-op si `@Perimetre(...)` est absent — contrairement à `AuthGuard`, ce guard ne protège que le
 * contrôle *dynamique* (une ressource précise), pas l'accès à la route elle-même (déjà couvert par
 * `@Requiert`/`AuthGuard`). Non consommé par aucune route dans la carte #59 (voir
 * docs/design/agregat-politique-des-droits.md §3) : posé ici pour que #61/#62 n'aient qu'à ajouter
 * le décorateur sur leurs routes de profil.
 */
@Injectable()
export class PerimetreGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly perimetreUtilisateur: PerimetreUtilisateur,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const type = this.reflector.getAllAndOverride<
      TypeRessourcePerimetre | undefined
    >(CLE_PERIMETRE, [context.getHandler(), context.getClass()]);
    if (!type) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequeteAuthentifiee>();
    const id = String(request.params.id);
    const autorise =
      type === 'entite'
        ? this.perimetreUtilisateur.peutVoirEntite(request.utilisateur, id)
        : this.perimetreUtilisateur.peutVoirEquipe(request.utilisateur, id);

    if (!autorise) {
      throw new ForbiddenException(
        `Le Rôle ${request.utilisateur.role} n'a pas accès à cette ressource`,
      );
    }
    return true;
  }
}
