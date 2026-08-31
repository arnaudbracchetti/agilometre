import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AmorcerPremierCoach } from './organisation/application/amorcer-premier-coach.usecase';

/**
 * Amorçage du premier compte Coach — doc/spec/annexes/gestion-des-droits.md, "Cycle de vie d'un
 * compte" : exécuté explicitement, hors du cycle de démarrage normal du serveur, jamais rejoué
 * automatiquement au boot. Documenté dans docs/deploy-agilometre.md. Simple point d'entrée CLI
 * autour de `AmorcerPremierCoach` (apps/backend/src/organisation/application/) : toute la
 * logique (garde de doublon, hachage, validation d'invariant) vit dans le use case, testable
 * sans passer par ce script.
 *
 * Usage : pnpm --filter backend run bootstrap:coach -- \
 *   --email=coach@client.example --prenom=Ada --nom=Lovelace --mot-de-passe=...
 */
async function main() {
  const arguments_ = lireArguments(process.argv.slice(2));
  for (const cle of ['email', 'prenom', 'nom', 'mot-de-passe'] as const) {
    if (!arguments_[cle]) {
      console.error(`Argument manquant : --${cle}=...`);
      process.exitCode = 1;
      return;
    }
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const amorcerPremierCoach = app.get(AmorcerPremierCoach);
    const resultat = await amorcerPremierCoach.executer(
      arguments_.email!,
      arguments_.prenom!,
      arguments_.nom!,
      arguments_['mot-de-passe']!,
    );

    if (resultat.type === 'email_deja_utilise') {
      console.error(`Un compte existe déjà avec l'email ${arguments_.email}`);
      process.exitCode = 1;
      return;
    }
    if (resultat.type === 'invalide') {
      console.error(resultat.erreur.message);
      process.exitCode = 1;
      return;
    }
    if (resultat.type === 'mot_de_passe_trop_court') {
      console.error('Le mot de passe doit contenir au moins 8 caractères');
      process.exitCode = 1;
      return;
    }

    console.log(`Compte Coach créé : ${resultat.utilisateur.email}`);
  } finally {
    await app.close();
  }
}

function lireArguments(argv: string[]): Record<string, string | undefined> {
  const resultat: Record<string, string | undefined> = {};
  for (const argument of argv) {
    const correspondance = /^--([\w-]+)=(.*)$/.exec(argument);
    if (correspondance) {
      resultat[correspondance[1]] = correspondance[2];
    }
  }
  return resultat;
}

void main();
