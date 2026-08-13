import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChangeSet } from './domain/change-set';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';
import { ReferentielController } from './referentiel.controller';

describe('ReferentielController', () => {
  let controller: ReferentielController;
  let previewImportReferentiel: { executer: jest.Mock };

  beforeEach(async () => {
    previewImportReferentiel = { executer: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferentielController],
      providers: [
        {
          provide: PreviewImportReferentiel,
          useValue: previewImportReferentiel,
        },
      ],
    }).compile();

    controller = module.get(ReferentielController);
  });

  it('renvoie le ChangeSet pour un YAML valide', async () => {
    const changeSet = ChangeSet.creer([], []);
    previewImportReferentiel.executer.mockResolvedValue({
      type: 'valide',
      changeSet,
    });

    await expect(controller.previewImport('themes: []')).resolves.toBe(
      changeSet,
    );
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
});
