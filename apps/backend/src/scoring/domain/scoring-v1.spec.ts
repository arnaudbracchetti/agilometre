import { ScoringV1 } from './scoring-v1';
import { Periode } from './scoring';

describe('ScoringV1', () => {
  let scoring: ScoringV1;

  beforeEach(() => {
    scoring = new ScoringV1();
  });

  describe('calculerPalier', () => {
    it("rejoue l'exemple chiffré du PRD §6 (40 réponses, X=60%)", () => {
      // 10 réponses au Niveau 1, 8 au Niveau 2, 14 au Niveau 3, 8 au Niveau 4 : ≥2 = 30/40 (75%),
      // ≥3 = 22/40 (55%) — reproduit exactement les effectifs de l'exemple chiffré du PRD §6.
      const niveaux: number[] = [
        ...(Array(10).fill(1) as number[]),
        ...(Array(8).fill(2) as number[]),
        ...(Array(14).fill(3) as number[]),
        ...(Array(8).fill(4) as number[]),
      ];
      expect(niveaux).toHaveLength(40);
      expect(niveaux.filter((n) => n >= 2)).toHaveLength(30);
      expect(niveaux.filter((n) => n >= 3)).toHaveLength(22);

      const resultat = scoring.calculerPalier(niveaux, 0.6);

      // tauxApproche normalisé par le seuil : 0.55 / 0.6 (100% coïnciderait avec le Palier 3).
      // margeAvantDescente : part(≥2) = 0.75, à mi-chemin entre le seuil (0.6) et 1 : (0.75-0.6)/(1-0.6).
      expect(resultat).toEqual({
        effectif: 40,
        palier: 2,
        tauxApproche: 0.55 / 0.6,
        margeAvantDescente: (0.75 - 0.6) / (1 - 0.6),
      });
    });

    it('renvoie un effectif nul et aucun Palier sur une population vide', () => {
      const resultat = scoring.calculerPalier([], 0.6);

      expect(resultat).toEqual({ effectif: 0 });
    });

    it('valide le Palier 1 par construction quand aucun Niveau supérieur n’est validé', () => {
      const niveaux = [1, 1, 1, 4];

      const resultat = scoring.calculerPalier(niveaux, 0.6);

      // Palier 1 : part(≥1) = 1 par construction (tout Niveau est ≥1) → margeAvantDescente = 1
      // (Palier 1 ne peut jamais être perdu, il n'y a pas de Palier 0).
      expect(resultat).toEqual({
        effectif: 4,
        palier: 1,
        tauxApproche: 0.25 / 0.6,
        margeAvantDescente: 1,
      });
    });

    it('ne renvoie pas de tauxApproche quand le Palier est déjà au maximum', () => {
      const niveaux = [4, 4, 4, 4];

      const resultat = scoring.calculerPalier(niveaux, 0.6);

      expect(resultat).toEqual({
        effectif: 4,
        palier: 4,
        tauxApproche: null,
        margeAvantDescente: 1,
      });
    });

    it('renvoie une margeAvantDescente nulle quand le Palier n’est validé qu’à la limite stricte du seuil', () => {
      const niveaux = [
        ...(Array(4).fill(1) as number[]),
        ...(Array(6).fill(2) as number[]),
      ];

      const resultat = scoring.calculerPalier(niveaux, 0.6);

      // part(≥2) = 6/10 = 0.6, exactement le seuil : Palier 2 validé, mais sans aucune marge.
      expect(resultat).toEqual({
        effectif: 10,
        palier: 2,
        tauxApproche: 0,
        margeAvantDescente: 0,
      });
    });

    it('renvoie une margeAvantDescente nulle quand le seuil est de 100% (division par zéro évitée)', () => {
      const niveaux = [4, 4, 4, 4];

      const resultat = scoring.calculerPalier(niveaux, 1);

      expect(resultat).toEqual({
        effectif: 4,
        palier: 4,
        tauxApproche: null,
        margeAvantDescente: 0,
      });
    });
  });

  describe('calculerMoyenne', () => {
    it('calcule la moyenne arithmétique des Niveaux', () => {
      expect(scoring.calculerMoyenne([1, 2, 3, 4])).toBe(2.5);
    });

    it('renvoie null sur une population vide', () => {
      expect(scoring.calculerMoyenne([])).toBeNull();
    });
  });

  describe('calculerDispersion', () => {
    it('renvoie FORT quand toutes les réponses sont identiques', () => {
      expect(scoring.calculerDispersion([3, 3, 3, 3])).toBe('FORT');
    });

    it('renvoie FORT pour un seul votant (écart-type nul)', () => {
      expect(scoring.calculerDispersion([2])).toBe('FORT');
    });

    it('renvoie MODERE pour un désaccord modéré', () => {
      // Écart-type = 0.866, entre SEUIL_CONSENSUS_FORT (0.5) et SEUIL_CONSENSUS_MODERE (1.0).
      expect(scoring.calculerDispersion([2, 2, 2, 4])).toBe('MODERE');
    });

    it('renvoie FAIBLE pour un désaccord fort (bimodal 1/4)', () => {
      expect(scoring.calculerDispersion([1, 1, 4, 4])).toBe('FAIBLE');
    });

    it('renvoie null sur une population vide', () => {
      expect(scoring.calculerDispersion([])).toBeNull();
    });
  });

  describe('periodeContenant', () => {
    it('borne une Période mensuelle sur le mois civil de la date', () => {
      const periode = scoring.periodeContenant(
        new Date('2026-04-15T00:00:00Z'),
        1,
      );

      expect(periode).toEqual({
        debut: new Date('2026-04-01T00:00:00Z'),
        fin: new Date('2026-05-01T00:00:00Z'),
      });
    });

    it('borne une Période trimestrielle alignée sur l’époque de référence', () => {
      // Époque = 2000-01-01 (UTC), trimestres alignés dessus : Jan-Mar, Avr-Juin, Juil-Sept, Oct-Déc.
      const periode = scoring.periodeContenant(
        new Date('2026-05-20T00:00:00Z'),
        3,
      );

      expect(periode).toEqual({
        debut: new Date('2026-04-01T00:00:00Z'),
        fin: new Date('2026-07-01T00:00:00Z'),
      });
    });

    it('place le tout premier instant d’une Période dans cette Période (borne incluse)', () => {
      const periode = scoring.periodeContenant(
        new Date('2026-04-01T00:00:00Z'),
        1,
      );

      expect(periode.debut).toEqual(new Date('2026-04-01T00:00:00Z'));
    });

    it('place l’instant frontière entre deux Périodes dans la Période suivante (borne fin exclue)', () => {
      const periode = scoring.periodeContenant(
        new Date('2026-05-01T00:00:00Z'),
        1,
      );

      expect(periode).toEqual({
        debut: new Date('2026-05-01T00:00:00Z'),
        fin: new Date('2026-06-01T00:00:00Z'),
      });
    });
  });

  describe('periodePrecedente', () => {
    it('renvoie la Période mensuelle contiguë précédente', () => {
      const periode: Periode = {
        debut: new Date('2026-04-01T00:00:00Z'),
        fin: new Date('2026-05-01T00:00:00Z'),
      };

      const precedente = scoring.periodePrecedente(periode, 1);

      expect(precedente).toEqual({
        debut: new Date('2026-03-01T00:00:00Z'),
        fin: new Date('2026-04-01T00:00:00Z'),
      });
    });

    it('renvoie la Période trimestrielle contiguë précédente', () => {
      const periode: Periode = {
        debut: new Date('2026-04-01T00:00:00Z'),
        fin: new Date('2026-07-01T00:00:00Z'),
      };

      const precedente = scoring.periodePrecedente(periode, 3);

      expect(precedente).toEqual({
        debut: new Date('2026-01-01T00:00:00Z'),
        fin: new Date('2026-04-01T00:00:00Z'),
      });
    });

    it('la fin de la Période précédente est le début de la Période donnée (contiguïté)', () => {
      const periode = scoring.periodeContenant(
        new Date('2026-05-20T00:00:00Z'),
        3,
      );

      const precedente = scoring.periodePrecedente(periode, 3);

      expect(precedente.fin).toEqual(periode.debut);
    });
  });

  describe('pourcentageVersFraction', () => {
    it('convertit un pourcentage entier en fraction', () => {
      expect(scoring.pourcentageVersFraction(60)).toBe(0.6);
    });
  });
});
