import { randomBytes, randomUUID } from 'node:crypto';
import { MailSender } from '../../mail/mail-sender';
import { JetonCompte } from '../domain/jeton-compte';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';
import { HacherJetonCompte } from '../domain/jeton-hachage';
import { Utilisateur } from '../domain/utilisateur';

/**
 * Émission + envoi d'un Jeton de compte — le seul mécanisme, partagé littéralement (même code, pas
 * seulement même comportement) par `CreerUtilisateur` (invitation) et `DemanderReinitialisation`
 * (mot de passe oublié), doc/spec/annexes/gestion-des-droits.md, "Authentification". Volontairement
 * pas un use case (aucune route ne l'expose seul) : un collaborateur de deux use cases, au même
 * niveau qu'un repository.
 */
export class EmettreJetonCompte {
  constructor(
    private readonly jetons: JetonCompteRepository,
    private readonly mailSender: MailSender,
    private readonly urlPublique: string,
  ) {}

  async executer(utilisateur: Utilisateur): Promise<void> {
    const tokenBrut = randomBytes(32).toString('hex');
    const jeton = JetonCompte.creer(
      randomUUID(),
      utilisateur.id,
      HacherJetonCompte.executer(tokenBrut),
      new Date(),
    );
    await this.jetons.save(jeton);

    const lien = `${this.urlPublique}/definir-mot-de-passe?jeton=${tokenBrut}`;
    try {
      await this.mailSender.envoyer({
        destinataire: utilisateur.email,
        sujet: 'Définir votre mot de passe — Agilomètre',
        texte: `Bonjour ${utilisateur.prenom},\n\n${lien}\n\nCe lien est valable 7 jours, à usage unique.`,
      });
    } catch (erreur) {
      // Ne fait jamais échouer la création de compte / la demande de réinitialisation pour une
      // panne SMTP : le même mécanisme ("mot de passe oublié") reste le chemin de rattrapage une
      // fois le SMTP rétabli.
      console.error('Échec d’envoi de l’email de compte', erreur);
    }
  }
}
