import { UtilisateurConnecte } from '../../auth/jeton-utilisateur';
import { PerimetreUtilisateur } from '../../auth/domain/perimetre-utilisateur';
import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';

/**
 * Filtrage par périmètre fait ici, pas via `PerimetreGuard` — ce guard ne couvre que les routes à
 * ressource unique (`:id`), jamais une collection (docs/design/agregat-politique-des-droits.md §3).
 */
export class ListerEntites {
  constructor(
    private readonly repository: EntiteRepository,
    private readonly perimetre: PerimetreUtilisateur,
  ) {}

  async executer(utilisateur: UtilisateurConnecte): Promise<Entite[]> {
    const entites = await this.repository.findAll();
    const visibilites = await Promise.all(
      entites.map((entite) =>
        this.perimetre.peutVoirEntite(utilisateur, entite.id),
      ),
    );
    return entites
      .filter((_, index) => visibilites[index])
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }
}
