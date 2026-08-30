import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { UtilisateurRepository } from '../../organisation/domain/utilisateur.repository';
import { ChargeJetonUtilisateur } from '../jeton-utilisateur';

export type ResultatSeConnecter =
  { type: 'ok'; jeton: string } | { type: 'echec' };

/**
 * Échoue avec le même résultat générique ('echec') que le compte soit introuvable, désactivé, ou
 * le mot de passe incorrect — doc/spec/annexes/gestion-des-droits.md, "Authentification" :
 * aucune distinction observable entre ces trois cas.
 */
export class SeConnecter {
  constructor(
    private readonly utilisateurs: UtilisateurRepository,
    private readonly jwt: JwtService,
  ) {}

  async executer(
    email: string,
    motDePasse: string,
  ): Promise<ResultatSeConnecter> {
    const utilisateur = await this.utilisateurs.trouverParEmail(email);
    if (!utilisateur || !utilisateur.actif) {
      return { type: 'echec' };
    }

    const motDePasseValide = await argon2.verify(
      utilisateur.motDePasseHash,
      motDePasse,
    );
    if (!motDePasseValide) {
      return { type: 'echec' };
    }

    const charge: ChargeJetonUtilisateur = {
      sub: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
    };
    return { type: 'ok', jeton: await this.jwt.signAsync(charge) };
  }
}
