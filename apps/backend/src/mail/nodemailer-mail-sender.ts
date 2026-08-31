import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailSender, MessageEmail } from './mail-sender';

@Injectable()
export class NodemailerMailSender implements MailSender {
  private readonly transporteur: nodemailer.Transporter;
  private readonly expediteur: string;

  constructor(config: ConfigService) {
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

  async envoyer(message: MessageEmail): Promise<void> {
    await this.transporteur.sendMail({
      from: this.expediteur,
      to: message.destinataire,
      subject: message.sujet,
      text: message.texte,
    });
  }
}
