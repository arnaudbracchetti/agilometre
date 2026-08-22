/**
 * Port "source de Réponses scorables" (ADR-0018) : `scoring/` reste ignorant de l'origine des
 * Réponses (Session aujourd'hui, Pouls plus tard). Un `ReponseScorable` par Réponse individuelle —
 * la représentation la plus neutre vis-à-vis de l'origine, symétrique de l'agrégat `Reponse` de
 * `reponse/`.
 */
export interface ReponseScorable {
  questionId: string;
  niveau: number;
}

export interface SourceReponsesScorables {
  obtenirReponsesScorables(): Promise<ReponseScorable[]>;
}
