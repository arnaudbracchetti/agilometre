import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@agilometre/shared';

/** Jeton Membre d'équipe de test, symétrique à `jetonCoachDeTest` (jeton-coach.ts). */
export function jetonMembreDeTest(app: INestApplication): Promise<string> {
  return app.get(JwtService).signAsync({
    sub: 'test-membre',
    email: 'membre@example.com',
    role: Role.Membre,
  });
}
