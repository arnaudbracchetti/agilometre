import { Niveau } from './niveau';
import { Option } from './option';
import { Question } from './question';

function optionsValides(): Option[] {
  return [
    Option.creer('Jamais', Niveau.creer(1).valeur),
    Option.creer('Parfois', Niveau.creer(2).valeur),
    Option.creer('Souvent', Niveau.creer(3).valeur),
    Option.creer('Toujours', Niveau.creer(4).valeur),
  ];
}

describe('Question', () => {
  it('se crée avec 4 Options couvrant les Niveaux 1..4', () => {
    const resultat = Question.creer(
      'q1',
      'Une question',
      't1',
      optionsValides(),
    );

    expect(resultat.estSucces).toBe(true);
    const question = resultat.valeur;
    expect(question.id).toBe('q1');
    expect(question.themeId).toBe('t1');
    expect(question.options).toHaveLength(4);
    expect(question.retireeLe).toBeNull();
  });

  it("refuse un nombre d'Options différent de 4", () => {
    const options = optionsValides().slice(0, 3);

    const resultat = Question.creer('q1', 'Une question', 't1', options);

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur.message).toMatch(/exactement 4 Options/);
  });

  it('refuse des Niveaux avec un trou dans la séquence', () => {
    const options = [
      Option.creer('Jamais', Niveau.creer(1).valeur),
      Option.creer('Parfois', Niveau.creer(2).valeur),
      Option.creer('Souvent', Niveau.creer(3).valeur),
      Option.creer('Toujours', Niveau.creer(3).valeur),
    ];

    const resultat = Question.creer('q1', 'Une question', 't1', options);

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur.message).toMatch(/sans trou ni doublon/);
  });

  it('refuse des Niveaux dupliqués', () => {
    const options = [
      Option.creer('Jamais', Niveau.creer(1).valeur),
      Option.creer('Parfois', Niveau.creer(1).valeur),
      Option.creer('Souvent', Niveau.creer(3).valeur),
      Option.creer('Toujours', Niveau.creer(4).valeur),
    ];

    const resultat = Question.creer('q1', 'Une question', 't1', options);

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur.message).toMatch(/sans trou ni doublon/);
  });

  it('refuse un Niveau hors bornes dès Niveau.creer', () => {
    expect(Niveau.creer(5).estEchec).toBe(true);
    expect(Niveau.creer(5).erreur.message).toMatch(/Niveau invalide/);
    expect(Niveau.creer(0).estEchec).toBe(true);
  });
});
