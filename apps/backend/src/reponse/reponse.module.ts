import { Module } from '@nestjs/common';
import { PrismaReponseRepository } from './infrastructure/prisma-reponse.repository';

@Module({
  providers: [PrismaReponseRepository],
  // Exporté pour que SessionModule (et à terme PoulsModule, ADR-0018) puisse écrire des Réponses
  // sans que reponse/ ne dépende en retour de ses consommateurs.
  exports: [PrismaReponseRepository],
})
export class ReponseModule {}
