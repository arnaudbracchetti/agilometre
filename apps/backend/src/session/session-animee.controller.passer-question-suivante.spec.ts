import { ConflictException, NotFoundException } from '@nestjs/common';
import { GenerateurDeCode } from './domain/generateur-de-code';
import { Selection } from './domain/selection';
import { Session } from './domain/session';
import { ObtenirPilotageSession } from './application/obtenir-pilotage-session.usecase';
import { PasserQuestionSuivanteSession } from './application/passer-question-suivante-session.usecase';
import { SessionAnimeeController } from './session-animee.controller';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

async function creerSessionOuverte(): Promise<Session> {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-04-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  return session;
}

/** Contrôleur plain-class : on ne fournit un stub réel que pour les deux dépendances testées ici. */
function creerControleur(
  passerQuestionSuivanteSession: { executer: jest.Mock },
  obtenirPilotageSession: { executer: jest.Mock },
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
    passerQuestionSuivanteSession as unknown as PasserQuestionSuivanteSession,
    nonUtilise,
    nonUtilise,
  );
}

describe('SessionAnimeeController.passerQuestionSuivante', () => {
  it('avance puis renvoie le pilotage rechargé', async () => {
    const session = await creerSessionOuverte();
    const passerQuestionSuivanteSession = {
      executer: jest.fn().mockResolvedValue({ type: 'ok', session }),
    };
    const obtenirPilotageSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        session,
        nbDevicesConnectes: 2,
        questionCourante: null,
        tourOuvert: null,
        historique: [],
        progression: [],
      }),
    };
    const controller = creerControleur(
      passerQuestionSuivanteSession,
      obtenirPilotageSession,
    );

    const resultat = await controller.passerQuestionSuivante('s1');

    expect(passerQuestionSuivanteSession.executer).toHaveBeenCalledWith('s1');
    expect(resultat).toEqual({
      statut: 'OUVERTE',
      code: 'AB12',
      nbDevicesConnectes: 2,
      questionCourante: null,
      tourOuvert: null,
      dernierTourClos: null,
      historique: [],
      progression: [],
    });
  });

  it('renvoie 404 si la Session est introuvable', async () => {
    const passerQuestionSuivanteSession = {
      executer: jest.fn().mockResolvedValue({ type: 'introuvable' }),
    };
    const controller = creerControleur(passerQuestionSuivanteSession, {
      executer: jest.fn(),
    });

    await expect(controller.passerQuestionSuivante('inconnue')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('renvoie 409 si la Session n’est pas OUVERTE', async () => {
    const passerQuestionSuivanteSession = {
      executer: jest.fn().mockResolvedValue({ type: 'non_ouverte' }),
    };
    const controller = creerControleur(passerQuestionSuivanteSession, {
      executer: jest.fn(),
    });

    await expect(controller.passerQuestionSuivante('s1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('renvoie 409 si la Question courante n’est ni clôturée ni sautée', async () => {
    const passerQuestionSuivanteSession = {
      executer: jest
        .fn()
        .mockResolvedValue({ type: 'question_courante_non_resolue' }),
    };
    const controller = creerControleur(passerQuestionSuivanteSession, {
      executer: jest.fn(),
    });

    await expect(controller.passerQuestionSuivante('s1')).rejects.toThrow(
      ConflictException,
    );
  });
});
