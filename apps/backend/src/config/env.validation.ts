import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
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

  // Le Seuil de Palier (appelé Paramètre X dans le PRD) et la durée d'une Période de calcul sont
  // des points ouverts du PRD §12 : les défauts ci-dessous sont un choix produit, reconfigurable
  // par instance (jamais par Équipe — PRD §6), pas une valeur qui fait consensus dans la spec.
  @IsInt()
  @Min(1)
  @Max(100)
  SCORING_SEUIL_PALIER: number = 60; // Pourcentage (0-100). Défaut : cf. exemple chiffré du PRD §6.

  @IsInt()
  @Min(1)
  SCORING_DUREE_PERIODE_MOIS: number = 3; // Défaut : cadence trimestrielle.
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
