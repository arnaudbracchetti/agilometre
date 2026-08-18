import { randomUUID } from 'node:crypto';
import { PrismaService } from './../src/prisma/prisma.service';
import { PrismaJetonSessionRepository } from './../src/session/infrastructure/prisma-jeton-session.repository';
import { PrismaSessionRepository } from './../src/session/infrastructure/prisma-session.repository';
import { Selection } from './../src/session/domain/selection';
import {
  Session,
  SessionNonOuverteError,
} from './../src/session/domain/session';

// CA #33 : "émis uniquement pour une Session OUVERTE", contre un vrai Postgres (pnpm dev:db:test).
describe('PrismaJetonSessionRepository (e2e)', () => {
  let prisma: PrismaService;
  let repository: PrismaJetonSessionRepository;
  let sessions: PrismaSessionRepository;
  let equipeId: string;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaJetonSessionRepository(prisma);
    sessions = new PrismaSessionRepository(prisma);
    await nettoyer();

    const entite = await prisma.entite.create({ data: { nom: 'DSI' } });
    const equipe = await prisma.equipe.create({
      data: { nom: 'Alpha', entiteId: entite.id },
    });
    equipeId = equipe.id;
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

  async function creerSession(): Promise<Session> {
    const session = Session.creer(
      randomUUID(),
      equipeId,
      new Date('2026-04-01'),
      'm1',
      Selection.vide(),
    ).valeur;
    await sessions.save(session);
    return session;
  }

  it('émet un Jeton pour une Session OUVERTE', async () => {
    const session = await creerSession();
    session.ouvrir('AB12');
    await sessions.save(session);

    const jeton = await repository.emettre(session.id);

    expect(jeton.sessionId).toBe(session.id);
    await expect(repository.findById(jeton.id)).resolves.not.toBeNull();
  });

  it('refuse d’émettre pour une Session PREPAREE', async () => {
    const session = await creerSession();

    await expect(repository.emettre(session.id)).rejects.toThrow(
      SessionNonOuverteError,
    );
  });

  it('refuse d’émettre pour une Session CLOTUREE', async () => {
    const session = await creerSession();
    session.ouvrir('AB12');
    await sessions.save(session);
    session.terminer();
    await sessions.save(session);

    await expect(repository.emettre(session.id)).rejects.toThrow(
      SessionNonOuverteError,
    );
  });

  it('compterPour compte les Jetons émis pour une Session', async () => {
    const session = await creerSession();
    session.ouvrir('AB12');
    await sessions.save(session);

    await repository.emettre(session.id);
    await repository.emettre(session.id);

    await expect(repository.compterPour(session.id)).resolves.toBe(2);
  });
});
