import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_HOST!: string;

  @IsInt()
  @Min(1)
  SMTP_PORT!: number;

  @IsString()
  @IsNotEmpty()
  SMTP_FROM!: string;
}

// Échoue vite au démarrage si le SMTP ou l'URL Postgres manquent, plutôt qu'en
// pleine campagne de pouls (cf. plan d'initialisation, §"Éléments supplémentaires conseillés").
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Configuration invalide :\n${errors.toString()}`);
  }

  return validated;
}
