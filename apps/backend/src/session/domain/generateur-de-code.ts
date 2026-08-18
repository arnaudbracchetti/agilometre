/**
 * Port : la Session a besoin d'un Code pour s'ouvrir, sans rien savoir de la façon dont il est
 * produit. L'unicité parmi les Sessions OUVERTE fait partie du contrat de ce port, jamais de la
 * responsabilité de l'appelant — c'est ce qui permet à `Session.ouvrir()` de rester une expression
 * du besoin métier, sans paramètre technique.
 */
export interface GenerateurDeCode {
  /** Rend un Code garanti utilisable — jamais déjà pris par une Session OUVERTE. */
  generer(): Promise<string>;
}
