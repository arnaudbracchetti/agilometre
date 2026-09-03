import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { CleTemplateEmail } from '../domain/cles-templates-email';
import { MailSender } from '../domain/mail-sender';
import type { TemplateRepository } from '../domain/template.repository';

@Injectable()
export class NodemailerMailSender implements MailSender {
  private readonly transporteur: nodemailer.Transporter;
  private readonly expediteur: string;

  constructor(
    config: ConfigService,
    private readonly templates: TemplateRepository,
  ) {
    const utilisateur = config.get<string>('SMTP_USER');
    this.transporteur = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      secure: config.get<boolean>('SMTP_SECURE') ?? false,
      auth: utilisateur
        ? { user: utilisateur, pass: config.get<string>('SMTP_PASSWORD') }
        : undefined,
    });
    this.expediteur = config.get<string>('SMTP_FROM')!;
  }

  async envoyer(
    cle: CleTemplateEmail,
    destinataire: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const resultat = await this.templates.trouverParCle(cle);
    if (resultat.estEchec) {
      // Un bootstrap réussi (`ValiderTemplatesEmail`) a déjà validé cette clé — un échec ici est un
      // bug de programmation, pas un cas métier. Capturé par le try/catch déjà présent dans
      // `EmettreJetonCompte`, qui ne fait jamais échouer la création de compte / la demande de
      // réinitialisation pour un souci d'email.
      throw new Error(
        `Gabarit d'email introuvable ou invalide pour la clé "${cle}" : ${resultat.erreur.message}`,
      );
    }

    const rendu = resultat.valeur.rendre(variables);
    await this.transporteur.sendMail({
      from: this.expediteur,
      to: destinataire,
      subject: rendu.sujet,
      html: rendu.html,
      text: rendu.texte,
    });
  }
}
