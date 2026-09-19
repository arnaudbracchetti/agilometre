import { randomUUID } from 'node:crypto';
import { ModeleCollecte } from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';
import { Selection } from '../domain/selection';

export type ResultatDupliquerModeleCollecte =
  { type: 'introuvable' } | { type: 'duplique'; modele: ModeleCollecte };

export class DupliquerModeleCollecte {
  constructor(private readonly repository: ModeleCollecteRepository) {}

  async executer(id: string): Promise<ResultatDupliquerModeleCollecte> {
    const original = await this.repository.findById(id);
    if (!original) {
      return { type: 'introuvable' };
    }
    // `reconstituer`, pas `creer` + `ajouterTheme` : la Sélection copiée a déjà passé les
    // invariants d'unicité de l'originale (source de confiance), et il ne s'agit pas d'un "ajout
    // de Thème" métier — reconstituer rehydrate directement l'état déjà validé, comme documenté
    // sur cette factory. original.nom est garanti non vide (déjà validé par
    // ModeleCollecte.creer/renommer), donc son suffixe l'est aussi.
    const copie = ModeleCollecte.reconstituer(
      randomUUID(),
      `${original.nom} (copie)`,
      Selection.reconstituer([...original.selection.questionIds]),
    );
    await this.repository.save(copie);
    return { type: 'duplique', modele: copie };
  }
}
