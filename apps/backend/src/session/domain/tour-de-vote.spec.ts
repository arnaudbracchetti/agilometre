import { Participation } from './participation';
import { TourDeVote } from './tour-de-vote';

describe('TourDeVote', () => {
  const OUVERT_LE = new Date('2026-04-01T10:00:00Z');

  describe('creer', () => {
    it('accepte numero=1 pour le premier Tour d’une Question (pas de précédent)', () => {
      const resultat = TourDeVote.creer('t1', 's1', 'q1', 1, OUVERT_LE, null);

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.numero).toBe(1);
      expect(resultat.valeur.estClos).toBe(false);
    });

    it('accepte numero = précédent + 1 (revote)', () => {
      const resultat = TourDeVote.creer('t2', 's1', 'q1', 2, OUVERT_LE, 1);

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.numero).toBe(2);
    });

    it('rejette un numero qui ne suit pas strictement le précédent', () => {
      const resultat = TourDeVote.creer('t2', 's1', 'q1', 3, OUVERT_LE, 1);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('NumeroTourInvalideError');
    });

    it('rejette numero=2 quand il n’y a pas de précédent', () => {
      const resultat = TourDeVote.creer('t1', 's1', 'q1', 2, OUVERT_LE, null);

      expect(resultat.estEchec).toBe(true);
    });
  });

  describe('clore', () => {
    it('clôture un Tour ouvert', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;

      const resultat = tour.clore(new Date('2026-04-01T10:05:00Z'));

      expect(resultat.estSucces).toBe(true);
      expect(tour.estClos).toBe(true);
    });

    it('refuse de clôturer un Tour déjà clos', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;
      tour.clore(new Date('2026-04-01T10:05:00Z'));

      const resultat = tour.clore(new Date('2026-04-01T10:06:00Z'));

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('TourDejaClosError');
    });

    it('purge les Participation en mémoire, jamais les Reponse', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;
      tour.voter('jeton-1', 'r1', 3, 'equipe-1', OUVERT_LE);

      tour.clore(new Date('2026-04-01T10:05:00Z'));

      expect(tour.participations).toHaveLength(0);
    });
  });

  describe('voter', () => {
    it('crée une nouvelle Participation pour un Jeton inconnu', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;

      const resultat = tour.voter('jeton-1', 'r1', 3, 'equipe-1', OUVERT_LE);

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.reponse.niveau).toBe(3);
      expect(resultat.valeur.reponse.tourId).toBe('t1');
      expect(resultat.valeur.reponseASupprimer).toBeNull();
      expect(tour.participations).toHaveLength(1);
      expect(tour.voteDe('jeton-1')?.reponseId).toBe('r1');
    });

    it('un revote repointe la Participation existante sans la dupliquer', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;
      tour.voter('jeton-1', 'r1', 3, 'equipe-1', OUVERT_LE);

      const resultat = tour.voter('jeton-1', 'r2', 1, 'equipe-1', OUVERT_LE);

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.reponseASupprimer).toBe('r1');
      expect(tour.participations).toHaveLength(1);
      expect(tour.voteDe('jeton-1')?.reponseId).toBe('r2');
    });

    it('refuse de voter sur un Tour clos', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;
      tour.clore(new Date('2026-04-01T10:05:00Z'));

      const resultat = tour.voter('jeton-1', 'r1', 3, 'equipe-1', OUVERT_LE);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('TourDejaClosError');
    });

    it('propage un niveau invalide plutôt que de créer une Reponse', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;

      const resultat = tour.voter('jeton-1', 'r1', 5, 'equipe-1', OUVERT_LE);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('NiveauInvalideError');
      expect(tour.participations).toHaveLength(0);
    });
  });

  describe('voteDe', () => {
    it('renvoie null pour un Jeton qui n’a pas voté', () => {
      const tour = TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        OUVERT_LE,
        null,
      ).valeur;

      expect(tour.voteDe('inconnu')).toBeNull();
    });
  });

  describe('reconstituer', () => {
    it('recharge les Participation fournies sans revalider le numero', () => {
      const participation = Participation.creer('t1', 'jeton-1', 'r1');

      const tour = TourDeVote.reconstituer(
        't1',
        's1',
        'q1',
        7,
        OUVERT_LE,
        null,
        [participation],
      );

      expect(tour.numero).toBe(7);
      expect(tour.participations).toHaveLength(1);
    });
  });
});
