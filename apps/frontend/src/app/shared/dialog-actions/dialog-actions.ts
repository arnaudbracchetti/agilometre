import { Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

/**
 * Pied commun de toute boîte de dialogue de l'app : Annuler puis Action, toujours dans cet
 * ordre, jamais composés à la main écran par écran. Le bouton Action garde `type="submit"` par
 * défaut pour participer au `(ngSubmit)` d'un `<form>` englobant (Entrée dans un champ le
 * déclenche) — `typeAction` bascule en `"button"` pour une boîte de dialogue sans formulaire
 * (ex. confirmation d'une action destructrice), où seul l'événement `action` compte.
 */
@Component({
  selector: 'app-dialog-actions',
  imports: [NzButtonModule],
  templateUrl: './dialog-actions.html',
  styleUrl: './dialog-actions.scss',
  host: { class: 'dialog-actions' },
})
export class DialogActions {
  readonly libelleAction = input.required<string>();
  readonly typeAction = input<'submit' | 'button'>('submit');
  readonly actionEnCours = input(false);
  readonly actionDesactivee = input(false);
  readonly actionDangereuse = input(false);

  readonly annuler = output<void>();
  readonly action = output<void>();
}
