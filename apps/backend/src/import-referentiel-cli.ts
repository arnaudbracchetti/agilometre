import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PreviewImportReferentiel } from './referentiel/application/preview-import-referentiel.usecase';
import { ApplyImportReferentiel } from './referentiel/application/apply-import-referentiel.usecase';

/**
 * Import du Référentiel hors HTTP : appelle directement les use cases plutôt que
 * `ReferentielController` — aucun réseau, aucun compte requis. Pensé pour
 * `docker compose exec -T app node dist/src/import-referentiel-cli.js < fichier.yaml` sur le
 * serveur (le fichier vit sur l'hôte, pas dans le conteneur — d'où la lecture par stdin plutôt
 * qu'un chemin en argument). `scripts/import-referentiel.sh` (HTTP, avec jeton Coach) reste
 * disponible séparément pour un import depuis un poste sans accès SSH au serveur.
 *
 * Usage : node dist/src/import-referentiel-cli.js [--apercu-only] < fichier.yaml
 */
async function main() {
  const apercuSeulement = process.argv.includes('--apercu-only');
  const yaml = await lireStdin();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    if (apercuSeulement) {
      const resultat = await app.get(PreviewImportReferentiel).executer(yaml);
      if (resultat.type === 'invalide') {
        console.error(JSON.stringify(resultat.erreurs, null, 2));
        process.exitCode = 1;
        return;
      }
      console.log(resultat.resume);
      console.log(JSON.stringify(resultat.changeSet, null, 2));
      return;
    }

    const resultat = await app.get(ApplyImportReferentiel).executer(yaml);
    if (resultat.type === 'invalide') {
      console.error(JSON.stringify(resultat.erreurs, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log('Référentiel importé.');
  } finally {
    await app.close();
  }
}

function lireStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const morceaux: Buffer[] = [];
    process.stdin.on('data', (morceau: Buffer) => morceaux.push(morceau));
    process.stdin.on('end', () =>
      resolve(Buffer.concat(morceaux).toString('utf-8')),
    );
    process.stdin.on('error', reject);
  });
}

void main();
