import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';

/** Ids des Questions actives du Référentiel — le référentiel de traduction pour `positionDansSelectionComplete`. */
export async function chargerIdsQuestionsActives(
  referentiel: ReferentielRepository,
): Promise<Set<string>> {
  const chargee = await referentiel.charger();
  return new Set(
    chargee.themesActifs().flatMap((theme) => theme.questions.map((q) => q.id)),
  );
}

/**
 * Traduit une position exprimée dans la liste *affichée* (celle que l'écran composer envoie,
 * filtrée aux Questions actives — cf. `ModeleSession.selectionEnrichie`) vers une position dans
 * la liste *complète* de la Sélection (celle que `Selection.ajouter`/`reordonner` manipulent,
 * archivées comprises). Sans cette traduction, une Question archivée mais toujours présente dans
 * la Sélection (invariant : "disparaît des méthodes de lecture... sans en être retirée
 * physiquement", docs/design/agregat-session.md §2) décale silencieusement toute insertion ou
 * réordonnancement situé après elle.
 */
export function positionDansSelectionComplete(
  idsComplets: readonly string[],
  idsActifs: ReadonlySet<string>,
  positionAffichee: number | undefined,
): number | undefined {
  if (positionAffichee === undefined) {
    return undefined;
  }
  let compteVisibles = 0;
  for (let index = 0; index < idsComplets.length; index++) {
    if (idsActifs.has(idsComplets[index])) {
      if (compteVisibles === positionAffichee) {
        return index;
      }
      compteVisibles++;
    }
  }
  return idsComplets.length;
}
