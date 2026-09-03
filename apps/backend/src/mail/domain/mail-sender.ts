import { CleTemplateEmail } from './cles-templates-email';

export interface MailSender {
  envoyer(
    cle: CleTemplateEmail,
    destinataire: string,
    variables: Record<string, string>,
  ): Promise<void>;
}
