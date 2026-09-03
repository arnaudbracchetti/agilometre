export type CleTemplateEmail = 'compte.invitation' | 'compte.mot-de-passe-oublie';

// Liste maintenue à la main (#65) : une clé mal orthographiée est une erreur de compilation,
// jamais un incident à l'exécution.
export const CLES_TEMPLATES_EMAIL_ATTENDUES: readonly CleTemplateEmail[] = [
  'compte.invitation',
  'compte.mot-de-passe-oublie',
];
