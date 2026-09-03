import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { Result } from '../../shared-kernel/result';
import { CleTemplateEmail } from '../domain/cles-templates-email';
import { ErreurTemplate, TemplateIntrouvableError, TemplateRepository } from '../domain/template.repository';
import { Template } from '../domain/template';

@Injectable()
export class FilesystemTemplateRepository implements TemplateRepository {
  async trouverParCle(
    cle: CleTemplateEmail,
  ): Promise<Result<Template, ErreurTemplate>> {
    const chemin = join(__dirname, '..', 'templates', `${cle}.md`);
    let contenuBrut: string;
    try {
      contenuBrut = await readFile(chemin, 'utf-8');
    } catch {
      return Result.echec(new TemplateIntrouvableError(cle, chemin));
    }

    return Template.depuisContenuBrut(contenuBrut);
  }
}
