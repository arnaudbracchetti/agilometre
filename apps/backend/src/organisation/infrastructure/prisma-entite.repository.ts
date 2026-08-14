import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Entite } from '../domain/entite';
import {
  EntiteRepository,
  NomEntiteDejaUtiliseError,
} from '../domain/entite.repository';

@Injectable()
export class PrismaEntiteRepository implements EntiteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Entite | null> {
    const row = await this.prisma.entite.findUnique({ where: { id } });
    return row ? Entite.reconstituer(row.id, row.nom) : null;
  }

  async findAll(): Promise<Entite[]> {
    const rows = await this.prisma.entite.findMany();
    return rows.map((row) => Entite.reconstituer(row.id, row.nom));
  }

  async trouverParNom(nom: string): Promise<Entite | null> {
    const row = await this.prisma.entite.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    });
    return row ? Entite.reconstituer(row.id, row.nom) : null;
  }

  async save(entite: Entite): Promise<void> {
    try {
      await this.prisma.entite.upsert({
        where: { id: entite.id },
        create: { id: entite.id, nom: entite.nom },
        update: { nom: entite.nom },
      });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new NomEntiteDejaUtiliseError();
      }
      throw erreur;
    }
  }
}
