import { Injectable } from '@nestjs/common';
import { Prisma, Membre as MembrePrisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Equipe } from '../domain/equipe';
import { Membre } from '../domain/membre';
import {
  EquipeRepository,
  EquipeReferenceeError,
  NomEquipeDejaUtiliseError,
} from '../domain/equipe.repository';

function versEquipe(row: {
  id: string;
  nom: string;
  entiteId: string;
  membres: MembrePrisma[];
}): Equipe {
  return Equipe.reconstituer(
    row.id,
    row.nom,
    row.entiteId,
    row.membres.map((membre) =>
      Membre.reconstituer(
        membre.id,
        membre.nom,
        membre.email,
        membre.utilisateurId,
      ),
    ),
  );
}

@Injectable()
export class PrismaEquipeRepository implements EquipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Equipe | null> {
    const row = await this.prisma.equipe.findUnique({
      where: { id },
      include: { membres: true },
    });
    return row ? versEquipe(row) : null;
  }

  async findByEntiteId(entiteId: string): Promise<Equipe[]> {
    const rows = await this.prisma.equipe.findMany({
      where: { entiteId },
      include: { membres: true },
    });
    return rows.map(versEquipe);
  }

  async trouverParNom(nom: string): Promise<Equipe | null> {
    const row = await this.prisma.equipe.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
      include: { membres: true },
    });
    return row ? versEquipe(row) : null;
  }

  async save(equipe: Equipe): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.equipe.upsert({
          where: { id: equipe.id },
          create: { id: equipe.id, nom: equipe.nom, entiteId: equipe.entiteId },
          update: { nom: equipe.nom },
        });

        const idsActuels = equipe.membres.map((membre) => membre.id);
        await tx.membre.deleteMany({
          where: { equipeId: equipe.id, id: { notIn: idsActuels } },
        });

        for (const membre of equipe.membres) {
          await tx.membre.upsert({
            where: { id: membre.id },
            create: {
              id: membre.id,
              nom: membre.nom,
              email: membre.email,
              equipeId: equipe.id,
              utilisateurId: membre.utilisateurId,
            },
            update: {
              nom: membre.nom,
              email: membre.email,
              utilisateurId: membre.utilisateurId,
            },
          });
        }
      });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new NomEquipeDejaUtiliseError();
      }
      throw erreur;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.equipe.delete({ where: { id } });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2003'
      ) {
        throw new EquipeReferenceeError();
      }
      throw erreur;
    }
  }

  async compterParEntite(entiteId: string): Promise<number> {
    return this.prisma.equipe.count({ where: { entiteId } });
  }
}
