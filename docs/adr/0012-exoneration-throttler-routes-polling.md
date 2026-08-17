---
status: accepted
---

# Exonération du throttler sur les routes de sondage de la séance animée

`app.module.ts` enregistre un `ThrottlerGuard` global à 100 requêtes/minute, compté **par IP**.
Les trois écrans de la séance animée se synchronisent par sondage HTTP (PRD §10 — websockets
écartés pour la robustesse derrière les proxies d'entreprise) : le participant sonde à 1 s, la
projection et le pilotage à 2 s. Or en salle de réunion, tous les devices sortent derrière la
**même IP publique** (NAT d'entreprise) : huit participants suffisent à produire 480 req/min sur
une seule IP, soit près de cinq fois la limite — le sondage serait coupé en pleine séance,
précisément dans l'environnement cible du produit.

**Décision.** Les trois points de lecture live (`/api/participant/moi`,
`/api/projection/:sessionId`, `/api/sessions/:id/pilotage`) sont exonérés du throttler global
(`@SkipThrottle`, ou limite dédiée nettement plus haute). Le throttler global reste inchangé
pour **tout le reste**, y compris la jointure par Code et le vote — les routes où un abus aurait
un effet métier.

**Pourquoi c'est acceptable.** Ces trois routes sont en lecture seule, sans effet de bord, et
peu coûteuses (une requête indexée, le plus souvent close par une réponse sans corps grâce à
l'ETag — voir [ADR-0013](0013-etag-plutot-que-compteur-de-revision.md)). Un abus
ne peut ni altérer une Session, ni fausser un score, ni révéler autre chose que ce que l'écran
concerné a déjà le droit d'afficher.

**Alternatives écartées.** Un tracker personnalisé indexé sur le Jeton de session plutôt que sur
l'IP aurait préservé une protection par device derrière le NAT, au prix d'un `ThrottlerGuard`
sur mesure à écrire et maintenir pour un bénéfice nul sur des routes sans effet de bord. Relever
la limite globale aurait affaibli la protection sur toutes les autres routes, écritures
comprises.

**Conséquence à ne pas « corriger ».** Un lecteur qui découvre `@SkipThrottle` sur ces routes
pourrait le prendre pour un oubli ou un trou de sécurité : c'est un choix délibéré, motivé par
le NAT d'entreprise, et le retirer casserait le produit en séance réelle sans le casser en
développement (où chaque device a une IP distincte).
