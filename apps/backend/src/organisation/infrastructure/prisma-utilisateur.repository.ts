import { Injectable } from '@nestjs/common';
import { Prisma, Role as RolePrisma } from '@prisma/client';
import { Role } from '@agilometre/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { Utilisateur } from '../domain/utilisateur';
import {
  EmailUtilisateurDejaUtiliseError,
  UtilisateurRepository,
} from '../domain/utilisateur.repository';

@Injectable()
export class PrismaUtilisateurRepository implements UtilisateurRepository {
  constructor(private readonly prisma: PrismaService) {}

  async trouverParEmail(email: string): Promise<Utilisateur | null> {
    const row = await this.prisma.utilisateur.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    return row ? this.versDomaine(row) : null;
  }

  async trouverParId(id: string): Promise<Utilisateur | null> {
    const row = await this.prisma.utilisateur.findUnique({ where: { id } });
    return row ? this.versDomaine(row) : null;
  }

  async lister(): Promise<Utilisateur[]> {
    const rows = await this.prisma.utilisateur.findMany({
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    return rows.map((row) => this.versDomaine(row));
  }

  async save(utilisateur: Utilisateur): Promise<void> {
    try {
      await this.prisma.utilisateur.upsert({
        where: { id: utilisateur.id },
        create: {
          id: utilisateur.id,
          email: utilisateur.email,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          motDePasseHash: utilisateur.motDePasseHash,
          actif: utilisateur.actif,
          role: utilisateur.role,
        },
        update: {
          email: utilisateur.email,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          motDePasseHash: utilisateur.motDePasseHash,
          actif: utilisateur.actif,
          role: utilisateur.role,
        },
      });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new EmailUtilisateurDejaUtiliseError();
      }
      throw erreur;
    }
  }

  private versDomaine(row: {
    id: string;
    email: string;
    prenom: string;
    nom: string;
    motDePasseHash: string;
    actif: boolean;
    role: RolePrisma;
  }): Utilisateur {
    return Utilisateur.reconstituer(
      row.id,
      row.email,
      row.prenom,
      row.nom,
      row.motDePasseHash,
      row.actif,
      row.role as unknown as Role,
    );
  }
}
