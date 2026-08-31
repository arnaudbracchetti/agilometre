import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@agilometre/shared';

/** Jeton Direction de test, symétrique à `jetonCoachDeTest` (jeton-coach.ts). */
export function jetonDirectionDeTest(app: INestApplication): Promise<string> {
  return app.get(JwtService).signAsync({
    sub: 'test-direction',
    email: 'direction@example.com',
    role: Role.Direction,
  });
}
