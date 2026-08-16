import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChangeSet } from './domain/change-set';
import { Niveau } from './domain/niveau';
import { Option } from './domain/option';
import { Question } from './domain/question';
import { Theme } from './domain/theme';
import { ApplyImportReferentiel } from './application/apply-import-referentiel.usecase';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';
import { ObtenirReferentielActif } from './application/obtenir-referentiel-actif.usecase';
import { ReferentielController } from './referentiel.controller';

describe('ReferentielController', () => {
  let controller: ReferentielController;
  let previewImportReferentiel: { executer: jest.Mock };
  let applyImportReferentiel: { executer: jest.Mock };
  let obtenirReferentielActif: { executer: jest.Mock };

  beforeEach(async () => {
    previewImportReferentiel = { executer: jest.fn() };
    applyImportReferentiel = { executer: jest.fn() };
    obtenirReferentielActif = { executer: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferentielController],
      providers: [
        {
          provide: PreviewImportReferentiel,
          useValue: previewImportReferentiel,
        },
        {
          provide: ApplyImportReferentiel,
          useValue: applyImportReferentiel,
        },
        {
          provide: ObtenirReferentielActif,
          useValue: obtenirReferentielActif,
        },
      ],
    }).compile();

    controller = module.get(ReferentielController);
  });

  describe('obtenir', () => {
    it('renvoie les Thèmes actifs avec leurs Questions et Options', async () => {
      const options = [1, 2, 3, 4].map((niveau) =>
        Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
      );
      const question = Question.creer(
        'q1',
        'Une question',
        't1',
        options,
      ).valeur;
      const theme = Theme.creer('t1', 'Thème A', [question]);
      obtenirReferentielActif.executer.mockResolvedValue([theme]);

      await expect(controller.obtenir()).resolves.toEqual({
        themes: [
          {
            id: 't1',
            libelle: 'Thème A',
            questions: [
              {
                id: 'q1',
                libelle: 'Une question',
                themeId: 't1',
                options: [
                  { libelle: 'Option 1', niveau: 1 },
                  { libelle: 'Option 2', niveau: 2 },
                  { libelle: 'Option 3', niveau: 3 },
                  { libelle: 'Option 4', niveau: 4 },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  it('renvoie le ChangeSet et son résumé pour un YAML valide', async () => {
    const changeSet = ChangeSet.creer([], []);
    previewImportReferentiel.executer.mockResolvedValue({
      type: 'valide',
      changeSet,
      resume: 'Aucun changement détecté.',
    });

    await expect(controller.previewImport('themes: []')).resolves.toEqual({
      changeSet,
      resume: 'Aucun changement détecté.',
    });
  });

  it('lève une BadRequestException pour un YAML invalide', async () => {
    previewImportReferentiel.executer.mockResolvedValue({
      type: 'invalide',
      erreurs: [{ type: 'yaml-mal-forme', message: 'oops' }],
    });

    await expect(controller.previewImport('not yaml')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('applique et renvoie le ChangeSet pour un YAML valide', async () => {
    const changeSet = ChangeSet.creer([], []);
    applyImportReferentiel.executer.mockResolvedValue({
      type: 'applique',
      changeSet,
    });

    await expect(controller.applyImport('themes: []')).resolves.toBe(changeSet);
  });

  it('lève une BadRequestException pour un YAML invalide sur application', async () => {
    applyImportReferentiel.executer.mockResolvedValue({
      type: 'invalide',
      erreurs: [{ type: 'yaml-mal-forme', message: 'oops' }],
    });

    await expect(controller.applyImport('not yaml')).rejects.toThrow(
      BadRequestException,
    );
  });
});
