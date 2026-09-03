import { Result } from '../../shared-kernel/result';
import { CleTemplateEmail } from '../domain/cles-templates-email';
import { SujetManquantTemplateError } from '../domain/template';
import { Template } from '../domain/template';
import { ErreurTemplate, TemplateRepository } from '../domain/template.repository';
import { ValiderTemplatesEmail } from './valider-templates-email';

class TemplateRepositoryFake implements TemplateRepository {
  constructor(private readonly resultats: Record<string, Result<Template, ErreurTemplate>>) {}

  trouverParCle(cle: CleTemplateEmail): Promise<Result<Template, ErreurTemplate>> {
    return Promise.resolve(this.resultats[cle]);
  }
}

function templateValide(): Template {
  const resultat = Template.depuisContenuBrut('---\nsujet: Sujet\n---\nCorps.');
  if (resultat.estEchec) throw new Error('unreachable');
  return resultat.valeur;
}

describe('ValiderTemplatesEmail', () => {
  it('ne lève rien si toutes les clés attendues résolvent un Template valide', async () => {
    const templates = new TemplateRepositoryFake({
      'compte.invitation': Result.succes(templateValide()),
      'compte.mot-de-passe-oublie': Result.succes(templateValide()),
    });
    const validateur = new ValiderTemplatesEmail(templates);

    await expect(validateur.onModuleInit()).resolves.toBeUndefined();
  });

  it('lève une erreur agrégeant toutes les clés en échec', async () => {
    const templates = new TemplateRepositoryFake({
      'compte.invitation': Result.echec(new SujetManquantTemplateError()),
      'compte.mot-de-passe-oublie': Result.succes(templateValide()),
    });
    const validateur = new ValiderTemplatesEmail(templates);

    await expect(validateur.onModuleInit()).rejects.toThrow(/compte\.invitation/);
  });
});
