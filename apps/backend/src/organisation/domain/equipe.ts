import { Result } from '../../shared-kernel/result';
import { ErreurInvariantMembre, Membre } from './membre';

export class NomEquipeInvalideError extends Error {
  constructor() {
    super('Le nom d’une Équipe ne peut pas être vide');
    this.name = 'NomEquipeInvalideError';
  }
}

export class EmailMembreDejaUtiliseError extends Error {
  constructor() {
    super('Un Membre porte déjà cet email dans cette Équipe');
    this.name = 'EmailMembreDejaUtiliseError';
  }
}

export class MembreIntrouvableError extends Error {
  constructor() {
    super('Ce Membre ne fait pas partie du roster de cette Équipe');
    this.name = 'MembreIntrouvableError';
  }
}

export type ErreurInvariantEquipe = NomEquipeInvalideError;
export type ErreurAjoutMembre =
  ErreurInvariantMembre | EmailMembreDejaUtiliseError;
export type ErreurModifierMembre =
  MembreIntrouvableError | ErreurInvariantMembre | EmailMembreDejaUtiliseError;

export class Equipe {
  private constructor(
    readonly id: string,
    private _nom: string,
    readonly entiteId: string,
    private readonly _membres: Membre[],
  ) {}

  static creer(
    id: string,
    nom: string,
    entiteId: string,
  ): Result<Equipe, ErreurInvariantEquipe> {
    const validation = Equipe.validerNom(nom);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(new Equipe(id, nom.trim(), entiteId, []));
  }

  /**
   * Recharge une Équipe (avec son roster) depuis une source déjà validée (le repository Prisma)
   * — ne revalide pas l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance
   * requise pour toute factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    nom: string,
    entiteId: string,
    membres: Membre[],
  ): Equipe {
    return new Equipe(id, nom, entiteId, membres);
  }

  private static validerNom(nom: string): Result<void, ErreurInvariantEquipe> {
    if (nom.trim().length === 0) {
      return Result.echec(new NomEquipeInvalideError());
    }
    return Result.succes(undefined);
  }

  get nom(): string {
    return this._nom;
  }

  get membres(): readonly Membre[] {
    return [...this._membres];
  }

  renommer(nom: string): Result<void, ErreurInvariantEquipe> {
    const validation = Equipe.validerNom(nom);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    this._nom = nom.trim();
    return Result.succes(undefined);
  }

  ajouterMembre(
    id: string,
    nom: string,
    email: string,
  ): Result<Membre, ErreurAjoutMembre> {
    const resultat = Membre.creer(id, nom, email);
    if (resultat.estEchec) {
      return Result.echec(resultat.erreur);
    }
    const emailRecherche = resultat.valeur.email.toLowerCase();
    const doublon = this._membres.some(
      (membre) => membre.email.toLowerCase() === emailRecherche,
    );
    if (doublon) {
      return Result.echec(new EmailMembreDejaUtiliseError());
    }
    this._membres.push(resultat.valeur);
    return Result.succes(resultat.valeur);
  }

  retirerMembre(membreId: string): Result<void, MembreIntrouvableError> {
    const index = this._membres.findIndex((membre) => membre.id === membreId);
    if (index === -1) {
      return Result.echec(new MembreIntrouvableError());
    }
    this._membres.splice(index, 1);
    return Result.succes(undefined);
  }

  modifierMembre(
    membreId: string,
    nom: string,
    email: string,
  ): Result<void, ErreurModifierMembre> {
    const membre = this._membres.find((m) => m.id === membreId);
    if (!membre) {
      return Result.echec(new MembreIntrouvableError());
    }
    const emailRecherche = email.trim().toLowerCase();
    const doublon = this._membres.some(
      (autre) =>
        autre.id !== membreId && autre.email.toLowerCase() === emailRecherche,
    );
    if (doublon) {
      return Result.echec(new EmailMembreDejaUtiliseError());
    }
    return membre.modifier(nom, email);
  }
}
