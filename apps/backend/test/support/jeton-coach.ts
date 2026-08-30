import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@agilometre/shared';

/**
 * Jeton Coach de test, signé directement via `JwtService` — inutile de passer par un vrai
 * `POST /api/auth/login` dans des specs e2e qui ne testent pas l'authentification elle-même.
 */
export function jetonCoachDeTest(app: INestApplication): Promise<string> {
  return app.get(JwtService).signAsync({
    sub: 'test-coach',
    email: 'coach@example.com',
    role: Role.Coach,
  });
}
