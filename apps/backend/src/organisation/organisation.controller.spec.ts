import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Entite, NomEntiteInvalideError } from './domain/entite';
import { CreerEntite } from './application/creer-entite.usecase';
import { RenommerEntite } from './application/renommer-entite.usecase';
import { ListerEntites } from './application/lister-entites.usecase';
import { OrganisationController } from './organisation.controller';

describe('OrganisationController', () => {
  let controller: OrganisationController;
  let creerEntite: { executer: jest.Mock };
  let renommerEntite: { executer: jest.Mock };
  let listerEntites: { executer: jest.Mock };

  beforeEach(async () => {
    creerEntite = { executer: jest.fn() };
    renommerEntite = { executer: jest.fn() };
    listerEntites = { executer: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganisationController],
      providers: [
        { provide: CreerEntite, useValue: creerEntite },
        { provide: RenommerEntite, useValue: renommerEntite },
        { provide: ListerEntites, useValue: listerEntites },
      ],
    }).compile();

    controller = module.get(OrganisationController);
  });

  describe('lister', () => {
    it('renvoie les Entités sous forme de DTO', async () => {
      listerEntites.executer.mockResolvedValue([
        Entite.creer('e1', 'DSI').valeur,
      ]);

      await expect(controller.lister()).resolves.toEqual([
        { id: 'e1', nom: 'DSI' },
      ]);
    });
  });

  describe('creer', () => {
    it('renvoie l’Entité créée', async () => {
      creerEntite.executer.mockResolvedValue({
        type: 'cree',
        entite: Entite.creer('e1', 'DSI').valeur,
      });

      await expect(controller.creer({ nom: 'DSI' })).resolves.toEqual({
        id: 'e1',
        nom: 'DSI',
      });
    });

    it('lève une BadRequestException pour un nom invalide', async () => {
      creerEntite.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new NomEntiteInvalideError(),
      });

      await expect(controller.creer({ nom: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève une ConflictException si le nom existe déjà', async () => {
      creerEntite.executer.mockResolvedValue({ type: 'doublon' });

      await expect(controller.creer({ nom: 'DSI' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('renommer', () => {
    it('renvoie l’Entité renommée', async () => {
      renommerEntite.executer.mockResolvedValue({
        type: 'renomme',
        entite: Entite.creer('e1', 'Nouveau nom').valeur,
      });

      await expect(
        controller.renommer('e1', { nom: 'Nouveau nom' }),
      ).resolves.toEqual({
        id: 'e1',
        nom: 'Nouveau nom',
      });
    });

    it('lève une NotFoundException si l’Entité est introuvable', async () => {
      renommerEntite.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.renommer('inconnu', { nom: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une BadRequestException pour un nom invalide', async () => {
      renommerEntite.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new NomEntiteInvalideError(),
      });

      await expect(controller.renommer('e1', { nom: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève une ConflictException si une autre Entité porte déjà ce nom', async () => {
      renommerEntite.executer.mockResolvedValue({ type: 'doublon' });

      await expect(controller.renommer('e1', { nom: 'DSI' })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
