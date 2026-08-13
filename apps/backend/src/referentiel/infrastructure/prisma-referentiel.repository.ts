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
      include: { questions: { include: { options: true } } },
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

  sauvegarder(): Promise<void> {
    return Promise.reject(
      new Error('Non implémenté (réservé à une issue future sous #13)'),
    );
  }
}
