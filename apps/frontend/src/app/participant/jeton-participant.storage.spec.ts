import { TestBed } from '@angular/core/testing';
import { JetonParticipantStorage } from './jeton-participant.storage';

describe('JetonParticipantStorage', () => {
  let storage: JetonParticipantStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    storage = TestBed.inject(JetonParticipantStorage);
  });

  it('renvoie null si aucun Jeton n’a été enregistré', () => {
    expect(storage.obtenir()).toBeNull();
  });

  it('relit le Jeton enregistré (round-trip)', () => {
    storage.enregistrer('s1', 'jeton-abc');

    expect(storage.obtenir()).toEqual({ sessionId: 's1', jeton: 'jeton-abc' });
  });

  it('écrase un Jeton déjà présent lors d’une nouvelle jointure', () => {
    storage.enregistrer('s1', 'jeton-abc');

    storage.enregistrer('s2', 'jeton-def');

    expect(storage.obtenir()).toEqual({ sessionId: 's2', jeton: 'jeton-def' });
  });
});
