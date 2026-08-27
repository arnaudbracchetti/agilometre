import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ProfilEquipeDto } from '@agilometre/shared';
import { Chargement } from '../../shared/chargement/chargement';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { SyntheseThemes } from '../../shared/synthese-themes/synthese-themes';
import { ArbreOrganisation } from '../arbre-organisation/arbre-organisation';
import { OrganisationService } from '../organisation.service';

/**
 * Profil d'une Équipe, navigable Période par Période (#53 puis carrousel) via un carrousel simple
 * — pas `nz-carousel` (ng-zorro-antd), pensé pour un jeu de diapositives déjà en mémoire, alors
 * qu'ici une seule Période à la fois est chargée depuis l'API à chaque navigation. En écran de
 * premier niveau (menu « Profil d'équipe ») : arbre de sélection à gauche (`ArbreOrganisation`,
 * partagé avec `OrganisationPage`), résultats à droite dans le même gabarit que la Synthèse de
 * séance (`SyntheseThemes`, partagé avec `SynthesePage`) — même lecture des Paliers par Thème,
 * qu'ils viennent d'une seule séance ou d'une Période entière.
 */
@Component({
  selector: 'app-profil-equipe-page',
  imports: [
    DatePipe,
    NzButtonModule,
    NzIconModule,
    Chargement,
    ErrorMessage,
    SyntheseThemes,
    ArbreOrganisation,
  ],
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
  protected readonly offset = signal(0);
  protected readonly chargementEnCours = signal(false);
  protected readonly chargementPeriode = signal(false);
  protected readonly inaccessible = signal(false);

  constructor() {
    // `paramMap` (pas `snapshot.paramMap` lu une fois) : sélectionner une autre Équipe dans
    // l'arbre navigue vers un nouvel `:id` sans recréer ce composant (même configuration de
    // route), donc seul un flux réactif capte le changement.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.equipeId.set(id);
      this.profil.set(null);
      this.offset.set(0);
      this.inaccessible.set(false);
      if (id) {
        this.chargerProfil(id, 0);
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

  protected periodePrecedente(): void {
    const id = this.equipeId();
    if (!id || this.chargementPeriode() || !this.profil()?.aPeriodePrecedente) {
      return;
    }
    const nouvelOffset = this.offset() + 1;
    this.offset.set(nouvelOffset);
    this.chargerProfil(id, nouvelOffset);
  }

  protected periodeSuivante(): void {
    const id = this.equipeId();
    if (!id || this.chargementPeriode() || this.offset() === -1) {
      return;
    }
    const nouvelOffset = this.offset() - 1;
    this.offset.set(nouvelOffset);
    this.chargerProfil(id, nouvelOffset);
  }

  private chargerProfil(id: string, offset: number): void {
    // Seul le tout premier chargement d'une Équipe masque l'écran entier (`app-chargement`) : la
    // navigation entre Périodes garde l'en-tête et les boutons du carrousel visibles pour éviter
    // un saut visuel, seule la zone de résultats bascule en chargement (cf. le template).
    if (this.profil() === null) {
      this.chargementEnCours.set(true);
    } else {
      this.chargementPeriode.set(true);
    }
    this.organisationService.obtenirProfil(id, offset).subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.chargementEnCours.set(false);
        this.chargementPeriode.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
        this.chargementPeriode.set(false);
      },
    });
  }
}
