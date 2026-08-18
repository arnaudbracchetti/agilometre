import { PrismaService } from '../../prisma/prisma.service';
import { CryptoGenerateurDeCode } from './crypto-generateur-de-code';

function prismaFake(comptes: number[]): {
  prisma: PrismaService;
  count: jest.Mock;
} {
  let appel = 0;
  const count = jest.fn(() => Promise.resolve(comptes[appel++] ?? 0));
  return { prisma: { session: { count } } as unknown as PrismaService, count };
}

describe('CryptoGenerateurDeCode', () => {
  it('génère un Code numérique à 4 chiffres', async () => {
    const { prisma } = prismaFake([0]);
    const generateur = new CryptoGenerateurDeCode(prisma);

    const code = await generateur.generer();

    expect(code).toMatch(/^\d{4}$/);
  });

  it('retire un nouveau Code tant que le précédent est déjà pris', async () => {
    const { prisma, count } = prismaFake([1, 0]);
    const generateur = new CryptoGenerateurDeCode(prisma);

    const code = await generateur.generer();

    expect(code).toMatch(/^\d{4}$/);
    expect(count).toHaveBeenCalledTimes(2);
  });
});
