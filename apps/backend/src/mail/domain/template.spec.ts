import { Template } from './template';

function creerTemplateValide(corps: string, sujet = 'Un sujet'): Template {
  const resultat = Template.depuisContenuBrut(`---\nsujet: ${sujet}\n---\n${corps}`);
  if (resultat.estEchec) throw new Error('unreachable');
  return resultat.valeur;
}

describe('Template', () => {
  describe('depuisContenuBrut', () => {
    it('accepte un frontmatter valide avec un sujet non vide', () => {
      const resultat = Template.depuisContenuBrut(
        '---\nsujet: Bienvenue\n---\nBonjour {{prenom}}.',
      );

      expect(resultat.estSucces).toBe(true);
    });

    it('échoue si le frontmatter YAML est malformé', () => {
      const resultat = Template.depuisContenuBrut(
        '---\nsujet: [ceci ne ferme jamais\n---\nCorps.',
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('FrontmatterInvalideTemplateError');
    });

    it('échoue si le frontmatter ne porte pas de champ sujet', () => {
      const resultat = Template.depuisContenuBrut('---\nautre: valeur\n---\nCorps.');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SujetManquantTemplateError');
    });

    it('échoue si le champ sujet est une chaîne vide', () => {
      const resultat = Template.depuisContenuBrut('---\nsujet: "   "\n---\nCorps.');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SujetManquantTemplateError');
    });
  });

  describe('rendre', () => {
    it('substitue une variable fournie dans le sujet et dans le corps', () => {
      const template = creerTemplateValide('Bonjour {{prenom}}.', 'Pour {{prenom}}');

      const rendu = template.rendre({ prenom: 'Ada' });

      expect(rendu.sujet).toBe('Pour Ada');
      expect(rendu.html).toContain('Bonjour Ada.');
    });

    it('laisse un placeholder littéral quand aucune variable ne correspond', () => {
      const template = creerTemplateValide('Bonjour {{prenom}}, voir {{lien}}.');

      const rendu = template.rendre({ prenom: 'Ada' });

      expect(rendu.html).toContain('Bonjour Ada, voir {{lien}}.');
    });

    it('dérive le texte brut du HTML rendu', () => {
      const template = creerTemplateValide('Bonjour {{prenom}}.\n\nSecond paragraphe.');

      const rendu = template.rendre({ prenom: 'Ada' });

      expect(rendu.texte).toContain('Bonjour Ada.');
      expect(rendu.texte).toContain('Second paragraphe.');
    });

    it('ne transforme pas un lien brut en balise <a> (pas de linkify)', () => {
      const template = creerTemplateValide('{{lien}}');

      const rendu = template.rendre({ lien: 'http://localhost:4200/x?jeton=abc123' });

      expect(rendu.html).not.toContain('<a ');
      expect(rendu.texte).toContain('http://localhost:4200/x?jeton=abc123');
    });
  });
});
