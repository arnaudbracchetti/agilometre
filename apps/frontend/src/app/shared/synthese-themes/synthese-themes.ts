import { Component, computed, input, signal } from '@angular/core';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { SyntheseThemeDto } from '@agilometre/shared';
import { CranConsensus } from '../cran-consensus/cran-consensus';
import { MoyenneGraduee } from '../moyenne-graduee/moyenne-graduee';
import { PalierTheme } from '../palier-theme/palier-theme';
import { RepartitionNiveaux } from '../repartition-niveaux/repartition-niveaux';
import { couleurCategorielle, couleurCategorielleFond } from '../couleur-categorielle';

/** Rang de tri d'un Thème : proche du franchissement d'abord, Palier déjà maximal ensuite, sans donnée en dernier. */
function rangTri(theme: SyntheseThemeDto): 0 | 1 | 2 {
  if (theme.palier === null) {
    return 2;
  }
  if (theme.tauxApproche === null) {
    return 1;
  }
  return 0;
}

/**
 * Palier global + liste de Thèmes triés par proximité de franchissement, chacun dépliable pour
 * un drill-down par Question (Moyenne, cran de consensus, répartition par Niveau) — le gabarit de
 * présentation partagé entre la Synthèse de séance (`SynthesePage`) et le Profil d'Équipe
 * (`ProfilEquipePage`), pour que les deux écrans lisent des résultats de scoring de façon
 * identique (extrait de `synthese-page.html`, cf. carte lecture par Thème #52).
 */
@Component({
  selector: 'app-synthese-themes',
  imports: [NzCollapseModule, NzIconModule, CranConsensus, MoyenneGraduee, PalierTheme, RepartitionNiveaux],
  templateUrl: './synthese-themes.html',
  styleUrl: './synthese-themes.scss',
  host: { class: 'synthese-themes' },
})
export class SyntheseThemes {
  readonly themes = input.required<SyntheseThemeDto[]>();
  readonly palierGlobal = input.required<1 | 2 | 3 | 4 | null>();
  readonly tauxApprocheGlobal = input.required<number | null>();
  readonly margeAvantDescenteGlobal = input.required<number | null>();
  /** Message affiché à la place de la liste quand `themes` est vide — propre à chaque écran hôte
   * (une séance vs. une Équipe sur une Période). */
  readonly messageVide = input('Aucune réponse enregistrée.');

  protected readonly themesTries = computed(() =>
    [...this.themes()].sort((a, b) => {
      const rangA = rangTri(a);
      const rangB = rangTri(b);
      if (rangA !== rangB) {
        return rangA - rangB;
      }
      // Au sein du rang 0 (tauxApproche connu) : proche du franchissement d'abord.
      return (b.tauxApproche ?? 0) - (a.tauxApproche ?? 0);
    }),
  );

  protected readonly totalQuestionsRepondues = computed(() =>
    this.themes().reduce((somme, theme) => somme + theme.questions.length, 0),
  );
  protected readonly totalReponses = computed(() =>
    this.themes().reduce((somme, theme) => somme + theme.effectif, 0),
  );

  /** Thèmes dont le contenu (Questions ou message vide) est déplié — vide par défaut : l'écran
   * s'ouvre replié sur la seule ligne de Palier par Thème (vue d'ensemble), et le coach déplie
   * un Thème pour en voir le drill-down par Question. */
  private readonly themesOuverts = signal<ReadonlySet<string>>(new Set());

  /** Couleur catégorielle d'un Thème (même repère que le composeur de session — DESIGN.md). */
  protected couleurTheme(position: number): string {
    return couleurCategorielle(position);
  }

  /** Variante fond pâle de `couleurTheme`, pour l'en-tête de carte de Thème. */
  protected couleurThemeFond(position: number): string {
    return couleurCategorielleFond(position);
  }

  protected estOuvert(themeId: string): boolean {
    return this.themesOuverts().has(themeId);
  }

  protected toggleTheme(themeId: string): void {
    const ouverts = new Set(this.themesOuverts());
    if (ouverts.has(themeId)) {
      ouverts.delete(themeId);
    } else {
      ouverts.add(themeId);
    }
    this.themesOuverts.set(ouverts);
  }

  /** Accord simple (ajout d'un -s) pour les compteurs de Questions/Réponses. */
  protected pluriel(compte: number, singulier: string): string {
    return compte > 1 ? `${singulier}s` : singulier;
  }
}
