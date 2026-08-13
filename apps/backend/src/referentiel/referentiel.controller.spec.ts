import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChangeSet } from './domain/change-set';
import { ApplyImportReferentiel } from './application/apply-import-referentiel.usecase';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';
import { ReferentielController } from './referentiel.controller';

describe('ReferentielController', () => {
  let controller: ReferentielController;
  let previewImportReferentiel: { executer: jest.Mock };
  let applyImportReferentiel: { executer: jest.Mock };

  beforeEach(async () => {
    previewImportReferentiel = { executer: jest.fn() };
    applyImportReferentiel = { executer: jest.fn() };
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
      ],
    }).compile();

    controller = module.get(ReferentielController);
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
