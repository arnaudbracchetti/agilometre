import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

const NIVEAU_MIN = 1;
const NIVEAU_MAX = 4;

/**
 * Repère visuel de la Moyenne d'une Question sur l'échelle des Niveaux (1 à 4) — un point sur une
 * ligne graduée, pas une barre de progression : une Moyenne est une position, pas un but à
 * remplir (une Moyenne basse peut simplement refléter un désaccord réel de l'Équipe).
 *
 * `null` : aucune Réponse — ne devrait pas se produire pour une Question déjà présente dans
 * `theme.questions` (`CalculerSyntheseScoring` les filtre à la source), mais le type du DTO reste
 * nullable ; on ne rend alors rien plutôt qu'une valeur inventée.
 */
@Component({
  selector: 'app-moyenne-graduee',
  imports: [DecimalPipe],
  templateUrl: './moyenne-graduee.html',
  styleUrl: './moyenne-graduee.scss',
  host: { class: 'moyenne-graduee' },
})
export class MoyenneGraduee {
  readonly moyenne = input.required<number | null>();

  protected readonly niveaux = [1, 2, 3, 4] as const;

  /**
   * Un seul computed regroupant position et valeur, plutôt que deux signaux séparés : `@if` teste
   * la présence par troncature JS, et une position de 0 % (moyenne = 1, le minimum) serait sinon
   * considérée falsy et masquerait le marqueur. Un objet non nul reste toujours truthy, quel que
   * soit son contenu numérique.
   *
   * Pas de clamp sur la position : le domaine garantit moyenne ∈ [1, 4] dès qu'il y a au moins une
   * Réponse (Niveau.creer).
   */
  protected readonly repere = computed(() => {
    const moyenne = this.moyenne();
    if (moyenne === null) {
      return null;
    }
    return {
      position: ((moyenne - NIVEAU_MIN) / (NIVEAU_MAX - NIVEAU_MIN)) * 100,
      valeur: moyenne,
    };
  });
}
