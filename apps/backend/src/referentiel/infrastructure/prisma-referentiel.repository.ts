import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Niveau } from '../domain/niveau';
import { Option } from '../domain/option';
import { Question } from '../domain/question';
import { Referentiel } from '../domain/referentiel';
import { ReferentielRepository } from '../domain/referentiel.repository';
import { Theme } from '../domain/theme';

@Injectable()
export class PrismaReferentielRepository implements ReferentielRepository {
  constructor(private readonly prisma: PrismaService) {}

  async charger(): Promise<Referentiel> {
    const referentielRow = await this.prisma.referentiel.findFirst();
    if (!referentielRow) {
      return Referentiel.vide();
    }

    const themesRows = await this.prisma.theme.findMany({
      include: {
        questions: {
          include: { options: true },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { ordre: 'asc' },
    });

    const themes = themesRows.map((themeRow) =>
      Theme.reconstituer(
        themeRow.id,
        themeRow.libelle,
        themeRow.questions.map((questionRow) =>
          Question.reconstituer(
            questionRow.id,
            questionRow.libelle,
            questionRow.themeId,
            // Les Niveaux en base ont déjà passé la validation de Niveau.creer au moment de
            // l'import : un échec ici signale une corruption de données, pas une entrée
            // utilisateur — .valeur lève dans ce cas, volontairement (cf. shared-kernel/result.ts).
            questionRow.options.map((optionRow) =>
              Option.creer(
                optionRow.libelle,
                Niveau.creer(optionRow.niveau).valeur,
              ),
            ),
            questionRow.retireeLe,
          ),
        ),
        themeRow.retireLe,
      ),
    );

    return Referentiel.reconstituer(referentielRow.derniereMajLe, themes);
  }

  async sauvegarder(referentiel: Referentiel): Promise<void> {
    const derniereMajLe = referentiel.derniereMajLe;
    if (derniereMajLe === null) {
      throw new Error(
        'Impossible de sauvegarder un Référentiel sans derniereMajLe — appeler appliquerChangements() avant sauvegarder()',
      );
    }
    const themes = referentiel.themes;

    await this.prisma.$transaction(async (tx) => {
      for (const [ordre, theme] of themes.entries()) {
        await tx.theme.upsert({
          where: { id: theme.id },
          create: {
            id: theme.id,
            libelle: theme.libelle,
            ordre,
            retireLe: theme.retireLe,
          },
          update: { libelle: theme.libelle, ordre, retireLe: theme.retireLe },
        });

        for (const [ordreQuestion, question] of theme.questions.entries()) {
          await tx.question.upsert({
            where: { id: question.id },
            create: {
              id: question.id,
              libelle: question.libelle,
              ordre: ordreQuestion,
              themeId: question.themeId,
              retireeLe: question.retireeLe,
            },
            update: {
              libelle: question.libelle,
              ordre: ordreQuestion,
              themeId: question.themeId,
              retireeLe: question.retireeLe,
            },
          });

          // Option est un Value Object sans Clé stable (remplacé en bloc à chaque import,
          // cf. docs/design/agregat-referentiel.md) : aucune table ne référence Option.id
          // (Reponse.niveau est un entier recopié, pas une FK), donc supprimer/recréer est sûr.
          await tx.option.deleteMany({ where: { questionId: question.id } });
          await tx.option.createMany({
            data: question.options.map((option) => ({
              questionId: question.id,
              libelle: option.libelle,
              niveau: option.niveau.valeur,
            })),
          });
        }
      }

      await tx.referentiel.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', derniereMajLe },
        update: { derniereMajLe },
      });
    });
  }
}
