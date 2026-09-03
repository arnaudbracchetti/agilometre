import matter from 'gray-matter';
import { convert } from 'html-to-text';
import MarkdownIt from 'markdown-it';
import { Result } from '../../shared-kernel/result';

export class FrontmatterInvalideTemplateError extends Error {
  constructor(cause: unknown) {
    super(
      `Le frontmatter du gabarit n'est pas un YAML valide (${String(cause)})`,
    );
    this.name = 'FrontmatterInvalideTemplateError';
  }
}

export class SujetManquantTemplateError extends Error {
  constructor() {
    super('Le frontmatter du gabarit doit porter un champ "sujet" non vide');
    this.name = 'SujetManquantTemplateError';
  }
}

export class CorpsInvalideTemplateError extends Error {
  constructor(cause: unknown) {
    super(`Le corps markdown du gabarit n'a pas pu être rendu (${String(cause)})`);
    this.name = 'CorpsInvalideTemplateError';
  }
}

export type ErreurValidationTemplate =
  | FrontmatterInvalideTemplateError
  | SujetManquantTemplateError
  | CorpsInvalideTemplateError;

export interface EmailRendu {
  sujet: string;
  html: string;
  texte: string;
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

// `linkify` désactivé (défaut) : un lien brut dans le corps reste un texte simple, jamais une
// balise <a> — le texte brut auto-dérivé (html-to-text) préserve alors l'URL telle quelle.
const markdownIt = new MarkdownIt();

export class Template {
  private constructor(
    private readonly sujetBrut: string,
    private readonly corpsMarkdownBrut: string,
  ) {}

  static depuisContenuBrut(
    contenuBrut: string,
  ): Result<Template, ErreurValidationTemplate> {
    let frontmatter: matter.GrayMatterFile<string>;
    try {
      frontmatter = matter(contenuBrut);
    } catch (cause) {
      return Result.echec(new FrontmatterInvalideTemplateError(cause));
    }

    const sujet = frontmatter.data.sujet as unknown;
    if (typeof sujet !== 'string' || sujet.trim() === '') {
      return Result.echec(new SujetManquantTemplateError());
    }

    try {
      markdownIt.render(frontmatter.content);
    } catch (cause) {
      return Result.echec(new CorpsInvalideTemplateError(cause));
    }

    return Result.succes(new Template(sujet, frontmatter.content));
  }

  rendre(variables: Record<string, string>): EmailRendu {
    const substituer = (texte: string) =>
      texte.replace(PLACEHOLDER, (correspondance, cle: string) =>
        Object.prototype.hasOwnProperty.call(variables, cle)
          ? variables[cle]
          : correspondance,
      );

    const sujet = substituer(this.sujetBrut);
    const html = markdownIt.render(substituer(this.corpsMarkdownBrut));
    const texte = convert(html);

    return { sujet, html, texte };
  }
}
