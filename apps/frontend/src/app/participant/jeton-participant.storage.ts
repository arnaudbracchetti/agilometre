import { Injectable } from '@angular/core';

export interface JetonParticipant {
  sessionId: string;
  jeton: string;
}

const CLE_STOCKAGE = 'agilometre.jetonParticipant';

/**
 * Enveloppe localStorage (aucun autre usage dans le repo) pour rester mockable en spec, comme le
 * reste de l'I/O de ce projet. Le Jeton de session est scope toute la Session (ADR-0011) : un seul
 * enregistrement à la fois, remplacé sans fusion à chaque nouvelle jointure.
 */
@Injectable({ providedIn: 'root' })
export class JetonParticipantStorage {
  obtenir(): JetonParticipant | null {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) {
      return null;
    }
    try {
      return JSON.parse(brut) as JetonParticipant;
    } catch {
      return null;
    }
  }

  enregistrer(sessionId: string, jeton: string): void {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ sessionId, jeton }));
  }
}
