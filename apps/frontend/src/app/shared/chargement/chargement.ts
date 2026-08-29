import { Component, input } from '@angular/core';

/**
 * État de chargement unifié — remplace les quatre copies de `<p>Chargement…</p>` que portaient
 * synthese-page, profil-page, lecture-fine-page et pilotage-page. `role="status"` + `aria-live`
 * annonce l'attente à un lecteur d'écran, ce qu'aucune des quatre copies ne faisait.
 */
@Component({
  selector: 'app-chargement',
  imports: [],
  templateUrl: './chargement.html',
  styleUrl: './chargement.scss',
  host: {
    class: 'chargement',
    role: 'status',
    'aria-live': 'polite',
  },
})
export class Chargement {
  readonly libelle = input('Chargement…');
}
