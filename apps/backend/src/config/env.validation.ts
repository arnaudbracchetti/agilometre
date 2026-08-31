import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
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

  // La plupart des relais SMTP (Brevo, Mailjet, SES...) exigent une authentification ; Mailpit
  // (dev/e2e) n'en demande pas — optionnels, cf. doc/spec/annexes/gestion-des-droits.md.
  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  // `enableImplicitConversion` convertit déjà la chaîne source en booléen (via `Boolean(value)`,
  // donc "false" → true) avant que ce Transform ne s'exécute — `value` reçu ici est donc déjà
  // corrompu. Relire la valeur brute via `obj` (l'objet source, non converti) contourne le
  // problème.
  @IsBoolean()
  @IsOptional()
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    typeof obj.SMTP_SECURE === 'string'
      ? obj.SMTP_SECURE.toLowerCase() === 'true'
      : obj.SMTP_SECURE,
  )
  SMTP_SECURE?: boolean;

  // URL publique de cette instance, utilisée pour construire les liens dans les emails (Jeton de
  // compte) — jamais déduite du header Host de la requête entrante, pour éviter une usurpation.
  @IsString()
  @IsNotEmpty()
  APP_URL!: string;

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

  // Session de connexion à renouvellement glissant (doc/spec/annexes/gestion-des-droits.md,
  // "Authentification") : pas d'expiration agressive en pleine animation de séance. Défaut fixé
  // par le spec, pas un choix produit ouvert comme les deux valeurs de scoring ci-dessus.
  @IsInt()
  @Min(1)
  SESSION_DUREE_HEURES: number = 12;
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
