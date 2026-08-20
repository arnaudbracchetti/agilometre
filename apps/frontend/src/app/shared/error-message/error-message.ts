import { Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type TailleMessageErreur = 'inline' | 'page';

/**
 * Message d'erreur — affichage unifié (icône + texte, sur une teinte danger dédiée, distincte
 * de --color-accent qui porte l'identité de marque plutôt qu'un signal d'erreur) pour toute
 * erreur persistante affichée dans l'app : du message de validation sous un champ (`inline`,
 * défaut) à l'état "page indisponible" (`page`, plus grand). Ne remplace pas NzMessageService
 * (toast transitoire) — seulement les messages tenus à l'écran jusqu'à résolution.
 */
@Component({
  selector: 'app-error-message',
  imports: [NzIconModule],
  templateUrl: './error-message.html',
  styleUrl: './error-message.scss',
  host: {
    class: 'error-message',
    '[class.error-message--page]': "taille() === 'page'",
    role: 'alert',
  },
})
export class ErrorMessage {
  readonly message = input.required<string>();
  readonly taille = input<TailleMessageErreur>('inline');
}
