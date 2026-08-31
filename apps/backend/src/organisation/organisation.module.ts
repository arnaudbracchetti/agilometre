import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CreerEntite } from './application/creer-entite.usecase';
import { RenommerEntite } from './application/renommer-entite.usecase';
import { ListerEntites } from './application/lister-entites.usecase';
import { CreerEquipe } from './application/creer-equipe.usecase';
import { RenommerEquipe } from './application/renommer-equipe.usecase';
import { SupprimerEquipe } from './application/supprimer-equipe.usecase';
import { SupprimerEntite } from './application/supprimer-entite.usecase';
import { ListerEquipesParEntite } from './application/lister-equipes-par-entite.usecase';
import { AjouterMembre } from './application/ajouter-membre.usecase';
import { RetirerMembre } from './application/retirer-membre.usecase';
import { ModifierMembre } from './application/modifier-membre.usecase';
import { AmorcerPremierCoach } from './application/amorcer-premier-coach.usecase';
import { CreerUtilisateur } from './application/creer-utilisateur.usecase';
import { ModifierUtilisateur } from './application/modifier-utilisateur.usecase';
import { DesactiverUtilisateur } from './application/desactiver-utilisateur.usecase';
import { ReactiverUtilisateur } from './application/reactiver-utilisateur.usecase';
import { ListerUtilisateurs } from './application/lister-utilisateurs.usecase';
import { AjouterHabilitation } from './application/ajouter-habilitation.usecase';
import { RetirerHabilitation } from './application/retirer-habilitation.usecase';
import { ChangerRoleUtilisateur } from './application/changer-role-utilisateur.usecase';
import { DemanderReinitialisation } from './application/demander-reinitialisation.usecase';
import { DefinirMotDePasse } from './application/definir-mot-de-passe.usecase';
import { ChangerMotDePasse } from './application/changer-mot-de-passe.usecase';
import { ObtenirMonCompte } from './application/obtenir-mon-compte.usecase';
import { EmettreJetonCompte } from './application/emettre-jeton-compte';
import { PrismaEntiteRepository } from './infrastructure/prisma-entite.repository';
import { PrismaEquipeRepository } from './infrastructure/prisma-equipe.repository';
import { PrismaUtilisateurRepository } from './infrastructure/prisma-utilisateur.repository';
import { PrismaJetonCompteRepository } from './infrastructure/prisma-jeton-compte.repository';
import { PerimetreUtilisateur } from '../auth/domain/perimetre-utilisateur';
import { OrganisationController } from './organisation.controller';
import { ComptesController } from './comptes.controller';
import { MotDePasseController } from './mot-de-passe.controller';
import { MonCompteController } from './mon-compte.controller';
import { MailModule } from '../mail/mail.module';
import { NodemailerMailSender } from '../mail/nodemailer-mail-sender';

@Module({
  imports: [ConfigModule, MailModule],
  controllers: [
    OrganisationController,
    ComptesController,
    MotDePasseController,
    MonCompteController,
  ],
  exports: [
    PrismaEquipeRepository,
    PrismaEntiteRepository,
    PrismaUtilisateurRepository,
    AmorcerPremierCoach,
  ],
  providers: [
    PrismaEntiteRepository,
    PrismaEquipeRepository,
    PrismaUtilisateurRepository,
    PrismaJetonCompteRepository,
    {
      provide: CreerEntite,
      useFactory: (repository: PrismaEntiteRepository) =>
        new CreerEntite(repository),
      inject: [PrismaEntiteRepository],
    },
    {
      provide: RenommerEntite,
      useFactory: (repository: PrismaEntiteRepository) =>
        new RenommerEntite(repository),
      inject: [PrismaEntiteRepository],
    },
    {
      // `PerimetreUtilisateur` instancié ici directement (pas injecté depuis `AuthModule`, qui
      // importe déjà `OrganisationModule` pour `PrismaUtilisateurRepository`) : importer
      // `AuthModule` ici créerait un cycle de modules Nest. C'est un simple import TS d'une classe
      // de domaine sans framework, pas un `imports: [...]` de module — aucun cycle réel.
      provide: ListerEntites,
      useFactory: (
        repository: PrismaEntiteRepository,
        utilisateurs: PrismaUtilisateurRepository,
      ) =>
        new ListerEntites(repository, new PerimetreUtilisateur(utilisateurs)),
      inject: [PrismaEntiteRepository, PrismaUtilisateurRepository],
    },
    {
      provide: CreerEquipe,
      useFactory: (
        equipes: PrismaEquipeRepository,
        entites: PrismaEntiteRepository,
      ) => new CreerEquipe(equipes, entites),
      inject: [PrismaEquipeRepository, PrismaEntiteRepository],
    },
    {
      provide: RenommerEquipe,
      useFactory: (repository: PrismaEquipeRepository) =>
        new RenommerEquipe(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: SupprimerEquipe,
      useFactory: (repository: PrismaEquipeRepository) =>
        new SupprimerEquipe(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: SupprimerEntite,
      useFactory: (
        entites: PrismaEntiteRepository,
        equipes: PrismaEquipeRepository,
      ) => new SupprimerEntite(entites, equipes),
      inject: [PrismaEntiteRepository, PrismaEquipeRepository],
    },
    {
      provide: ListerEquipesParEntite,
      useFactory: (repository: PrismaEquipeRepository) =>
        new ListerEquipesParEntite(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: AjouterMembre,
      useFactory: (repository: PrismaEquipeRepository) =>
        new AjouterMembre(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: RetirerMembre,
      useFactory: (repository: PrismaEquipeRepository) =>
        new RetirerMembre(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: ModifierMembre,
      useFactory: (repository: PrismaEquipeRepository) =>
        new ModifierMembre(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: AmorcerPremierCoach,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new AmorcerPremierCoach(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: EmettreJetonCompte,
      useFactory: (
        jetons: PrismaJetonCompteRepository,
        mailSender: NodemailerMailSender,
        config: ConfigService,
      ) =>
        new EmettreJetonCompte(
          jetons,
          mailSender,
          config.get<string>('APP_URL')!,
        ),
      inject: [
        PrismaJetonCompteRepository,
        NodemailerMailSender,
        ConfigService,
      ],
    },
    {
      provide: CreerUtilisateur,
      useFactory: (
        utilisateurs: PrismaUtilisateurRepository,
        emettreJetonCompte: EmettreJetonCompte,
      ) => new CreerUtilisateur(utilisateurs, emettreJetonCompte),
      inject: [PrismaUtilisateurRepository, EmettreJetonCompte],
    },
    {
      provide: ModifierUtilisateur,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new ModifierUtilisateur(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: DesactiverUtilisateur,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new DesactiverUtilisateur(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: ReactiverUtilisateur,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new ReactiverUtilisateur(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: ListerUtilisateurs,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new ListerUtilisateurs(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: AjouterHabilitation,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new AjouterHabilitation(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: RetirerHabilitation,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new RetirerHabilitation(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: ChangerRoleUtilisateur,
      useFactory: (repository: PrismaUtilisateurRepository) =>
        new ChangerRoleUtilisateur(repository),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: DemanderReinitialisation,
      useFactory: (
        utilisateurs: PrismaUtilisateurRepository,
        emettreJetonCompte: EmettreJetonCompte,
      ) => new DemanderReinitialisation(utilisateurs, emettreJetonCompte),
      inject: [PrismaUtilisateurRepository, EmettreJetonCompte],
    },
    {
      provide: DefinirMotDePasse,
      useFactory: (
        jetons: PrismaJetonCompteRepository,
        utilisateurs: PrismaUtilisateurRepository,
      ) => new DefinirMotDePasse(jetons, utilisateurs),
      inject: [PrismaJetonCompteRepository, PrismaUtilisateurRepository],
    },
    {
      provide: ChangerMotDePasse,
      useFactory: (utilisateurs: PrismaUtilisateurRepository) =>
        new ChangerMotDePasse(utilisateurs),
      inject: [PrismaUtilisateurRepository],
    },
    {
      provide: ObtenirMonCompte,
      useFactory: (utilisateurs: PrismaUtilisateurRepository) =>
        new ObtenirMonCompte(utilisateurs),
      inject: [PrismaUtilisateurRepository],
    },
  ],
})
export class OrganisationModule {}
