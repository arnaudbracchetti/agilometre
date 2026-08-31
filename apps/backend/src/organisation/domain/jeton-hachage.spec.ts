import { HacherJetonCompte } from './jeton-hachage';

describe('HacherJetonCompte', () => {
  it('est déterministe pour une même entrée', () => {
    expect(HacherJetonCompte.executer('mon-jeton')).toBe(
      HacherJetonCompte.executer('mon-jeton'),
    );
  });

  it('produit des hashs différents pour des jetons différents', () => {
    expect(HacherJetonCompte.executer('jeton-a')).not.toBe(
      HacherJetonCompte.executer('jeton-b'),
    );
  });

  it('produit un hash hexadécimal de 64 caractères (SHA-256)', () => {
    expect(HacherJetonCompte.executer('mon-jeton')).toMatch(/^[a-f0-9]{64}$/);
  });
});
