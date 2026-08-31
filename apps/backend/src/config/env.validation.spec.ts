// Requis pour que les décorateurs class-validator/class-transformer fonctionnent en dehors du
// bootstrap Nest habituel (@nestjs/core charge ce polyfill lui-même, absent ici).
import 'reflect-metadata';
import { validateEnv } from './env.validation';

function configValide(
  surcharge: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_SECRET: 'secret',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_FROM: 'Agilomètre <no-reply@agilometre.local>',
    APP_URL: 'http://localhost:4200',
    ...surcharge,
  };
}

describe('validateEnv', () => {
  it('accepte une configuration minimale valide', () => {
    expect(() => validateEnv(configValide())).not.toThrow();
  });

  it('échoue si APP_URL est manquant', () => {
    const config = configValide();
    delete config.APP_URL;
    expect(() => validateEnv(config)).toThrow();
  });

  it('accepte SMTP_USER/SMTP_PASSWORD absents (Mailpit n’en demande pas)', () => {
    expect(() => validateEnv(configValide())).not.toThrow();
  });

  it('convertit la chaîne "false" de SMTP_SECURE en booléen false', () => {
    const validated = validateEnv(configValide({ SMTP_SECURE: 'false' }));
    expect(validated.SMTP_SECURE).toBe(false);
  });

  it('convertit la chaîne "true" de SMTP_SECURE en booléen true', () => {
    const validated = validateEnv(configValide({ SMTP_SECURE: 'true' }));
    expect(validated.SMTP_SECURE).toBe(true);
  });
});
