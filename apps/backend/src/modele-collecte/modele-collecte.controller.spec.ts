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
  ModeleCollecte,
  NomModeleCollecteInvalideError,
} from './domain/modele-collecte';
import { QuestionDejaSelectionneeError } from './domain/selection';
import { CreerModeleCollecte } from './application/creer-modele-collecte.usecase';
import { RenommerModeleCollecte } from './application/renommer-modele-collecte.usecase';
import { AjouterQuestionModeleCollecte } from './application/ajouter-question-modele-collecte.usecase';
import { AjouterThemeModeleCollecte } from './application/ajouter-theme-modele-collecte.usecase';
import { RetirerQuestionModeleCollecte } from './application/retirer-question-modele-collecte.usecase';
import { ReordonnerQuestionModeleCollecte } from './application/reordonner-question-modele-collecte.usecase';
import { DupliquerModeleCollecte } from './application/dupliquer-modele-collecte.usecase';
import { SupprimerModeleCollecte } from './application/supprimer-modele-collecte.usecase';
import { ListerModelesCollecte } from './application/lister-modeles-collecte.usecase';
import { ObtenirModeleCollecteDetail } from './application/obtenir-modele-collecte-detail.usecase';
import { ModeleCollecteController } from './modele-collecte.controller';

function questionAvecOptions(id: string, themeId: string): Question {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  return Question.creer(id, `Libellé ${id}`, themeId, options).valeur;
}

describe('ModeleCollecteController', () => {
  let controller: ModeleCollecteController;
  let creerModeleCollecte: { executer: jest.Mock };
  let renommerModeleCollecte: { executer: jest.Mock };
  let ajouterQuestionModeleCollecte: { executer: jest.Mock };
  let ajouterThemeModeleCollecte: { executer: jest.Mock };
  let retirerQuestionModeleCollecte: { executer: jest.Mock };
  let reordonnerQuestionModeleCollecte: { executer: jest.Mock };
  let dupliquerModeleCollecte: { executer: jest.Mock };
  let supprimerModeleCollecte: { executer: jest.Mock };
  let listerModelesCollecte: { executer: jest.Mock };
  let obtenirModeleCollecteDetail: { executer: jest.Mock };

  beforeEach(async () => {
    creerModeleCollecte = { executer: jest.fn() };
    renommerModeleCollecte = { executer: jest.fn() };
    ajouterQuestionModeleCollecte = { executer: jest.fn() };
    ajouterThemeModeleCollecte = { executer: jest.fn() };
    retirerQuestionModeleCollecte = { executer: jest.fn() };
    reordonnerQuestionModeleCollecte = { executer: jest.fn() };
    dupliquerModeleCollecte = { executer: jest.fn() };
    supprimerModeleCollecte = { executer: jest.fn() };
    listerModelesCollecte = { executer: jest.fn() };
    obtenirModeleCollecteDetail = { executer: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModeleCollecteController],
      providers: [
        { provide: CreerModeleCollecte, useValue: creerModeleCollecte },
        { provide: RenommerModeleCollecte, useValue: renommerModeleCollecte },
        {
          provide: AjouterQuestionModeleCollecte,
          useValue: ajouterQuestionModeleCollecte,
        },
        {
          provide: AjouterThemeModeleCollecte,
          useValue: ajouterThemeModeleCollecte,
        },
        {
          provide: RetirerQuestionModeleCollecte,
          useValue: retirerQuestionModeleCollecte,
        },
        {
          provide: ReordonnerQuestionModeleCollecte,
          useValue: reordonnerQuestionModeleCollecte,
        },
        { provide: DupliquerModeleCollecte, useValue: dupliquerModeleCollecte },
        { provide: SupprimerModeleCollecte, useValue: supprimerModeleCollecte },
        { provide: ListerModelesCollecte, useValue: listerModelesCollecte },
        {
          provide: ObtenirModeleCollecteDetail,
          useValue: obtenirModeleCollecteDetail,
        },
      ],
    }).compile();

    controller = module.get(ModeleCollecteController);
  });

  function mockDetail(modele: ModeleCollecte) {
    const theme = Theme.creer('t1', 'Thème A', []);
    const questions = modele.selection.questionIds.map((id) =>
      questionAvecOptions(id, theme.id),
    );
    obtenirModeleCollecteDetail.executer.mockResolvedValue({
      type: 'ok',
      modele,
      selectionEnrichie: questions,
      themesActifs: [theme],
    });
  }

  describe('lister', () => {
    it('renvoie les lignes de la bibliothèque en DTO', async () => {
      listerModelesCollecte.executer.mockResolvedValue([
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
      const modele = ModeleCollecte.creer('m1', 'Alpha').valeur;
      creerModeleCollecte.executer.mockResolvedValue({ type: 'cree', modele });
      mockDetail(modele);

      await expect(controller.creer({ nom: 'Alpha' })).resolves.toEqual({
        id: 'm1',
        nom: 'Alpha',
        selection: [],
      });
    });

    it('lève une BadRequestException pour un nom invalide', async () => {
      creerModeleCollecte.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new NomModeleCollecteInvalideError(),
      });

      await expect(controller.creer({ nom: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtenir', () => {
    it('renvoie le détail enrichi avec la Sélection ordonnée', async () => {
      const modele = ModeleCollecte.creer('m1', 'Alpha').valeur;
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
      obtenirModeleCollecteDetail.executer.mockResolvedValue({
        type: 'introuvable',
      });

      await expect(controller.obtenir('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('renommer', () => {
    it('lève une NotFoundException si le Modèle est introuvable', async () => {
      renommerModeleCollecte.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.renommer('inconnu', { nom: 'Beta' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une BadRequestException pour un nom invalide', async () => {
      renommerModeleCollecte.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new NomModeleCollecteInvalideError(),
      });

      await expect(controller.renommer('m1', { nom: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('ajouterQuestion', () => {
    it('lève une ConflictException si la Question est déjà sélectionnée', async () => {
      ajouterQuestionModeleCollecte.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new QuestionDejaSelectionneeError(),
      });

      await expect(
        controller.ajouterQuestion('m1', { questionId: 'q1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('lève une NotFoundException si le Modèle est introuvable', async () => {
      ajouterQuestionModeleCollecte.executer.mockResolvedValue({
        type: 'introuvable',
      });

      await expect(
        controller.ajouterQuestion('inconnu', { questionId: 'q1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('retirerQuestion', () => {
    it('lève une NotFoundException si la Question est absente de la Sélection', async () => {
      retirerQuestionModeleCollecte.executer.mockResolvedValue({
        type: 'question_introuvable',
      });

      await expect(controller.retirerQuestion('m1', 'q1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('dupliquer', () => {
    it('renvoie le détail enrichi du Modèle dupliqué', async () => {
      const copie = ModeleCollecte.creer('m2', 'Alpha (copie)').valeur;
      dupliquerModeleCollecte.executer.mockResolvedValue({
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
      supprimerModeleCollecte.executer.mockResolvedValue({ type: 'supprime' });

      await expect(controller.supprimer('m1')).resolves.toBeUndefined();
    });

    it('lève une NotFoundException si le Modèle est introuvable', async () => {
      supprimerModeleCollecte.executer.mockResolvedValue({
        type: 'introuvable',
      });

      await expect(controller.supprimer('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
