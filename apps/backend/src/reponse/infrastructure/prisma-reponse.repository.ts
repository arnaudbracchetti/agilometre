import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Reponse } from '../domain/reponse';
import { ReponseRepository } from '../domain/reponse.repository';

@Injectable()
export class PrismaReponseRepository implements ReponseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Reponse | null> {
    const row = await this.prisma.reponse.findUnique({ where: { id } });
    if (!row) {
      return null;
    }
    return Reponse.reconstituer(
      row.id,
      row.questionId,
      row.niveau,
      row.equipeId,
      row.horodatage,
      row.origine,
      row.tourId,
    );
  }

  /** Toujours une insertion : Reponse est immuable, jamais mise à jour une fois persistée. */
  async save(reponse: Reponse): Promise<void> {
    await this.prisma.reponse.create({
      data: {
        id: reponse.id,
        questionId: reponse.questionId,
        niveau: reponse.niveau,
        equipeId: reponse.equipeId,
        horodatage: reponse.horodatage,
        origine: reponse.origine,
        tourId: reponse.tourId,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.reponse.delete({ where: { id } });
  }
}
