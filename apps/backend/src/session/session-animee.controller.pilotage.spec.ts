import { ConflictException, NotFoundException } from '@nestjs/common';
import { GenerateurDeCode } from './domain/generateur-de-code';
import { Niveau } from '../referentiel/domain/niveau';
import { Option } from '../referentiel/domain/option';
import { Question } from '../referentiel/domain/question';
import { Selection } from './domain/selection';
import { Session } from './domain/session';
import { ObtenirPilotageSession } from './application/obtenir-pilotage-session.usecase';
import { OuvrirTourDeVote } from './application/ouvrir-tour-de-vote.usecase';
import { CloreTourDeVote } from './application/clore-tour-de-vote.usecase';
import { SessionAnimeeController } from './session-animee.controller';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

function creerSessionOuverte(): Session {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-04-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
  return session;
}

function creerQuestion(id: string): Question {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  return Question.creer(id, 'Libellé', 't1', options).valeur;
}

/** Contrôleur plain-class : on ne fournit un stub réel que pour les dépendances testées ici. */
function creerControleur(
  obtenirPilotageSession: { executer: jest.Mock },
  ouvrirTourDeVote: { executer: jest.Mock } = { executer: jest.fn() },
  cloreTourDeVote: { executer: jest.Mock } = { executer: jest.fn() },
): SessionAnimeeController {
  const nonUtilise = {} as never;
  return new SessionAnimeeController(
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    nonUtilise,
    obtenirPilotageSession as unknown as ObtenirPilotageSession,
    nonUtilise,
    ouvrirTourDeVote as unknown as OuvrirTourDeVote,
    cloreTourDeVote as unknown as CloreTourDeVote,
  );
}

describe('SessionAnimeeController.pilotage', () => {
  it('renvoie le Code, le statut et questionCourante=null quand le pilotage est accessible en salle d’attente', async () => {
    const session = creerSessionOuverte();
    await session.ouvrir();
    const obtenirPilotageSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        session,
        nbDevicesConnectes: 3,
        questionCourante: null,
        tourOuvert: null,
      }),
    };
    const controller = creerControleur(obtenirPilotageSession);

    const resultat = await controller.pilotage('s1');

    expect(resultat).toEqual({
      statut: 'OUVERTE',
      code: 'AB12',
      nbDevicesConnectes: 3,
      questionCourante: null,
      tourOuvert: null,
    });
  });

  it('mappe questionCourante en QuestionCouranteDto quand une Question est en cours', async () => {
    const session = creerSessionOuverte();
    await session.ouvrir();
    const obtenirPilotageSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        session,
        nbDevicesConnectes: 3,
        questionCourante: creerQuestion('q1'),
        tourOuvert: null,
      }),
    };
    const controller = creerControleur(obtenirPilotageSession);

    const resultat = await controller.pilotage('s1');

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

  it('renvoie 404 quand le pilotage est introuvable', async () => {
    const obtenirPilotageSession = {
      executer: jest.fn().mockResolvedValue({ type: 'introuvable' }),
    };
    const controller = creerControleur(obtenirPilotageSession);

    await expect(controller.pilotage('inconnue')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('SessionAnimeeController.ouvrirTour', () => {
  it('ouvre le Tour puis renvoie le pilotage rechargé', async () => {
    const session = creerSessionOuverte();
    await session.ouvrir();
    const ouvrirTourDeVote = {
      executer: jest.fn().mockResolvedValue({ type: 'ok', tour: {} }),
    };
    const obtenirPilotageSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        session,
        nbDevicesConnectes: 2,
        questionCourante: null,
        tourOuvert: null,
      }),
    };
    const controller = creerControleur(
      obtenirPilotageSession,
      ouvrirTourDeVote,
    );

    const resultat = await controller.ouvrirTour('s1');

    expect(ouvrirTourDeVote.executer).toHaveBeenCalledWith('s1');
    expect(resultat.statut).toBe('OUVERTE');
  });

  it('renvoie 409 si un Tour est déjà ouvert', async () => {
    const ouvrirTourDeVote = {
      executer: jest.fn().mockResolvedValue({ type: 'tour_deja_ouvert' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      ouvrirTourDeVote,
    );

    await expect(controller.ouvrirTour('s1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('renvoie 409 en salle d’attente (aucune Question courante)', async () => {
    const ouvrirTourDeVote = {
      executer: jest
        .fn()
        .mockResolvedValue({ type: 'aucune_question_courante' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      ouvrirTourDeVote,
    );

    await expect(controller.ouvrirTour('s1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('renvoie 404 si la Session est introuvable', async () => {
    const ouvrirTourDeVote = {
      executer: jest.fn().mockResolvedValue({ type: 'introuvable' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      ouvrirTourDeVote,
    );

    await expect(controller.ouvrirTour('inconnue')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('SessionAnimeeController.clorerTour', () => {
  it('clôt le Tour puis renvoie le pilotage rechargé', async () => {
    const session = creerSessionOuverte();
    await session.ouvrir();
    const cloreTourDeVote = {
      executer: jest.fn().mockResolvedValue({ type: 'ok', tour: {} }),
    };
    const obtenirPilotageSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        session,
        nbDevicesConnectes: 2,
        questionCourante: null,
        tourOuvert: null,
      }),
    };
    const controller = creerControleur(
      obtenirPilotageSession,
      { executer: jest.fn() },
      cloreTourDeVote,
    );

    const resultat = await controller.clorerTour('s1');

    expect(cloreTourDeVote.executer).toHaveBeenCalledWith('s1');
    expect(resultat.statut).toBe('OUVERTE');
  });

  it('renvoie 409 si aucun Tour n’est ouvert', async () => {
    const cloreTourDeVote = {
      executer: jest.fn().mockResolvedValue({ type: 'aucun_tour_ouvert' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      { executer: jest.fn() },
      cloreTourDeVote,
    );

    await expect(controller.clorerTour('s1')).rejects.toThrow(
      ConflictException,
    );
  });
});
