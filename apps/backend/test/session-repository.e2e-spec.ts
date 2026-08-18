import { randomUUID } from 'node:crypto';
import { PrismaService } from './../src/prisma/prisma.service';
import { PrismaSessionRepository } from './../src/session/infrastructure/prisma-session.repository';
import { GenerateurDeCode } from './../src/session/domain/generateur-de-code';
import { Selection } from './../src/session/domain/selection';
import { Session } from './../src/session/domain/session';

function generateurFixe(code: string): GenerateurDeCode {
  return { generer: () => Promise.resolve(code) };
}

// CA #32 : existeCodeOuvert, contre un vrai Postgres (pnpm dev:db:test).
describe('PrismaSessionRepository.existeCodeOuvert (e2e)', () => {
  let prisma: PrismaService;
  let repository: PrismaSessionRepository;
  let equipeId: string;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaSessionRepository(
      prisma,
      generateurFixe('inutilise'),
    );
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
    await prisma.sessionSelectionItem.deleteMany();
    await prisma.sessionQuestionSautee.deleteMany();
    await prisma.session.deleteMany();
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
  }

  async function sessionOuverte(code: string): Promise<Session> {
    const session = Session.creer(
      randomUUID(),
      equipeId,
      new Date('2026-04-01'),
      'm1',
      Selection.vide(),
      generateurFixe(code),
    ).valeur;
    await session.ouvrir();
    await repository.save(session);
    return session;
  }

  it('renvoie true pour un Code porté par une Session OUVERTE', async () => {
    await sessionOuverte('AB12');

    await expect(repository.existeCodeOuvert('AB12')).resolves.toBe(true);
  });

  it('renvoie false pour un Code inconnu', async () => {
    await expect(repository.existeCodeOuvert('INCONNU')).resolves.toBe(false);
  });

  it('renvoie false si le Code n’est porté que par une Session PREPAREE ou CLOTUREE', async () => {
    const preparee = Session.creer(
      randomUUID(),
      equipeId,
      new Date('2026-04-01'),
      'm1',
      Selection.vide(),
      generateurFixe('NEVER'),
    ).valeur;
    await repository.save(preparee);

    const cloturee = await sessionOuverte('CD34');
    cloturee.terminer();
    await repository.save(cloturee);

    await expect(repository.existeCodeOuvert('CD34')).resolves.toBe(false);
  });
});
