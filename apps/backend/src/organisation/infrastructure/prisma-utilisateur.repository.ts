import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Role as RolePrisma,
  Habilitation as HabilitationPrisma,
} from '@prisma/client';
import { Role } from '@agilometre/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { Utilisateur } from '../domain/utilisateur';
import { Habilitation } from '../domain/habilitation';
import {
  EmailUtilisateurDejaUtiliseError,
  UtilisateurRepository,
} from '../domain/utilisateur.repository';

function versDomaine(row: {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  motDePasseHash: string;
  actif: boolean;
  role: RolePrisma;
  habilitations: HabilitationPrisma[];
}): Utilisateur {
  return Utilisateur.reconstituer(
    row.id,
    row.email,
    row.prenom,
    row.nom,
    row.motDePasseHash,
    row.actif,
    row.role as unknown as Role,
    row.habilitations.map((habilitation) =>
      Habilitation.reconstituer(
        habilitation.id,
        habilitation.entiteId,
        habilitation.equipeId,
      ),
    ),
  );
}

@Injectable()
export class PrismaUtilisateurRepository implements UtilisateurRepository {
  constructor(private readonly prisma: PrismaService) {}

  async trouverParEmail(email: string): Promise<Utilisateur | null> {
    const row = await this.prisma.utilisateur.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { habilitations: true },
    });
    return row ? versDomaine(row) : null;
  }

  async trouverParId(id: string): Promise<Utilisateur | null> {
    const row = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: { habilitations: true },
    });
    return row ? versDomaine(row) : null;
  }

  async lister(): Promise<Utilisateur[]> {
    const rows = await this.prisma.utilisateur.findMany({
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      include: { habilitations: true },
    });
    return rows.map(versDomaine);
  }

  async save(utilisateur: Utilisateur): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.utilisateur.upsert({
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

        const idsActuels = utilisateur.habilitations.map(
          (habilitation) => habilitation.id,
        );
        await tx.habilitation.deleteMany({
          where: { utilisateurId: utilisateur.id, id: { notIn: idsActuels } },
        });

        for (const habilitation of utilisateur.habilitations) {
          await tx.habilitation.upsert({
            where: { id: habilitation.id },
            create: {
              id: habilitation.id,
              utilisateurId: utilisateur.id,
              entiteId: habilitation.entiteId,
              equipeId: habilitation.equipeId,
            },
            // Une Habilitation n'a pas de champ mutable une fois créée (voir habilitation.ts) —
            // l'upsert ne sert ici qu'à ne pas dupliquer une ligne déjà présente.
            update: {},
          });
        }
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
}
