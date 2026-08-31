import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { Capacite, CAPACITES, Role } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { CLE_PUBLIC } from './../src/auth/decorators/public.decorator';
import { CLE_CAPACITE } from './../src/auth/decorators/requiert.decorator';

/**
 * Test e2e matriciel unique — docs/design/agregat-politique-des-droits.md §4. Parcourt toutes les
 * routes réellement enregistrées via DiscoveryService (pas une resaisie parallèle des routes
 * protégées), croise leurs métadonnées @Requiert/@Public avec CAPACITES, et attend un 401/403
 * cohérent par (route, Rôle). Ajouter un écran protégé n'ajoute alors aucun test à écrire.
 *
 * Note technique : les routes appelées ici portent des `:id` fictifs et des corps minimaux — le
 * statut vérifié n'est jamais un 200 littéral (une ressource inexistante répond souvent 404/400),
 * mais l'absence de 401/403 pour un Rôle autorisé, et un 403 exact pour un Rôle authentifié mais
 * non autorisé. Les guards s'exécutent avant les pipes de validation et le contrôleur — c'est leur
 * décision, pas la réponse métier, que ce test vérifie.
 */

interface RouteDecouverte {
  methode: RequestMethod;
  chemin: string;
  estPublique: boolean;
  capacite: Capacite | undefined;
}

const METHODE_VERS_VERBE: Partial<
  Record<RequestMethod, 'get' | 'post' | 'put' | 'delete' | 'patch'>
> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
};

const LIGNE_MATRICE_PAR_CAPACITE: Record<Capacite, string> = {
  gererComptes: 'Comptes (créer, modifier, désactiver, Habilitations)',
  gererSonCompte: 'Mon compte (changer son mot de passe)',
  gererOrganisation: 'Organisation (CRUD Entité/Équipe, gestion du roster)',
  gererReferentiel: 'Référentiel (consultation, import)',
  voirProfilEntite: "Profil d'une Entité",
  voirProfilEquipe: "Profil d'une Équipe",
  voirSyntheseSession: 'Synthèse de fin de Session',
  voirMurDeBadges: 'Mur de badges',
  gererSessions: 'Sessions (bibliothèque, pilotage, synthèse)',
  gererModelesSession: 'Modèles de session',
  gererCampagnesPouls: 'Campagnes de pouls',
};

function joindreChemin(...segments: string[]): string {
  const nettoyes = segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter((segment) => segment.length > 0);
  return `/${nettoyes.join('/')}`;
}

function decouvrirRoutes(
  discovery: DiscoveryService,
  reflector: Reflector,
): RouteDecouverte[] {
  const routes: RouteDecouverte[] = [];

  for (const wrapper of discovery.getControllers()) {
    const metatype = wrapper.metatype as
      (new (...args: unknown[]) => unknown) | undefined;
    if (!metatype) continue;

    const cheminControleur =
      (Reflect.getMetadata(PATH_METADATA, metatype) as string | undefined) ??
      '';

    for (const nomMethode of Object.getOwnPropertyNames(metatype.prototype)) {
      if (nomMethode === 'constructor') continue;
      const handler = (metatype.prototype as Record<string, unknown>)[
        nomMethode
      ];
      const methodeHttp = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;
      if (methodeHttp === undefined) continue; // pas un handler de route

      const cheminMethode =
        (Reflect.getMetadata(PATH_METADATA, handler) as string | undefined) ??
        '';
      const chemin = joindreChemin(cheminControleur, cheminMethode).replace(
        /:[^/]+/g,
        'valeur-test',
      );

      const estPublique =
        reflector.get<boolean | undefined>(CLE_PUBLIC, handler) ??
        reflector.get<boolean | undefined>(CLE_PUBLIC, metatype) ??
        false;
      const capacite =
        reflector.get<Capacite | undefined>(CLE_CAPACITE, handler) ??
        reflector.get<Capacite | undefined>(CLE_CAPACITE, metatype);

      routes.push({ methode: methodeHttp, chemin, estPublique, capacite });
    }
  }

  return routes;
}

describe('Politique de droits — test matriciel (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let routes: RouteDecouverte[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
    })
      // Sans ce guard désactivé, ~250 requêtes de ce test dépasseraient la limite de 100/min du
      // ThrottlerGuard global (ADR-0012) — hors sujet pour ce test, qui vérifie AuthGuard/PerimetreGuard.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    jwt = app.get(JwtService);
    const discovery = app.get(DiscoveryService);
    const reflector = app.get(Reflector);
    routes = decouvrirRoutes(discovery, reflector).filter(
      (route) => route.methode in METHODE_VERS_VERBE,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  function jetonPour(role: Role): Promise<string> {
    return jwt.signAsync({ sub: 'test-user', email: 'test@example.com', role });
  }

  function appeler(route: RouteDecouverte, jeton?: string) {
    const verbe = METHODE_VERS_VERBE[route.methode]!;
    const chemin = `/api${route.chemin}`;
    const req = request(app.getHttpServer())[verbe](chemin);
    if (jeton) {
      req.set('Authorization', `Bearer ${jeton}`);
    }
    if (verbe === 'post' || verbe === 'patch' || verbe === 'put') {
      req.send({});
    }
    return req;
  }

  it('découvre au moins une route publique et une route protégée par capacité', () => {
    expect(routes.some((r) => r.estPublique)).toBe(true);
    expect(routes.some((r) => r.capacite)).toBe(true);
  });

  it('aucune route non publique n’est dépourvue de @Requiert(...)', () => {
    const orphelines = routes.filter(
      (route) => !route.estPublique && !route.capacite,
    );
    expect(orphelines).toEqual([]);
  });

  it('toute route non publique répond 401 sans jeton', async () => {
    const routesProtegees = routes.filter((route) => !route.estPublique);
    const echecs: string[] = [];
    for (const route of routesProtegees) {
      const reponse = await appeler(route);
      if (reponse.status !== 401) {
        echecs.push(
          `${route.methode} ${route.chemin} → ${reponse.status} (attendu 401)`,
        );
      }
    }
    expect(echecs).toEqual([]);
  });

  it('une route publique n’est jamais bloquée par AuthGuard (jamais 403)', async () => {
    // Pas d'assertion "jamais 401" ici : certaines routes @Public() (participant/moi,
    // participant/voter, ...) exigent leur propre Jeton participant via JetonParticipantGuard,
    // inchangé par cette carte — un 401 de sa part est correct et déjà couvert par
    // participant.e2e-spec.ts. Seul un 403 signalerait qu'AuthGuard a, à tort, appliqué un
    // contrôle de capacité malgré @Public().
    const routesPubliques = routes.filter((route) => route.estPublique);
    for (const route of routesPubliques) {
      const reponse = await appeler(route);
      expect(reponse.status).not.toBe(403);
    }
  });

  it('chaque Rôle reçoit un accès cohérent avec CAPACITES, par route protégée', async () => {
    const routesProtegees = routes.filter((route) => route.capacite);
    const echecs: string[] = [];
    for (const route of routesProtegees) {
      const rolesAutorises = CAPACITES[route.capacite!];
      for (const role of Object.values(Role)) {
        const jeton = await jetonPour(role);
        const reponse = await appeler(route, jeton);
        const autorise = rolesAutorises.includes(role);
        const rejeteParLeGuard =
          reponse.status === 401 || reponse.status === 403;
        if (autorise && rejeteParLeGuard) {
          echecs.push(
            `${route.methode} ${route.chemin} — ${role} attendu autorisé, reçu ${reponse.status}`,
          );
        }
        if (!autorise && reponse.status !== 403) {
          echecs.push(
            `${route.methode} ${route.chemin} — ${role} attendu 403, reçu ${reponse.status}`,
          );
        }
      }
    }
    expect(echecs).toEqual([]);
  });

  it('chaque capacité de CAPACITES a une ligne correspondante dans gestion-des-droits.md', () => {
    const contenu = readFileSync(
      join(__dirname, '../../../doc/spec/annexes/gestion-des-droits.md'),
      'utf-8',
    );
    for (const capacite of Object.keys(CAPACITES) as Capacite[]) {
      expect(contenu).toContain(LIGNE_MATRICE_PAR_CAPACITE[capacite]);
    }
  });
});
