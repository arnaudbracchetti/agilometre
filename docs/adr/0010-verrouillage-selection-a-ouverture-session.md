---
status: accepted
---

# Verrouillage de la Sélection dès l'ouverture de la Session, pas au premier Tour de vote

La Sélection d'une Session se verrouille (`Session.verrouillee = true`) au moment où le Coach
ouvre la Session (génération du Code) — pas à l'ouverture du premier Tour de vote comme le
supposait la première rédaction de
[doc/spec/annexes/modeles-de-session.md](../../doc/spec/annexes/modeles-de-session.md). Entre
ces deux instants, des Membres peuvent déjà avoir rejoint via le Code et être en train
d'observer la salle d'attente projetée ; le Coach ne doit plus pouvoir modifier ce que ces
participants s'apprêtent à voir. Verrouiller à l'ouverture fait porter l'engagement du Coach sur
sa Sélection au moment où elle devient visible depuis l'extérieur, pas au moment où le premier
vote est techniquement possible.

**Conséquence.** Une fois ouverte, la Sélection n'accepte plus aucune édition (ajout, retrait,
réordonnancement) ; la seule action encore permise sur une Question restante est de la marquer
Sautée (voir [CONTEXT.md](../../CONTEXT.md), "Sauter").
