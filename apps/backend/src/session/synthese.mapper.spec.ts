import { ContexteSyntheseSession } from './application/obtenir-synthese-session.usecase';
import { versSyntheseDto } from './synthese.mapper';

const contexte: ContexteSyntheseSession = {
  equipeNom: 'Équipe A',
  date: new Date('2026-04-01'),
  code: 'AB12',
  statut: 'OUVERTE',
  seuilPalier: 0.6,
};

describe('versSyntheseDto', () => {
  it('peuple les champs de Palier global à partir du ResultatPalier reçu', () => {
    const dto = versSyntheseDto(contexte, [], {
      effectif: 6,
      palier: 2,
      tauxApproche: 0.5 / 0.6,
      margeAvantDescente: 1,
    });

    expect(dto.palierGlobal).toBe(2);
    expect(dto.tauxApprocheGlobal).toBe(0.5 / 0.6);
    expect(dto.margeAvantDescenteGlobal).toBe(1);
    expect(dto.effectifGlobal).toBe(6);
  });

  it('renvoie des champs de Palier global à null pour un effectif nul', () => {
    const dto = versSyntheseDto(contexte, [], { effectif: 0 });

    expect(dto.palierGlobal).toBeNull();
    expect(dto.tauxApprocheGlobal).toBeNull();
    expect(dto.margeAvantDescenteGlobal).toBeNull();
    expect(dto.effectifGlobal).toBe(0);
  });
});
