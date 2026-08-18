import { randomUUID } from 'node:crypto';
import { PrismaService } from './../src/prisma/prisma.service';
import { PrismaTourDeVoteRepository } from './../src/session/infrastructure/prisma-tour-de-vote.repository';
import { Selection } from './../src/session/domain/selection';
import { Session } from './../src/session/domain/session';
import { PrismaSessionRepository } from './../src/session/infrastructure/prisma-session.repository';
import { Reponse } from './../src/session/domain/reponse';
import { TourDeVote } from './../src/session/domain/tour-de-vote';

// CA #33 : trouverOuvertPour, contre un vrai Postgres (pnpm dev:db:test).
describe('PrismaTourDeVoteRepository (e2e)', () => {
  let prisma: PrismaService;
  let repository: PrismaTourDeVoteRepository;
  let sessions: PrismaSessionRepository;
  let sessionId: string;
  let sessionAutreId: string;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaTourDeVoteRepository(prisma);
    sessions = new PrismaSessionRepository(prisma);
    await nettoyer();

    const entite = await prisma.entite.create({ data: { nom: 'DSI' } });
    const equipe = await prisma.equipe.create({
      data: { nom: 'Alpha', entiteId: entite.id },
    });
    sessionId = await creerSession(equipe.id);
    sessionAutreId = await creerSession(equipe.id);
  });

  afterEach(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  async function nettoyer(): Promise<void> {
    await prisma.participation.deleteMany();
    await prisma.jetonSession.deleteMany();
    await prisma.reponse.deleteMany();
    await prisma.tourDeVote.deleteMany();
    await prisma.sessionSelectionItem.deleteMany();
    await prisma.sessionQuestionSautee.deleteMany();
    await prisma.session.deleteMany();
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
  }

  async function creerSession(equipeId: string): Promise<string> {
    const session = Session.creer(
      randomUUID(),
      equipeId,
      new Date('2026-04-01'),
      'm1',
      Selection.vide(),
    ).valeur;
    await sessions.save(session);
    return session.id;
  }

  function nouveauTour(id: string, sId: string, numero = 1): TourDeVote {
    return TourDeVote.creer(
      id,
      sId,
      'q1',
      numero,
      new Date('2026-04-01T10:00:00Z'),
      null,
    ).valeur;
  }

  /** Persiste le Jeton et la Reponse qu'un voter() a produits — préconditions FK de Participation. */
  async function persisterPreconditionsVote(
    jetonId: string,
    reponse: Reponse,
  ): Promise<void> {
    await prisma.jetonSession.create({ data: { id: jetonId, sessionId } });
    await prisma.reponse.create({
      data: {
        id: reponse.id,
        questionId: reponse.questionId,
        niveau: reponse.niveau,
        equipeId: reponse.equipeId,
        horodatage: reponse.horodatage,
        origine: reponse.origine,
        tourId: reponse.tourId,
      },
    });
  }

  describe('trouverOuvertPour', () => {
    it('renvoie le Tour ouvert d’une Session', async () => {
      const tour = nouveauTour(randomUUID(), sessionId);
      await repository.save(tour);

      const trouve = await repository.trouverOuvertPour(sessionId);

      expect(trouve?.id).toBe(tour.id);
      expect(trouve?.estClos).toBe(false);
    });

    it('renvoie null si aucun Tour n’est ouvert', async () => {
      await expect(repository.trouverOuvertPour(sessionId)).resolves.toBeNull();
    });

    it('renvoie null une fois le Tour clos', async () => {
      const tour = nouveauTour(randomUUID(), sessionId);
      tour.clore(new Date('2026-04-01T10:05:00Z'));
      await repository.save(tour);

      await expect(repository.trouverOuvertPour(sessionId)).resolves.toBeNull();
    });

    it('ignore les Tours ouverts d’une autre Session', async () => {
      const tour = nouveauTour(randomUUID(), sessionAutreId);
      await repository.save(tour);

      await expect(repository.trouverOuvertPour(sessionId)).resolves.toBeNull();
    });
  });

  describe('save / findById', () => {
    it('persiste et recharge un Tour avec ses Participation', async () => {
      const jetonId = randomUUID();
      const tour = nouveauTour(randomUUID(), sessionId);
      await repository.save(tour); // crée la ligne TourDeVote, précondition FK de Reponse.tourId

      const { reponse } = tour.voter(
        jetonId,
        randomUUID(),
        3,
        'equipe-1',
        new Date('2026-04-01T10:01:00Z'),
      ).valeur;
      await persisterPreconditionsVote(jetonId, reponse);
      await repository.save(tour);

      const recharge = await repository.findById(tour.id);

      expect(recharge?.participations).toHaveLength(1);
      expect(recharge?.voteDe(jetonId)?.reponseId).toBe(reponse.id);
    });

    it('la clôture purge les Participation en base', async () => {
      const jetonId = randomUUID();
      const tour = nouveauTour(randomUUID(), sessionId);
      await repository.save(tour); // crée la ligne TourDeVote, précondition FK de Reponse.tourId

      const { reponse } = tour.voter(
        jetonId,
        randomUUID(),
        2,
        'equipe-1',
        new Date('2026-04-01T10:01:00Z'),
      ).valeur;
      await persisterPreconditionsVote(jetonId, reponse);
      await repository.save(tour);

      tour.clore(new Date('2026-04-01T10:05:00Z'));
      await repository.save(tour);

      const rows = await prisma.participation.findMany({
        where: { tourId: tour.id },
      });
      expect(rows).toHaveLength(0);
    });
  });
});
