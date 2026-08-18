import { NotFoundException } from '@nestjs/common';
import { GenerateurDeCode } from './domain/generateur-de-code';
import { Selection } from './domain/selection';
import { Session } from './domain/session';
import { ObtenirPilotageSession } from './application/obtenir-pilotage-session.usecase';
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

/** Contrôleur plain-class : on ne fournit un stub réel que pour la dépendance testée ici. */
function creerControleur(obtenirPilotageSession: {
  executer: jest.Mock;
}): SessionAnimeeController {
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
  );
}

describe('SessionAnimeeController.pilotage', () => {
  it('renvoie le Code et le statut quand le pilotage est accessible', async () => {
    const session = creerSessionOuverte();
    await session.ouvrir();
    const obtenirPilotageSession = {
      executer: jest.fn().mockResolvedValue({ type: 'ok', session }),
    };
    const controller = creerControleur(obtenirPilotageSession);

    const resultat = await controller.pilotage('s1');

    expect(resultat).toEqual({ statut: 'OUVERTE', code: 'AB12' });
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
