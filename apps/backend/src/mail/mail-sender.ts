export interface MessageEmail {
  destinataire: string;
  sujet: string;
  texte: string;
}

export interface MailSender {
  envoyer(message: MessageEmail): Promise<void>;
}
