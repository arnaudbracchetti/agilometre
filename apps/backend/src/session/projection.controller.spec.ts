import { NotFoundException } from '@nestjs/common';
import { GenerateurDeCode } from './domain/generateur-de-code';
import { Niveau } from '../referentiel/domain/niveau';
import { Option } from '../referentiel/domain/option';
import { Question } from '../referentiel/domain/question';
import { Selection } from './domain/selection';
import { Session } from './domain/session';
import { ProjectionController } from './projection.controller';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

function creerSession(): Session {
  return Session.creer(
    's1',
    'e1',
    new Date('2026-04-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
}

function creerQuestion(id: string): Question {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  return Question.creer(id, 'Libellé', 't1', options).valeur;
}

describe('ProjectionController', () => {
  it('renvoie le Code, le compteur de devices et questionCourante=null quand la projection est accessible en salle d’attente', async () => {
    const session = creerSession();
    await session.ouvrir();
    const obtenirProjectionSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        session,
        nbDevicesConnectes: 3,
        questionCourante: null,
      }),
    };
    const controller = new ProjectionController(
      obtenirProjectionSession as never,
    );

    const resultat = await controller.obtenir('s1');

    expect(resultat).toEqual({
      statut: 'OUVERTE',
      code: 'AB12',
      nbDevicesConnectes: 3,
      questionCourante: null,
    });
  });

  it('mappe questionCourante en QuestionCouranteDto quand une Question est en cours', async () => {
    const session = creerSession();
    await session.ouvrir();
    const obtenirProjectionSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        session,
        nbDevicesConnectes: 3,
        questionCourante: creerQuestion('q1'),
      }),
    };
    const controller = new ProjectionController(
      obtenirProjectionSession as never,
    );

    const resultat = await controller.obtenir('s1');

    expect(resultat.questionCourante).toEqual({
      questionId: 'q1',
      libelle: 'Libellé',
      options: [
        { libelle: 'Option 1' },
        { libelle: 'Option 2' },
        { libelle: 'Option 3' },
        { libelle: 'Option 4' },
      ],
    });
  });

  it('renvoie 404 quand la projection est introuvable', async () => {
    const obtenirProjectionSession = {
      executer: jest.fn().mockResolvedValue({ type: 'introuvable' }),
    };
    const controller = new ProjectionController(
      obtenirProjectionSession as never,
    );

    await expect(controller.obtenir('inconnue')).rejects.toThrow(
      NotFoundException,
    );
  });
});
