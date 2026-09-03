import { Result } from '../../shared-kernel/result';
import { CleTemplateEmail } from './cles-templates-email';
import { ErreurValidationTemplate, Template } from './template';

export class TemplateIntrouvableError extends Error {
  constructor(cle: CleTemplateEmail, chemin: string) {
    super(`Aucun gabarit lisible pour la clé "${cle}" (${chemin})`);
    this.name = 'TemplateIntrouvableError';
  }
}

export type ErreurTemplate = ErreurValidationTemplate | TemplateIntrouvableError;

export interface TemplateRepository {
  trouverParCle(cle: CleTemplateEmail): Promise<Result<Template, ErreurTemplate>>;
}
