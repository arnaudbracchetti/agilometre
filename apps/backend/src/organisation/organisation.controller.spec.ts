import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Entite, NomEntiteInvalideError } from './domain/entite';
import { Equipe, NomEquipeInvalideError } from './domain/equipe';
import { EmailMembreInvalideError } from './domain/membre';
import { CreerEntite } from './application/creer-entite.usecase';
import { RenommerEntite } from './application/renommer-entite.usecase';
import { ListerEntites } from './application/lister-entites.usecase';
import { CreerEquipe } from './application/creer-equipe.usecase';
import { RenommerEquipe } from './application/renommer-equipe.usecase';
import { SupprimerEquipe } from './application/supprimer-equipe.usecase';
import { ListerEquipesParEntite } from './application/lister-equipes-par-entite.usecase';
import { AjouterMembre } from './application/ajouter-membre.usecase';
import { RetirerMembre } from './application/retirer-membre.usecase';
import { ModifierMembre } from './application/modifier-membre.usecase';
import { OrganisationController } from './organisation.controller';

describe('OrganisationController', () => {
  let controller: OrganisationController;
  let creerEntite: { executer: jest.Mock };
  let renommerEntite: { executer: jest.Mock };
  let listerEntites: { executer: jest.Mock };
  let creerEquipe: { executer: jest.Mock };
  let renommerEquipe: { executer: jest.Mock };
  let supprimerEquipe: { executer: jest.Mock };
  let listerEquipesParEntite: { executer: jest.Mock };
  let ajouterMembre: { executer: jest.Mock };
  let retirerMembre: { executer: jest.Mock };
  let modifierMembre: { executer: jest.Mock };

  beforeEach(async () => {
    creerEntite = { executer: jest.fn() };
    renommerEntite = { executer: jest.fn() };
    listerEntites = { executer: jest.fn() };
    creerEquipe = { executer: jest.fn() };
    renommerEquipe = { executer: jest.fn() };
    supprimerEquipe = { executer: jest.fn() };
    listerEquipesParEntite = { executer: jest.fn() };
    ajouterMembre = { executer: jest.fn() };
    retirerMembre = { executer: jest.fn() };
    modifierMembre = { executer: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganisationController],
      providers: [
        { provide: CreerEntite, useValue: creerEntite },
        { provide: RenommerEntite, useValue: renommerEntite },
        { provide: ListerEntites, useValue: listerEntites },
        { provide: CreerEquipe, useValue: creerEquipe },
        { provide: RenommerEquipe, useValue: renommerEquipe },
        { provide: SupprimerEquipe, useValue: supprimerEquipe },
        { provide: ListerEquipesParEntite, useValue: listerEquipesParEntite },
        { provide: AjouterMembre, useValue: ajouterMembre },
        { provide: RetirerMembre, useValue: retirerMembre },
        { provide: ModifierMembre, useValue: modifierMembre },
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

  describe('listerEquipes', () => {
    it('renvoie les Équipes d’une Entité, roster inclus', async () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
      listerEquipesParEntite.executer.mockResolvedValue([equipe]);

      await expect(controller.listerEquipes('e1')).resolves.toEqual([
        {
          id: 'eq1',
          nom: 'Alpha',
          entiteId: 'e1',
          membres: [
            {
              id: 'm1',
              nom: 'Jean Dupont',
              email: 'jean@example.com',
              utilisateurId: null,
            },
          ],
        },
      ]);
    });
  });

  describe('creerEquipeAction', () => {
    it('renvoie l’Équipe créée', async () => {
      creerEquipe.executer.mockResolvedValue({
        type: 'creee',
        equipe: Equipe.creer('eq1', 'Alpha', 'e1').valeur,
      });

      await expect(
        controller.creerEquipeAction({ nom: 'Alpha', entiteId: 'e1' }),
      ).resolves.toEqual({
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [],
      });
    });

    it('lève une NotFoundException si l’Entité est introuvable', async () => {
      creerEquipe.executer.mockResolvedValue({ type: 'entite_introuvable' });

      await expect(
        controller.creerEquipeAction({ nom: 'Alpha', entiteId: 'inconnue' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une BadRequestException pour un nom invalide', async () => {
      creerEquipe.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new NomEquipeInvalideError(),
      });

      await expect(
        controller.creerEquipeAction({ nom: '', entiteId: 'e1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève une ConflictException si le nom existe déjà', async () => {
      creerEquipe.executer.mockResolvedValue({ type: 'doublon' });

      await expect(
        controller.creerEquipeAction({ nom: 'Alpha', entiteId: 'e1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('renommerEquipeAction', () => {
    it('renvoie l’Équipe renommée', async () => {
      renommerEquipe.executer.mockResolvedValue({
        type: 'renommee',
        equipe: Equipe.creer('eq1', 'Beta', 'e1').valeur,
      });

      await expect(
        controller.renommerEquipeAction('eq1', { nom: 'Beta' }),
      ).resolves.toEqual({
        id: 'eq1',
        nom: 'Beta',
        entiteId: 'e1',
        membres: [],
      });
    });

    it('lève une NotFoundException si l’Équipe est introuvable', async () => {
      renommerEquipe.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.renommerEquipeAction('inconnue', { nom: 'Beta' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('supprimerEquipeAction', () => {
    it('supprime l’Équipe sans erreur', async () => {
      supprimerEquipe.executer.mockResolvedValue({ type: 'supprimee' });

      await expect(
        controller.supprimerEquipeAction('eq1'),
      ).resolves.toBeUndefined();
    });

    it('lève une NotFoundException si l’Équipe est introuvable', async () => {
      supprimerEquipe.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.supprimerEquipeAction('inconnue'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une ConflictException si l’Équipe est encore référencée', async () => {
      supprimerEquipe.executer.mockResolvedValue({ type: 'referencee' });

      await expect(controller.supprimerEquipeAction('eq1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('ajouterMembreAction', () => {
    it('renvoie l’Équipe avec le Membre ajouté', async () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
      ajouterMembre.executer.mockResolvedValue({ type: 'ajoute', equipe });

      await expect(
        controller.ajouterMembreAction('eq1', {
          nom: 'Jean Dupont',
          email: 'jean@example.com',
        }),
      ).resolves.toEqual({
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [
          {
            id: 'm1',
            nom: 'Jean Dupont',
            email: 'jean@example.com',
            utilisateurId: null,
          },
        ],
      });
    });

    it('lève une NotFoundException si l’Équipe est introuvable', async () => {
      ajouterMembre.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.ajouterMembreAction('inconnue', {
          nom: 'Jean Dupont',
          email: 'jean@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une BadRequestException pour un email mal formé', async () => {
      ajouterMembre.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new EmailMembreInvalideError(),
      });

      await expect(
        controller.ajouterMembreAction('eq1', {
          nom: 'Jean Dupont',
          email: 'invalide',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève une ConflictException si l’email est déjà utilisé dans le roster', async () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
      const doublon = equipe.ajouterMembre('m2', 'Jean D.', 'jean@example.com');
      ajouterMembre.executer.mockResolvedValue({
        type: 'invalide',
        erreur: doublon.erreur,
      });

      await expect(
        controller.ajouterMembreAction('eq1', {
          nom: 'Jean D.',
          email: 'jean@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('modifierMembreAction', () => {
    it('renvoie l’Équipe avec le Membre modifié', async () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
      equipe.modifierMembre('m1', 'Jean D.', 'jean.d@example.com');
      modifierMembre.executer.mockResolvedValue({ type: 'modifie', equipe });

      await expect(
        controller.modifierMembreAction('eq1', 'm1', {
          nom: 'Jean D.',
          email: 'jean.d@example.com',
        }),
      ).resolves.toEqual({
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [
          {
            id: 'm1',
            nom: 'Jean D.',
            email: 'jean.d@example.com',
            utilisateurId: null,
          },
        ],
      });
    });

    it('lève une NotFoundException si l’Équipe est introuvable', async () => {
      modifierMembre.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.modifierMembreAction('inconnue', 'm1', {
          nom: 'Jean D.',
          email: 'jean@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une NotFoundException si le Membre est introuvable', async () => {
      modifierMembre.executer.mockResolvedValue({ type: 'membre_introuvable' });

      await expect(
        controller.modifierMembreAction('eq1', 'inconnu', {
          nom: 'Jean D.',
          email: 'jean@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une BadRequestException pour un email mal formé', async () => {
      modifierMembre.executer.mockResolvedValue({
        type: 'invalide',
        erreur: new EmailMembreInvalideError(),
      });

      await expect(
        controller.modifierMembreAction('eq1', 'm1', {
          nom: 'Jean D.',
          email: 'invalide',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève une ConflictException si l’email est déjà utilisé par un autre Membre', async () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
      equipe.ajouterMembre('m2', 'Marie Curie', 'marie@example.com');
      const doublon = equipe.modifierMembre(
        'm2',
        'Marie C.',
        'jean@example.com',
      );
      modifierMembre.executer.mockResolvedValue({
        type: 'invalide',
        erreur: doublon.erreur,
      });

      await expect(
        controller.modifierMembreAction('eq1', 'm2', {
          nom: 'Marie C.',
          email: 'jean@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('retirerMembreAction', () => {
    it('renvoie l’Équipe sans le Membre retiré', async () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      retirerMembre.executer.mockResolvedValue({ type: 'retire', equipe });

      await expect(
        controller.retirerMembreAction('eq1', 'm1'),
      ).resolves.toEqual({
        id: 'eq1',
        nom: 'Alpha',
        entiteId: 'e1',
        membres: [],
      });
    });

    it('lève une NotFoundException si l’Équipe est introuvable', async () => {
      retirerMembre.executer.mockResolvedValue({ type: 'introuvable' });

      await expect(
        controller.retirerMembreAction('inconnue', 'm1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève une NotFoundException si le Membre est introuvable', async () => {
      retirerMembre.executer.mockResolvedValue({ type: 'membre_introuvable' });

      await expect(
        controller.retirerMembreAction('eq1', 'inconnu'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
