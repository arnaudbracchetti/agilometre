import { Injectable, OnModuleInit } from '@nestjs/common';
import { CLES_TEMPLATES_EMAIL_ATTENDUES } from '../domain/cles-templates-email';
import type { TemplateRepository } from '../domain/template.repository';

@Injectable()
export class ValiderTemplatesEmail implements OnModuleInit {
  constructor(private readonly templates: TemplateRepository) {}

  async onModuleInit(): Promise<void> {
    const echecs: string[] = [];
    for (const cle of CLES_TEMPLATES_EMAIL_ATTENDUES) {
      const resultat = await this.templates.trouverParCle(cle);
      if (resultat.estEchec) {
        echecs.push(`${cle} : ${resultat.erreur.message}`);
      }
    }

    if (echecs.length > 0) {
      throw new Error(
        `Gabarits d'email invalides au démarrage :\n${echecs.join('\n')}`,
      );
    }
  }
}
