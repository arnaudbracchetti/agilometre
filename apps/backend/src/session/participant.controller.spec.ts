import { ConflictException, NotFoundException } from '@nestjs/common';
import { Niveau } from '../referentiel/domain/niveau';
import { Option } from '../referentiel/domain/option';
import { Question } from '../referentiel/domain/question';
import { RejoindreSession } from './application/rejoindre-session.usecase';
import { ObtenirEtatParticipant } from './application/obtenir-etat-participant.usecase';
import { ObtenirInfoSessionParticipant } from './application/obtenir-info-session-participant.usecase';
import { ObtenirApercuSession } from './application/obtenir-apercu-session.usecase';
import { VoterParticipant } from './application/voter-participant.usecase';
import { RequeteAvecJetonParticipant } from './jeton-participant.guard';
import { ParticipantController } from './participant.controller';

function creerQuestion(id: string): Question {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  return Question.creer(id, 'Libellé', 't1', options).valeur;
}

function requete(
  sessionId = 's1',
  jetonId = 'jeton-1',
): RequeteAvecJetonParticipant {
  return { sessionId, jetonId } as RequeteAvecJetonParticipant;
}

/** Contrôleur plain-class : le Guard est testé séparément (jeton-participant.guard.spec.ts). */
function creerControleur(
  obtenirEtatParticipant: { executer: jest.Mock },
  voterParticipant: { executer: jest.Mock } = { executer: jest.fn() },
  obtenirInfoSessionParticipant: { executer: jest.Mock } = {
    executer: jest.fn(),
  },
  obtenirApercuSession: { executer: jest.Mock } = { executer: jest.fn() },
): ParticipantController {
  return new ParticipantController(
    {} as unknown as RejoindreSession,
    obtenirEtatParticipant as unknown as ObtenirEtatParticipant,
    obtenirInfoSessionParticipant as unknown as ObtenirInfoSessionParticipant,
    obtenirApercuSession as unknown as ObtenirApercuSession,
    voterParticipant as unknown as VoterParticipant,
  );
}

describe('ParticipantController.moi', () => {
  it('renvoie voteOuvert=false et question=null hors vote', async () => {
    const obtenirEtatParticipant = {
      executer: jest.fn().mockResolvedValue({
        voteOuvert: false,
        question: null,
        optionChoisieIndex: null,
      }),
    };
    const controller = creerControleur(obtenirEtatParticipant);

    const resultat = await controller.moi(requete());

    expect(obtenirEtatParticipant.executer).toHaveBeenCalledWith(
      's1',
      'jeton-1',
    );
    expect(resultat).toEqual({
      voteOuvert: false,
      question: null,
      optionChoisieIndex: null,
    });
  });

  it('mappe la Question en QuestionCouranteDto pendant le vote', async () => {
    const obtenirEtatParticipant = {
      executer: jest.fn().mockResolvedValue({
        voteOuvert: true,
        question: creerQuestion('q1'),
        optionChoisieIndex: 2,
      }),
    };
    const controller = creerControleur(obtenirEtatParticipant);

    const resultat = await controller.moi(requete());

    expect(resultat.voteOuvert).toBe(true);
    expect(resultat.optionChoisieIndex).toBe(2);
    expect(resultat.question).toEqual({
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
});

describe('ParticipantController.infoSession', () => {
  it('renvoie le nom d’équipe et la date d’ouverture', async () => {
    const ouvertureLe = new Date('2026-08-21T09:00:00.000Z');
    const obtenirInfoSessionParticipant = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        equipeNom: 'Les Mangoustes',
        ouvertureLe,
      }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      { executer: jest.fn() },
      obtenirInfoSessionParticipant,
    );

    const resultat = await controller.infoSession(requete());

    expect(obtenirInfoSessionParticipant.executer).toHaveBeenCalledWith('s1');
    expect(resultat).toEqual({
      equipeNom: 'Les Mangoustes',
      ouvertureLe: ouvertureLe.toISOString(),
    });
  });

  it('renvoie ouvertureLe=null tant que la Session n’est pas ouverte', async () => {
    const obtenirInfoSessionParticipant = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        equipeNom: 'Les Mangoustes',
        ouvertureLe: null,
      }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      { executer: jest.fn() },
      obtenirInfoSessionParticipant,
    );

    const resultat = await controller.infoSession(requete());

    expect(resultat.ouvertureLe).toBeNull();
  });

  it('renvoie 404 si la Session est introuvable', async () => {
    const obtenirInfoSessionParticipant = {
      executer: jest.fn().mockResolvedValue({ type: 'introuvable' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      { executer: jest.fn() },
      obtenirInfoSessionParticipant,
    );

    await expect(controller.infoSession(requete())).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('ParticipantController.apercuSession', () => {
  it('renvoie le nom d’équipe et la date d’ouverture pour un Code résolu', async () => {
    const ouvertureLe = new Date('2026-08-21T09:00:00.000Z');
    const obtenirApercuSession = {
      executer: jest.fn().mockResolvedValue({
        type: 'ok',
        equipeNom: 'Les Mangoustes',
        ouvertureLe,
      }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      { executer: jest.fn() },
      { executer: jest.fn() },
      obtenirApercuSession,
    );

    const resultat = await controller.apercuSession('4271');

    expect(obtenirApercuSession.executer).toHaveBeenCalledWith('4271');
    expect(resultat).toEqual({
      equipeNom: 'Les Mangoustes',
      ouvertureLe: ouvertureLe.toISOString(),
    });
  });

  it('renvoie 404 pour un Code invalide ou expiré', async () => {
    const obtenirApercuSession = {
      executer: jest.fn().mockResolvedValue({ type: 'introuvable' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      { executer: jest.fn() },
      { executer: jest.fn() },
      obtenirApercuSession,
    );

    await expect(controller.apercuSession('0000')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('ParticipantController.voter', () => {
  it('vote puis renvoie l’état participant rechargé', async () => {
    const voterParticipant = {
      executer: jest.fn().mockResolvedValue({ type: 'ok', tour: {} }),
    };
    const obtenirEtatParticipant = {
      executer: jest.fn().mockResolvedValue({
        voteOuvert: true,
        question: creerQuestion('q1'),
        optionChoisieIndex: 1,
      }),
    };
    const controller = creerControleur(
      obtenirEtatParticipant,
      voterParticipant,
    );

    const resultat = await controller.voter(requete(), { optionIndex: 1 });

    expect(voterParticipant.executer).toHaveBeenCalledWith('s1', 'jeton-1', 1);
    expect(resultat.optionChoisieIndex).toBe(1);
  });

  it('renvoie 409 si aucun Tour n’est ouvert', async () => {
    const voterParticipant = {
      executer: jest.fn().mockResolvedValue({ type: 'aucun_tour_ouvert' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      voterParticipant,
    );

    await expect(
      controller.voter(requete(), { optionIndex: 0 }),
    ).rejects.toThrow(ConflictException);
  });

  it('renvoie 404 si la Session est introuvable', async () => {
    const voterParticipant = {
      executer: jest.fn().mockResolvedValue({ type: 'session_introuvable' }),
    };
    const controller = creerControleur(
      { executer: jest.fn() },
      voterParticipant,
    );

    await expect(
      controller.voter(requete(), { optionIndex: 0 }),
    ).rejects.toThrow(NotFoundException);
  });
});
