import { parse as parseYaml } from 'yaml';
import { Niveau } from '../domain/niveau';
import { Option } from '../domain/option';
import { NiveauxIncoherentsError, Question } from '../domain/question';
import { EntreeThemeImport } from '../domain/referentiel';

export type TypeErreurParsingReferentiel =
  | 'yaml-mal-forme'
  | 'cle-manquante'
  | 'cle-dupliquee'
  | 'nombre-options-invalide'
  | 'niveau-invalide';

export interface ErreurParsingReferentiel {
  type: TypeErreurParsingReferentiel;
  message: string;
  chemin?: string;
}

export type ResultatParsingReferentiel =
  | { type: 'invalide'; erreurs: ErreurParsingReferentiel[] }
  | { type: 'valide'; themes: EntreeThemeImport[] };

interface ThemeBrut {
  id?: unknown;
  libelle?: unknown;
  questions?: QuestionBrute[];
}

interface QuestionBrute {
  id?: unknown;
  libelle?: unknown;
  options?: OptionBrute[];
}

interface OptionBrute {
  libelle?: unknown;
  niveau?: unknown;
}

export function parseReferentielYaml(
  yamlBrut: string,
): ResultatParsingReferentiel {
  let document: unknown;
  try {
    document = parseYaml(yamlBrut);
  } catch (erreur) {
    return {
      type: 'invalide',
      erreurs: [{ type: 'yaml-mal-forme', message: (erreur as Error).message }],
    };
  }

  const themesBruts = (document as { themes?: unknown })?.themes;
  if (!Array.isArray(themesBruts)) {
    return {
      type: 'invalide',
      erreurs: [
        {
          type: 'yaml-mal-forme',
          message: 'Clé racine "themes" manquante ou invalide',
        },
      ],
    };
  }

  const erreurs: ErreurParsingReferentiel[] = [];
  const themes: EntreeThemeImport[] = [];
  const clesThemesVues = new Set<string>();
  const clesQuestionsVues = new Set<string>();

  themesBruts.forEach((themeBrut: ThemeBrut, indexTheme: number) => {
    const cheminTheme = `themes[${indexTheme}]`;

    if (typeof themeBrut?.id !== 'string' || themeBrut.id.length === 0) {
      erreurs.push({
        type: 'cle-manquante',
        message: 'id de Thème manquant',
        chemin: cheminTheme,
      });
      return;
    }
    if (clesThemesVues.has(themeBrut.id)) {
      erreurs.push({
        type: 'cle-dupliquee',
        message: `Clé de Thème dupliquée : ${themeBrut.id}`,
        chemin: cheminTheme,
      });
      return;
    }
    clesThemesVues.add(themeBrut.id);
    const themeId = themeBrut.id;

    const questions: EntreeThemeImport['questions'] = [];

    (themeBrut.questions ?? []).forEach(
      (questionBrute: QuestionBrute, indexQuestion: number) => {
        const cheminQuestion = `${cheminTheme}.questions[${indexQuestion}]`;

        if (
          typeof questionBrute?.id !== 'string' ||
          questionBrute.id.length === 0
        ) {
          erreurs.push({
            type: 'cle-manquante',
            message: 'id de Question manquant',
            chemin: cheminQuestion,
          });
          return;
        }
        if (clesQuestionsVues.has(questionBrute.id)) {
          erreurs.push({
            type: 'cle-dupliquee',
            message: `Clé de Question dupliquée : ${questionBrute.id}`,
            chemin: cheminQuestion,
          });
          return;
        }
        clesQuestionsVues.add(questionBrute.id);

        const optionsBrutes = questionBrute.options ?? [];
        const niveauxResultats = optionsBrutes.map((optionBrute: OptionBrute) =>
          Niveau.creer(Number(optionBrute.niveau)),
        );
        const premierNiveauEnEchec = niveauxResultats.find(
          (resultat) => resultat.estEchec,
        );
        if (premierNiveauEnEchec) {
          erreurs.push({
            type: 'niveau-invalide',
            message: premierNiveauEnEchec.erreur.message,
            chemin: cheminQuestion,
          });
          return;
        }

        const options = optionsBrutes.map(
          (optionBrute: OptionBrute, index: number) =>
            Option.creer(
              String(optionBrute.libelle),
              niveauxResultats[index].valeur,
            ),
        );
        const questionResultat = Question.creer(
          questionBrute.id,
          String(questionBrute.libelle),
          themeId,
          options,
        );
        if (questionResultat.estEchec) {
          const erreur = questionResultat.erreur;
          erreurs.push({
            type:
              erreur instanceof NiveauxIncoherentsError
                ? 'niveau-invalide'
                : 'nombre-options-invalide',
            message: erreur.message,
            chemin: cheminQuestion,
          });
          return;
        }

        questions.push({
          id: questionBrute.id,
          libelle: String(questionBrute.libelle),
          options: optionsBrutes.map((optionBrute: OptionBrute) => ({
            libelle: String(optionBrute.libelle),
            niveau: Number(optionBrute.niveau),
          })),
        });
      },
    );

    themes.push({ id: themeId, libelle: String(themeBrut.libelle), questions });
  });

  if (erreurs.length > 0) {
    return { type: 'invalide', erreurs };
  }
  return { type: 'valide', themes };
}
