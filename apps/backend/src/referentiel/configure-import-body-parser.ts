import { INestApplication } from '@nestjs/common';
import express from 'express';

// Le fichier YAML d'import du Référentiel est posté en corps brut (pas de JSON) sur cette seule
// route ; le parsing JSON par défaut de Nest reste intact pour le reste de l'API. Partagé entre
// `main.ts` et les tests e2e pour que les deux ne divergent jamais.
export function configureReferentielImportBodyParser(
  app: INestApplication,
): void {
  app.use(
    '/api/referentiel/import',
    express.text({ type: ['text/plain', 'text/yaml', 'application/x-yaml'] }),
  );
}
