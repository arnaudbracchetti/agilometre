import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Niveau } from '../referentiel/domain/niveau';
import { Option } from '../referentiel/domain/option';
import { Question } from '../referentiel/domain/question';
import { Theme } from '../referentiel/domain/theme';
import {
  ModeleSession,
  NomModeleSessionInvalideError,
} from './domain/modele-session';
import { QuestionDejaSelectionneeError } from './domain/selection';
import { CreerModeleSession } from './application/creer-modele-session.usecase';
import { RenommerModeleSession } from './application/renommer-modele-session.usecase';
import { AjouterQuestionModeleSession } from './application/ajouter-question-modele-session.usecase';
import { AjouterThemeModeleSession } from './application/ajouter-theme-modele-session.usecase';
import { RetirerQuestionModeleSession } from './application/retirer-question-modele-session.usecase';
import { ReordonnerQuestionModeleSession } from './application/reordonner-question-modele-session.usecase';
import { DupliquerModeleSession } from './application/dupliquer-modele-session.usecase';
import { SupprimerModeleSession } from './application/supprimer-modele-session.usecase';
import { ListerModelesSession } from './application/lister-modeles-session.usecase';
import { ObtenirModeleSessionDetail } from './application/obtenir-modele-session-detail.usecase';
import { SessionController } from './session.controller';

function questionAvecOptions(id: string, themeId: string): Question {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  return Question.creer(id, `Libellé ${id}`, themeId, options).valeur;
}

describe('SessionController', () => {
  let controller: SessionController;
  let creerModeleSession: { executer: jest.Mock };
  let renommerModeleSession: { executer: jest.Mock };
  let ajouterQuestionModeleSession: { executer: jest.Mock };
  let ajouterThemeModeleSession: { executer: jest.Mock };
  let retirerQuestionModeleSession: { executer: jest.Mock };
  let reordonnerQuestionModeleSession: { executer: jest.Mock };
  let dupliquerModeleSession: { executer: jest.Mock };
  let supprimerModeleSession: { executer: jest.Mock };
  let listerModelesSession: { executer: jest.Mock };
  let obtenirModeleSessionDetail: { executer: jest.Mock };

  beforeEach(async () => {
    creerModeleSession = { executer: jest.fn() };
    renommerModeleSession = { executer: jest.fn() };
    ajouterQuestionModeleSession = { executer: jest.fn() };
    ajouterThemeModeleSession = { executer: jest.fn() };
    retirerQuestionModeleSession = { executer: jest.fn() };
    reordonnerQuestionModeleSession = { executer: jest.fn() };
    dupliquerModeleSession = { executer: jest.fn() };
    supprimerModeleSession = { executer: jest.fn() };
    listerModelesSession = { executer: jest.fn() };
    obtenirModeleSessionDetail = { executer: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        { provide: CreerModeleSession, useValue: creerModeleSession },
        { provide: RenommerModeleSession, useValue: renommerModeleSession },
        {
          provide: AjouterQuestionModeleSession,
          useValue: ajouterQuestionModeleSession,
        },
        {
          provide: AjouterThemeModeleSession,
          useValue: ajouterThemeModeleSession,
        },
        {
          provide: RetirerQuestionModeleSession,
          useValue: retirerQuestionModeleSession,
        },
        {
          provide: ReordonnerQuestionModeleSession,
          useValue: reordonnerQuestionModeleSession,
        },
        { provide: DupliquerModeleSession, useValue: dupliquerModeleSession },
        { provide: SupprimerModeleSession, useValue: supprimerModeleSession },
        { provide: ListerModelesSession, useValue: listerModelesSession },
        {
          provide: ObtenirModeleSessionDetail,
          useValue: obtenirModeleSessionDetail,
        },
      ],
    }).compile();

    controller = module.get(SessionController);
  });

  function mockDetail(modele: ModeleSession) {
    const theme = Theme.creer('t1', 'Thème A', []);
    const questions = modele.selection.questionIds.map((id) =>
      questionAvecOptions(id, theme.id),
    );
    obtenirModeleSessionDetail.executer.mockResolvedValue({
      type: 'ok',
      modele,
      selectionEnrichie: questions,
      themesActifs: [theme],
    });
  }

  describe('lister', () => {
    it('renvoie les lignes de la bibliothèque en DTO', async () => {
      listerModelesSession.executer.mockResolvedValue([
        {
          id: 'm1',
          nom: 'Alpha',
          nbQuestionsActives: 2,
          themesCouverts: ['Thème A'],
          misAJourLe: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      await expect(controller.lister()).resolves.toEqual([
        {
          id: 'm1',
          nom: 'Alpha',
          nbQuestionsActives: 2,
          themesCouverts: ['Thème A'],
          misAJourLe: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('creer', () => {
    it('crée le Modèle puis renvoie son détail enrichi', async () => {
      const modele = ModeleSession.creer('m1', 'Alpha').valeur;
      creerModeleSession.executer.mockResolvedValue({ type: 'cree', modele });
      mockDetail(modele);

      await expect(controller.creer({ nom: 'Alpha' })).resolves.toEqual({
        id: 'm1',
        nom: 'Alpha',
        selection: [],
      });
    });

    it('lève une BadRequestException pour un nom invalide', async () => {
      creerModeleSession.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new NomModeleSessionInvalideError(),
      });

      await expect(controller.creer({ nom: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtenir', () => {
    it('renvoie le détail enrichi avec la Sélection ordonnée', async () => {
      const modele = ModeleSession.creer('m1', 'Alpha').valeur;
      modele.ajouterQuestion('q1');
      mockDetail(modele);

      await expect(controller.obtenir('m1')).resolves.toEqual({
        id: 'm1',
        nom: 'Alpha',
        selection: [
          {
            questionId: 'q1',
            libelle: 'Libellé q1',
            themeId: 't1',
            themeLibelle: 'Thème A',
          },
        ],
      });
    });

    it('lève une NotFoundException si le Modèle est introuvable', async () => {
      obtenirModeleSessionDetail.executer.mockResolvedValue({
        type: 'introuvable',
      });

      await expect(controller.obtenir('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('renommer', () => {
    it('lève une NotFoundException si le Modèle est introuvable', async () => {
      renommerModeleSession.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.renommer('inconnu', { nom: 'Beta' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une BadRequestException pour un nom invalide', async () => {
      renommerModeleSession.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new NomModeleSessionInvalideError(),
      });

      await expect(controller.renommer('m1', { nom: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('ajouterQuestion', () => {
    it('lève une ConflictException si la Question est déjà sélectionnée', async () => {
      ajouterQuestionModeleSession.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new QuestionDejaSelectionneeError(),
      });

      await expect(
        controller.ajouterQuestion('m1', { questionId: 'q1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('lève une NotFoundException si le Modèle est introuvable', async () => {
      ajouterQuestionModeleSession.executer.mockResolvedValue({
        type: 'introuvable',
      });

      await expect(
        controller.ajouterQuestion('inconnu', { questionId: 'q1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('retirerQuestion', () => {
    it('lève une NotFoundException si la Question est absente de la Sélection', async () => {
      retirerQuestionModeleSession.executer.mockResolvedValue({
        type: 'question_introuvable',
      });

      await expect(controller.retirerQuestion('m1', 'q1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('dupliquer', () => {
    it('renvoie le détail enrichi du Modèle dupliqué', async () => {
      const copie = ModeleSession.creer('m2', 'Alpha (copie)').valeur;
      dupliquerModeleSession.executer.mockResolvedValue({
        type: 'duplique',
        modele: copie,
      });
      mockDetail(copie);

      await expect(controller.dupliquer('m1')).resolves.toEqual({
        id: 'm2',
        nom: 'Alpha (copie)',
        selection: [],
      });
    });
  });

  describe('supprimer', () => {
    it('supprime le Modèle sans erreur', async () => {
      supprimerModeleSession.executer.mockResolvedValue({ type: 'supprime' });

      await expect(controller.supprimer('m1')).resolves.toBeUndefined();
    });

    it('lève une NotFoundException si le Modèle est introuvable', async () => {
      supprimerModeleSession.executer.mockResolvedValue({
        type: 'introuvable',
      });

      await expect(controller.supprimer('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
