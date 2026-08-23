import { LibelleConsensus } from './libelle-consensus';

describe('LibelleConsensus', () => {
  it.each([
    ['FORT', 'Consensus fort'],
    ['MODERE', 'Consensus modéré'],
    ['FAIBLE', 'Consensus faible'],
  ] as const)('traduit %s en "%s"', (consensus, attendu) => {
    expect(LibelleConsensus.pour(consensus)).toBe(attendu);
  });

  it('renvoie une chaîne vide pour null', () => {
    expect(LibelleConsensus.pour(null)).toBe('');
  });
});
