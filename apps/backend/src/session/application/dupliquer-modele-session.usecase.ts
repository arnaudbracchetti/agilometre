import { randomUUID } from 'node:crypto';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { Selection } from '../domain/selection';

export type ResultatDupliquerModeleSession =
  { type: 'introuvable' } | { type: 'duplique'; modele: ModeleSession };

export class DupliquerModeleSession {
  constructor(private readonly repository: ModeleSessionRepository) {}

  async executer(id: string): Promise<ResultatDupliquerModeleSession> {
    const original = await this.repository.findById(id);
    if (!original) {
      return { type: 'introuvable' };
    }
    // `reconstituer`, pas `creer` + `ajouterTheme` : la Sélection copiée a déjà passé les
    // invariants d'unicité de l'originale (source de confiance), et il ne s'agit pas d'un "ajout
    // de Thème" métier — reconstituer rehydrate directement l'état déjà validé, comme documenté
    // sur cette factory. original.nom est garanti non vide (déjà validé par
    // ModeleSession.creer/renommer), donc son suffixe l'est aussi.
    const copie = ModeleSession.reconstituer(
      randomUUID(),
      `${original.nom} (copie)`,
      Selection.reconstituer([...original.selection.questionIds]),
    );
    await this.repository.save(copie);
    return { type: 'duplique', modele: copie };
  }
}
