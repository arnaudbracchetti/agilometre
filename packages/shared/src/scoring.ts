/** Niveau porté par une option de réponse, 1 à 4. */
export type Niveau = 1 | 2 | 3 | 4;

export enum OrigineReponse {
  Session = 'SESSION',
  Pouls = 'POULS',
}

export enum StatutSession {
  Preparee = 'PREPAREE',
  Ouverte = 'OUVERTE',
  Cloturee = 'CLOTUREE',
}

/** Résultat du moteur de scoring pour un ensemble de réponses filtré. */
export interface ResultatScoring {
  palier: Niveau;
  tauxApproche: number;
  effectif: number;
}
