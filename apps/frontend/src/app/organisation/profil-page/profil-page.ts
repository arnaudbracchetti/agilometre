import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ArbreOrganisation } from '../arbre-organisation/arbre-organisation';

/**
 * Composant parent partagé par le Profil d'Équipe et le Profil d'Entité (#profil-entite) :
 * héberge l'arbre de navigation (`ArbreOrganisation`) une seule fois, avec un `<router-outlet>`
 * pour le détail — sélectionner une Équipe ou une Entité navigue vers `/profil/equipe/:id` ou
 * `/profil/entite/:id` sans redémonter l'arbre (recherche/dépli/sélection conservés).
 */
@Component({
  selector: 'app-profil-page',
  imports: [RouterOutlet, ArbreOrganisation],
  templateUrl: './profil-page.html',
  styleUrl: './profil-page.scss',
})
export class ProfilPage {
  private readonly router = inject(Router);

  protected readonly arbre = viewChild.required(ArbreOrganisation);
  protected readonly enfantActif = signal(false);

  constructor() {
    effect(() => {
      const selection = this.arbre().selectionActuelle();
      if (selection.type === 'equipe') {
        this.router.navigate(['/profil/equipe', selection.equipe.id]);
      } else if (selection.type === 'entite') {
        this.router.navigate(['/profil/entite', selection.entite.id]);
      }
    });
  }

  protected onActivate(): void {
    this.enfantActif.set(true);
  }

  protected onDeactivate(): void {
    this.enfantActif.set(false);
  }
}
