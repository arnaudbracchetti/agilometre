import { UtilisateurConnecte } from '../../auth/jeton-utilisateur';
import { PerimetreUtilisateur } from '../../auth/domain/perimetre-utilisateur';
import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';

/**
 * Filtrage par périmètre fait ici, pas via `PerimetreGuard` — ce guard ne couvre que les routes à
 * ressource unique (`:id`), jamais une collection (docs/design/agregat-politique-des-droits.md §3),
 * même patron que `ListerEntites`. Sert à la fois la gestion CRUD (Coach, `peutVoirEquipe` toujours
 * vrai - aucun filtrage effectif) et l'arbre de navigation d'un Membre d'équipe (#62, filtré à ses
 * Équipes) - une Direction, qui n'a jamais aucune Équipe visible, obtient une liste vide même en
 * appelant cette route directement (fail-closed, pas seulement un masquage côté vue).
 */
export class ListerEquipesParEntite {
  constructor(
    private readonly repository: EquipeRepository,
    private readonly perimetre: PerimetreUtilisateur,
  ) {}

  async executer(
    entiteId: string,
    utilisateur: UtilisateurConnecte,
  ): Promise<Equipe[]> {
    const equipes = await this.repository.findByEntiteId(entiteId);
    const visibilites = await Promise.all(
      equipes.map((equipe) =>
        this.perimetre.peutVoirEquipe(utilisateur, equipe.id),
      ),
    );
    return equipes
      .filter((_, index) => visibilites[index])
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }
}
