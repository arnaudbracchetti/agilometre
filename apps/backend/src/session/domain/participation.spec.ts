import { Participation } from './participation';

describe('Participation', () => {
  it('creer porte tourId/jetonId/reponseId', () => {
    const participation = Participation.creer('tour-1', 'jeton-1', 'reponse-1');

    expect(participation.tourId).toBe('tour-1');
    expect(participation.jetonId).toBe('jeton-1');
    expect(participation.reponseId).toBe('reponse-1');
  });

  it('reconstituer recharge à l’identique, sans revalidation', () => {
    const participation = Participation.reconstituer(
      'tour-1',
      'jeton-1',
      'reponse-1',
    );

    expect(participation.reponseId).toBe('reponse-1');
  });

  it('remplacerReponse change la Reponse pointée, jamais tourId/jetonId', () => {
    const participation = Participation.creer('tour-1', 'jeton-1', 'reponse-1');

    participation.remplacerReponse('reponse-2');

    expect(participation.reponseId).toBe('reponse-2');
    expect(participation.tourId).toBe('tour-1');
    expect(participation.jetonId).toBe('jeton-1');
  });
});
