import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LigneBibliothequeModeleCollecte,
  ModeleCollecteBibliothequeQuery,
} from '../domain/modele-collecte-bibliotheque.query';

@Injectable()
export class PrismaModeleCollecteBibliothequeQuery implements ModeleCollecteBibliothequeQuery {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deux requêtes + jointure en mémoire plutôt qu'un `$queryRaw` : SelectionItem.questionId est
   * délibérément une chaîne simple, sans relation Prisma vers Question (Référentiel et Session
   * sont des bounded contexts séparés — même choix que TourDeVote/Sollicitation). Un join SQL
   * franchirait cette frontière volontairement non couplée ; les volumes (dizaines de Modèles,
   * dizaines de Questions) rendent le coût du join en mémoire négligeable.
   */
  async lister(): Promise<LigneBibliothequeModeleCollecte[]> {
    const [modeles, themesActifs] = await Promise.all([
      this.prisma.modeleCollecte.findMany({ include: { items: true } }),
      this.prisma.theme.findMany({
        where: { retireLe: null },
        include: { questions: { where: { retireeLe: null } } },
      }),
    ]);

    const themeLibelleParQuestionId = new Map<string, string>();
    for (const theme of themesActifs) {
      for (const question of theme.questions) {
        themeLibelleParQuestionId.set(question.id, theme.libelle);
      }
    }

    return modeles.map((modele) => {
      const themesCouverts = new Set<string>();
      let nbQuestionsActives = 0;
      for (const item of modele.items) {
        const libelleTheme = themeLibelleParQuestionId.get(item.questionId);
        if (libelleTheme) {
          nbQuestionsActives++;
          themesCouverts.add(libelleTheme);
        }
      }
      return {
        id: modele.id,
        nom: modele.nom,
        nbQuestionsActives,
        themesCouverts: [...themesCouverts],
        misAJourLe: modele.updatedAt,
      };
    });
  }
}
