import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ReferentielModule } from './referentiel/referentiel.module';
import { OrganisationModule } from './organisation/organisation.module';
import { SessionModule } from './session/session.module';

// Le build Docker copie le frontend Angular dans apps/backend/public (voir Dockerfile) ;
// __dirname pointe ici vers dist/src, donc apps/backend/public = ../../public.
// Absent en dev, où le frontend tourne via `ng serve` + proxy vers /api.
const publicDir = join(__dirname, '..', '..', 'public');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ...(existsSync(publicDir)
      ? [
          ServeStaticModule.forRoot({
            rootPath: publicDir,
            exclude: ['/api/{*splat}'],
          }),
        ]
      : []),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        // Le transport `pino-pretty` démarre un worker thread par instance de logger. En dehors
        // du dev local (un seul process, longue durée), c'est un piège : les tests e2e créent une
        // AppModule complète — donc un logger, donc un worker thread — par test (`Test.createTestingModule`),
        // et rien ne les referme à la fermeture de l'app. Accumulés sur toute la suite (45 tests),
        // ils empêchent Jest de sortir en fin de run (process qui traîne plusieurs minutes alors que
        // les tests eux-mêmes ont fini en quelques secondes, cf. NODE_ENV=test — défaut appliqué par
        // Jest lui-même). Exclu explicitement en 'test' comme en 'production' ; le dev local (où
        // NODE_ENV n'est pas positionné) garde le transport pretty par défaut.
        transport:
          process.env.NODE_ENV === 'production' ||
          process.env.NODE_ENV === 'test'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    ReferentielModule,
    OrganisationModule,
    SessionModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
