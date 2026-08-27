import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfilEquipeDto } from '@agilometre/shared';
import { Chargement } from '../../shared/chargement/chargement';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { SyntheseThemes } from '../../shared/synthese-themes/synthese-themes';
import { ArbreOrganisation } from '../arbre-organisation/arbre-organisation';
import { OrganisationService } from '../organisation.service';

/**
 * Profil d'une Équipe sur la dernière Période de calcul complète (#53), en écran de premier
 * niveau (menu « Profil d'équipe ») : arbre de sélection à gauche (`ArbreOrganisation`, partagé
 * avec `OrganisationPage`), résultats à droite dans le même gabarit que la Synthèse de séance
 * (`SyntheseThemes`, partagé avec `SynthesePage`) — même lecture des Paliers par Thème, qu'ils
 * viennent d'une seule séance ou d'une Période entière.
 */
@Component({
  selector: 'app-profil-equipe-page',
  imports: [DatePipe, Chargement, ErrorMessage, SyntheseThemes, ArbreOrganisation],
  templateUrl: './profil-equipe-page.html',
  styleUrl: './profil-equipe-page.scss',
})
export class ProfilEquipePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly organisationService = inject(OrganisationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly arbre = viewChild.required(ArbreOrganisation);

  protected readonly equipeId = signal<string | null>(null);
  protected readonly profil = signal<ProfilEquipeDto | null>(null);
  protected readonly chargementEnCours = signal(false);
  protected readonly inaccessible = signal(false);

  constructor() {
    // `paramMap` (pas `snapshot.paramMap` lu une fois) : sélectionner une autre Équipe dans
    // l'arbre navigue vers un nouvel `:id` sans recréer ce composant (même configuration de
    // route), donc seul un flux réactif capte le changement.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.equipeId.set(id);
      this.profil.set(null);
      this.inaccessible.set(false);
      if (id) {
        this.chargerProfil(id);
      }
    });

    // Sélectionner une Équipe dans l'arbre navigue vers son Profil — l'URL reste partageable.
    effect(() => {
      const selection = this.arbre().selectionActuelle();
      if (selection.type === 'equipe') {
        this.router.navigate(['/profil-equipe', selection.equipe.id]);
      }
    });
  }

  private chargerProfil(id: string): void {
    this.chargementEnCours.set(true);
    this.organisationService.obtenirProfil(id).subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
      },
    });
  }
}
