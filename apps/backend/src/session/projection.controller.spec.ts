import { NotFoundException } from '@nestjs/common';
import { GenerateurDeCode } from './domain/generateur-de-code';
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

describe('ProjectionController', () => {
  it('renvoie le Code et le compteur de devices quand la projection est accessible', async () => {
    const session = creerSession();
    await session.ouvrir();
    const obtenirProjectionSession = {
      executer: jest
        .fn()
        .mockResolvedValue({ type: 'ok', session, nbDevicesConnectes: 3 }),
    };
    const controller = new ProjectionController(
      obtenirProjectionSession as never,
    );

    const resultat = await controller.obtenir('s1');

    expect(resultat).toEqual({
      statut: 'OUVERTE',
      code: 'AB12',
      nbDevicesConnectes: 3,
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
