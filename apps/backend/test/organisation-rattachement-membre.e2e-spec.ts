import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { EntiteDto, EquipeDto, Role, UtilisateurDto } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { jetonCoachDeTest } from './support/jeton-coach';
import { jetonDirectionDeTest } from './support/jeton-direction-de-test';

describe('Organisation — Rattachement Membre d’équipe (e2e) — carte #62', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jetonCoach: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    jetonCoach = await jetonCoachDeTest(app);

    prisma = app.get(PrismaService);
    await nettoyer();
  });

  afterEach(async () => {
    await nettoyer();
    await app.close();
  });

  async function nettoyer(): Promise<void> {
    await prisma.jetonCompte.deleteMany();
    await prisma.equipe.deleteMany(); // cascade Membre
    await prisma.entite.deleteMany();
    await prisma.utilisateur.deleteMany();
  }

  async function creerEntite(nom: string): Promise<EntiteDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom })
      .expect(201);
    return reponse.body as EntiteDto;
  }

  async function creerEquipe(
    nom: string,
    entiteId: string,
  ): Promise<EquipeDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom, entiteId })
      .expect(201);
    return reponse.body as EquipeDto;
  }

  async function ajouterMembre(
    equipeId: string,
    nom: string,
    email: string,
  ): Promise<EquipeDto> {
    const reponse = await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipeId}/membres`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom, email })
      .expect(201);
    return reponse.body as EquipeDto;
  }

  async function creerCompte(
    email: string,
    prenom: string,
    nom: string,
    role: Role,
  ): Promise<UtilisateurDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ email, prenom, nom, role })
      .expect(201);
    return reponse.body as UtilisateurDto;
  }

  async function obtenirEquipe(id: string): Promise<EquipeDto> {
    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${id}`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    return reponse.body as EquipeDto;
  }

  /** Jeton signé avec le vrai id du compte (pas le `test-membre` fixe de jeton-membre-de-test.ts) —
   * nécessaire pour que `PerimetreUtilisateur.peutVoirEquipe` résolve le roster réel en base. */
  function jetonPourCompte(compte: UtilisateurDto): Promise<string> {
    return app.get(JwtService).signAsync({
      sub: compte.id,
      email: compte.email,
      role: Role.Membre,
    });
  }

  describe('Rattachement automatique par email', () => {
    it('POST /api/comptes — lie le compte créé aux Membres de même email dans deux rosters différents', async () => {
      const entite = await creerEntite('DSI');
      const equipeA = await creerEquipe('Alpha', entite.id);
      const equipeB = await creerEquipe('Beta', entite.id);
      await ajouterMembre(equipeA.id, 'Jean D.', 'jean@example.com');
      await ajouterMembre(equipeB.id, 'J. Dupont', 'jean@example.com');

      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );

      const [equipeAApres, equipeBApres] = await Promise.all([
        obtenirEquipe(equipeA.id),
        obtenirEquipe(equipeB.id),
      ]);
      expect(equipeAApres.membres[0]).toMatchObject({
        utilisateurId: compte.id,
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean@example.com',
      });
      expect(equipeBApres.membres[0]).toMatchObject({
        utilisateurId: compte.id,
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean@example.com',
      });
    });

    it('POST .../membres — lie automatiquement un compte Membre d’équipe existant de même email', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipe = await creerEquipe('Alpha', entite.id);

      const equipeApres = await ajouterMembre(
        equipe.id,
        'Autre saisie',
        'jean@example.com',
      );

      expect(equipeApres.membres[0]).toMatchObject({
        utilisateurId: compte.id,
        nom: 'Dupont',
        prenom: 'Jean',
      });
    });

    it('POST .../membres — ne lie pas un compte de même email mais d’un autre Rôle', async () => {
      await creerCompte('jean@example.com', 'Jean', 'Dupont', Role.Coach);
      const entite = await creerEntite('DSI');
      const equipe = await creerEquipe('Alpha', entite.id);

      const equipeApres = await ajouterMembre(
        equipe.id,
        'Jean Dupont',
        'jean@example.com',
      );

      expect(equipeApres.membres[0].utilisateurId).toBeNull();
    });

    it('PATCH /api/comptes/:id — un changement d’email ne délie ni ne relie rien', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipe = await creerEquipe('Alpha', entite.id);
      const equipeAvecMembre = await ajouterMembre(
        equipe.id,
        'x',
        'jean@example.com',
      );
      const idMembreLie = equipeAvecMembre.membres[0].id;

      await request(app.getHttpServer())
        .patch(`/api/comptes/${compte.id}`)
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({
          email: 'jean.nouveau@example.com',
          prenom: 'Jean',
          nom: 'Dupont',
        })
        .expect(200);

      const equipeApres = await obtenirEquipe(equipe.id);
      // Toujours lié au même compte, avec l'email propagé — pas de déliage.
      expect(equipeApres.membres[0]).toMatchObject({
        id: idMembreLie,
        utilisateurId: compte.id,
        email: 'jean.nouveau@example.com',
      });
    });
  });

  describe('Propagation descendante', () => {
    it('PATCH /api/comptes/:id — propage nom/prénom/email vers les rosters de deux Équipes, dans le même appel', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipeA = await creerEquipe('Alpha', entite.id);
      const equipeB = await creerEquipe('Beta', entite.id);
      // Auto-rattachés via l'ajout au roster (trigger #2), puisque `compte` existe déjà.
      await ajouterMembre(equipeA.id, 'x', 'jean@example.com');
      await ajouterMembre(equipeB.id, 'x', 'jean@example.com');

      await request(app.getHttpServer())
        .patch(`/api/comptes/${compte.id}`)
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({ email: 'grace@example.com', prenom: 'Grace', nom: 'Hopper' })
        .expect(200);

      const [equipeAApres, equipeBApres] = await Promise.all([
        obtenirEquipe(equipeA.id),
        obtenirEquipe(equipeB.id),
      ]);
      expect(equipeAApres.membres[0]).toMatchObject({
        nom: 'Hopper',
        prenom: 'Grace',
        email: 'grace@example.com',
      });
      expect(equipeBApres.membres[0]).toMatchObject({
        nom: 'Hopper',
        prenom: 'Grace',
        email: 'grace@example.com',
      });
    });

    it('PATCH /api/comptes/:id — 409 et aucune propagation si le nouvel email collisionne dans un roster, en bloc', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipeA = await creerEquipe('Alpha', entite.id);
      const equipeB = await creerEquipe('Beta', entite.id);
      await ajouterMembre(equipeA.id, 'x', 'jean@example.com');
      // Un autre Membre du roster B porte déjà l'email cible du changement.
      await ajouterMembre(equipeB.id, 'Collision', 'collision@example.com');
      await ajouterMembre(equipeB.id, 'x', 'jean@example.com');

      await request(app.getHttpServer())
        .patch(`/api/comptes/${compte.id}`)
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({
          email: 'collision@example.com',
          prenom: 'Jean',
          nom: 'Dupont',
        })
        .expect(409);

      const [equipeAApres, equipeBApres, compteApres] = await Promise.all([
        obtenirEquipe(equipeA.id),
        obtenirEquipe(equipeB.id),
        prisma.utilisateur.findUniqueOrThrow({ where: { id: compte.id } }),
      ]);
      // Rien n'a changé : ni le compte, ni le roster A, ni le roster B (rejet en bloc).
      expect(compteApres.email).toBe('jean@example.com');
      expect(equipeAApres.membres[0].email).toBe('jean@example.com');
      expect(equipeBApres.membres.map((m) => m.email).sort()).toEqual(
        ['collision@example.com', 'jean@example.com'].sort(),
      );
    });
  });

  describe('Ligne de roster liée — lecture seule', () => {
    it('PATCH .../membres/:membreId — refuse la modification d’un Membre lié à un compte', async () => {
      const entite = await creerEntite('DSI');
      const equipe = await creerEquipe('Alpha', entite.id);
      await creerCompte('jean@example.com', 'Jean', 'Dupont', Role.Membre);
      const equipeApres = await ajouterMembre(
        equipe.id,
        'x',
        'jean@example.com',
      );
      const membre = equipeApres.membres[0];
      expect(membre.utilisateurId).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/api/organisation/equipes/${equipe.id}/membres/${membre.id}`)
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({ nom: 'Autre', email: 'autre@example.com' })
        .expect(400);
    });
  });

  describe('Périmètre Membre d’équipe — arbre de navigation partagé', () => {
    it('GET /api/organisation/entites — ne renvoie que les Entités contenant au moins une de ses Équipes', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entiteAvecEquipe = await creerEntite('DSI');
      const entiteSansEquipe = await creerEntite('Marketing');
      const equipe = await creerEquipe('Alpha', entiteAvecEquipe.id);
      await ajouterMembre(equipe.id, 'x', 'jean@example.com');
      const jeton = await jetonPourCompte(compte);

      const reponse = await request(app.getHttpServer())
        .get('/api/organisation/entites')
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);

      const ids = (reponse.body as EntiteDto[]).map((e) => e.id);
      expect(ids).toEqual([entiteAvecEquipe.id]);
      expect(ids).not.toContain(entiteSansEquipe.id);
    });

    it('GET .../entites/:id/equipes — ne renvoie que ses propres Équipes de cette Entité', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipeMembre = await creerEquipe('Alpha', entite.id);
      const autreEquipe = await creerEquipe('Beta', entite.id);
      await ajouterMembre(equipeMembre.id, 'x', 'jean@example.com');
      const jeton = await jetonPourCompte(compte);

      const reponse = await request(app.getHttpServer())
        .get(`/api/organisation/entites/${entite.id}/equipes`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);

      const ids = (reponse.body as EquipeDto[]).map((e) => e.id);
      expect(ids).toEqual([equipeMembre.id]);
      expect(ids).not.toContain(autreEquipe.id);
    });

    it('une Direction ne voit jamais aucune Équipe, même en appelant directement cette route', async () => {
      const entite = await creerEntite('DSI');
      await creerEquipe('Alpha', entite.id);
      const jetonDirection = await jetonDirectionDeTest(app);

      const reponse = await request(app.getHttpServer())
        .get(`/api/organisation/entites/${entite.id}/equipes`)
        .set('Authorization', `Bearer ${jetonDirection}`)
        .expect(200);

      expect(reponse.body).toEqual([]);
    });

    it('GET .../entites/:id/profil — accessible à un Membre pour une Entité contenant son Équipe (écart assumé)', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipe = await creerEquipe('Alpha', entite.id);
      await ajouterMembre(equipe.id, 'x', 'jean@example.com');
      const jeton = await jetonPourCompte(compte);

      await request(app.getHttpServer())
        .get(`/api/organisation/entites/${entite.id}/profil`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);
    });

    it('GET .../entites/:id/profil — 403 pour une Entité sans aucune de ses Équipes', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entiteSansEquipe = await creerEntite('Marketing');
      const jeton = await jetonPourCompte(compte);

      await request(app.getHttpServer())
        .get(`/api/organisation/entites/${entiteSansEquipe.id}/profil`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(403);
    });

    it('GET .../equipes/:id/profil et /sessions — 200 pour sa propre Équipe, 403 pour une autre', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipeA = await creerEquipe('Alpha', entite.id);
      const equipeB = await creerEquipe('Beta', entite.id);
      await ajouterMembre(equipeA.id, 'x', 'jean@example.com');
      const jeton = await jetonPourCompte(compte);

      await request(app.getHttpServer())
        .get(`/api/organisation/equipes/${equipeA.id}/profil`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/organisation/equipes/${equipeA.id}/sessions`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/organisation/equipes/${equipeB.id}/profil`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/api/organisation/equipes/${equipeB.id}/sessions`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(403);
    });

    it('retirer un Membre du roster lui retire immédiatement l’accès à cette Équipe', async () => {
      const compte = await creerCompte(
        'jean@example.com',
        'Jean',
        'Dupont',
        Role.Membre,
      );
      const entite = await creerEntite('DSI');
      const equipe = await creerEquipe('Alpha', entite.id);
      const equipeAvecMembre = await ajouterMembre(
        equipe.id,
        'x',
        'jean@example.com',
      );
      const membre = equipeAvecMembre.membres[0];
      const jeton = await jetonPourCompte(compte);

      await request(app.getHttpServer())
        .get(`/api/organisation/equipes/${equipe.id}/profil`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/organisation/equipes/${equipe.id}/membres/${membre.id}`)
        .set('Authorization', `Bearer ${jetonCoach}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/organisation/equipes/${equipe.id}/profil`)
        .set('Authorization', `Bearer ${jeton}`)
        .expect(403);
    });
  });
});
