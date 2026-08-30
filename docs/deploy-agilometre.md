# Déployer agilomètre en production

> Ce fichier documente le déploiement **spécifique à agilomètre**. Les principes partagés du
> serveur (stack Caddy "edge" mutualisé, isolation par application, images publiées en CI puis
> seulement "pull"-ées sur le serveur, aucun port publié hors edge) sont documentés une fois pour
> toutes dans [`docs/deploy-generic.md`](./deploy-generic.md) - à lire d'abord si ces principes ne
> sont pas déjà familiers. Ce document ne les répète pas, il donne les valeurs et commandes
> concrètes propres à cette application.

## 1. Ce qui est spécifique à agilomètre

Contrairement au squelette générique (qui suppose un service `backend` et un service `frontend`
séparés), agilomètre tourne en **un seul conteneur** : le backend NestJS sert aussi le build
Angular en fichiers statiques (`ServeStaticModule`, cf. `apps/backend/src/app.module.ts`). Il n'y a
donc qu'un seul service applicatif exposé à Caddy.

| Élément | Valeur |
|---|---|
| Domaine public | `agilometre.nekbet.fr` |
| Dossier sur le serveur | `/opt/agilometre` |
| Image Docker | `ghcr.io/arnaudbracchetti/agilometre-app` |
| Fichier compose | `docker-compose.prod.yml` (racine du dépôt) |
| Fichier de site Caddy | `agilometre.caddy` (racine du dépôt) → `/opt/edge/sites/agilometre.caddy` |
| Alias sur `edge_net` | `agilometre-app` |
| Réseau DB interne | `agilometre_db_net` |
| Script de mise à jour | `deploy-agilometre.sh` (racine du dépôt) → `~/deploy-agilometre.sh` sur le serveur, **à la racine du compte `deploy`**, jamais dans `/opt/agilometre` (le script y fait lui-même `cd`, peu importe d'où il est appelé) |
| Workflow CI de publication | `.github/workflows/publish.yml`, déclenché sur tag `v*.*.*` |

Points de comportement propres à cette application, à connaître avant toute intervention :

- **Migrations Prisma automatiques** : le conteneur `app` exécute `prisma migrate deploy` avant de
  démarrer le serveur Nest (voir le `CMD` du `Dockerfile`). C'est idempotent et protégé par un
  verrou consultatif Postgres - aucune étape manuelle à faire, à chaque déploiement comme à chaque
  mise à jour. Une migration qui échoue empêche le conteneur de démarrer (voir §4).
- **Healthcheck** : `GET /api/health` (un `SELECT 1` via Prisma). Docker sonde toutes les 5s après
  un délai de grâce de 30s au démarrage (le temps que la migration + le bootstrap Nest se
  terminent).
- **Utilisateur non-root** : le conteneur tourne en `node` (uid 1000), jamais en root.
- **Arrêt propre** : le process Node est PID 1 dans le conteneur (`exec` dans le `CMD`) et
  `app.enableShutdownHooks()` est activé côté Nest - un `docker compose stop`/redéploiement ferme
  les connexions proprement au lieu d'un `SIGKILL` après le délai de grâce.

## 2. Premier déploiement (une seule fois)

Prérequis : le stack edge est déjà en place sur ce serveur (`docs/deploy-generic.md` §2 déjà fait,
rien à refaire ici).

1. **DNS** : créer un enregistrement `agilometre.nekbet.fr` (type A) vers l'IP du serveur.

2. **Dossier serveur** :
   ```bash
   ssh deploy@<ip-serveur> "sudo mkdir -p /opt/agilometre && sudo chown deploy:deploy /opt/agilometre"
   ```

3. **Copier les fichiers**, depuis la racine du dépôt en local :
   ```bash
   scp docker-compose.prod.yml deploy@<ip-serveur>:/opt/agilometre/

   # deploy-agilometre.sh va À LA RACINE DU COMPTE deploy (~), jamais dans /opt/agilometre :
   # le script fait lui-même `cd /opt/agilometre` en première ligne, donc peu importe d'où il
   # est invoqué - le garder dans le home du compte le rend disponible partout, y compris avant
   # que /opt/agilometre n'existe.
   scp deploy-agilometre.sh deploy@<ip-serveur>:~/
   ssh deploy@<ip-serveur> "chmod +x ~/deploy-agilometre.sh"

   sed "s/__PUBLIC_DOMAIN__/agilometre.nekbet.fr/" agilometre.caddy \
     | ssh deploy@<ip-serveur> "cat > /opt/edge/sites/agilometre.caddy"
   ```

4. **Secrets** : créer `/opt/agilometre/.env` sur le serveur à partir de `.env.prod.example`
   (jamais committé), avec de vrais secrets - `JWT_SECRET` fort, mot de passe Postgres fort, SMTP
   réel du client - puis :
   ```bash
   chmod 600 /opt/agilometre/.env
   ```

5. **Premier tag** (si pas déjà fait) :
   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```
   Vérifier que `publish.yml` réussit sur GitHub (build + push de l'image).

6. **Rendre le paquet GHCR public** : un paquet fraîchement publié est privé par défaut,
   indépendamment de la visibilité du dépôt GitHub. Sans ça, l'étape suivante échoue avec un accès
   refusé. À faire une seule fois, dans les paramètres du paquet `agilometre-app` sur GitHub.

7. **Déployer** :
   ```bash
   cd /opt/agilometre
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   docker compose -f docker-compose.prod.yml ps      # attendu : tout "healthy"

   docker compose -f /opt/edge/docker-compose.yml exec caddy \
     caddy reload --config /etc/caddy/Caddyfile
   ```

8. **Amorcer le premier compte Coach** : un agilomètre fraîchement déployé n'a aucun compte —
   toutes les routes (hors écran d'accueil et parcours participants) exigent désormais une
   connexion (issue #59). Ce premier compte naît d'une commande explicite, jamais d'un seed
   automatique au démarrage. Le menu étant interactif (saisie du mot de passe), se connecter
   d'abord plutôt que de l'invoquer en une seule commande `ssh` distante (qui n'alloue pas de
   pseudo-terminal par défaut) :
   ```bash
   ssh deploy@<ip-serveur>
   ~/deploy-agilometre.sh   # menu → option 3, "Amorcer un compte Coach"
   ```
   Le menu demande email/prénom/nom, puis le mot de passe deux fois (jamais affiché en clair) —
   voir le détail dans `deploy-agilometre.sh` (`action_amorcer_coach`, appelle
   `docker compose exec app node dist/src/bootstrap-coach.js` : aucun appel réseau). Conserver
   l'email et le mot de passe : le Coach n'a aucun moyen de réinitialiser son propre compte sans un
   accès existant (tranche 2, mot de passe oublié, pas encore livrée à ce stade).

9. **Importer le référentiel initial** : sans cette étape, aucune équipe ne peut voter.
   `apps/backend/referentiel_questions/` est le seul fichier YAML canonique du Référentiel (les
   autres fragments/versions précédentes doivent être supprimés du répertoire, jamais laissés à
   côté - voir l'avertissement ci-dessous). Copier le fichier dans le home du compte `deploy` (pas
   besoin qu'il soit dans `/opt/agilometre` - le menu en demande le chemin), puis :
   ```bash
   scp apps/backend/referentiel_questions/question_axe_1-4.yaml deploy@<ip-serveur>:~/referentiel.yaml
   ssh deploy@<ip-serveur>
   ~/deploy-agilometre.sh   # menu → option 2, "Importer le Referentiel"
   ```
   Le menu demande le chemin du fichier, affiche l'aperçu (`ChangeSet`) puis demande confirmation
   avant d'écrire quoi que ce soit (`action_importer_referentiel`, appelle
   `docker compose exec app node dist/src/import-referentiel-cli.js` directement — aucun appel
   HTTP, aucun jeton Coach nécessaire).

   Import depuis un poste **sans accès SSH** au serveur : `scripts/import-referentiel.sh` reste
   disponible séparément, par HTTP, avec un jeton Coach obtenu via `POST /api/auth/login` — voir
   l'en-tête de ce script pour l'usage exact.

   ⚠️ **Chaque appel remplace tout le Référentiel, il ne le complète jamais.**
   `Referentiel.calculerChangements` archive toute Question absente du fichier importé - importer
   un second fichier après coup (même partiel) archiverait tout ce qui n'y figure pas. S'il existe
   plusieurs fichiers `.yaml` dans `referentiel_questions/`, ce n'est jamais correct d'appeler ce
   script une fois par fichier : n'en garder qu'un seul, complet, comme unique source de vérité.
   Un import répété du même fichier plus tard (ex. lors d'une mise à jour, §3) est sans effet tant
   que son contenu n'a pas changé.

10. **Vérifications** (cf. `docs/deploy-generic.md` §3.4) :
   - `docker compose exec app id` → utilisateur non-root
   - `curl -I http://agilometre.nekbet.fr` → `308`
   - `curl -I https://agilometre.nekbet.fr` → en-têtes de sécurité + certificat Let's Encrypt valide
   - Passe fonctionnelle manuelle sur le site réel, incluant la création d'une session et un tour
     de vote (nécessite l'import du référentiel à l'étape précédente)

## 3. Mettre à jour une version déjà déployée

```bash
git tag vX.Y.Z && git push origin vX.Y.Z    # déclenche publish.yml
```

Vérifier que la CI réussit, puis sur le serveur (`deploy-agilometre.sh` vit à la racine du compte
`deploy`, pas dans `/opt/agilometre` - le script y fait lui-même `cd`) :

```bash
ssh deploy@<ip-serveur>
~/deploy-agilometre.sh vX.Y.Z
```

Sans argument, `~/deploy-agilometre.sh` ouvre un menu (déployer / importer le Référentiel /
amorcer un compte Coach, voir étapes 8 et 9 ci-dessus) — son option 1 demande le tag puis fait
exactement la même chose que `~/deploy-agilometre.sh vX.Y.Z`.

Le script fait tout le reste automatiquement :
- met à jour `IMAGE_TAG` dans `.env` (garde une sauvegarde `.env.bak` le temps du déploiement),
- `pull` puis `up -d`,
- attend jusqu'à 120s que les 2 services (`app` + `database`) soient `healthy`,
- si le healthcheck n'arrive jamais (y compris à cause d'une migration Prisma en échec, qui
  empêche `app` de démarrer) : rollback automatique vers le tag précédent, avec ré-vérification.

Pas de `caddy reload` à cette étape : la config Caddy ne change pas à chaque mise à jour
applicative (uniquement nécessaire au premier déploiement ou si `agilometre.caddy` change).

## 4. Dépannage spécifique à agilomètre

| Symptôme | Cause probable | Correctif |
|---|---|---|
| `docker compose pull` échoue avec accès refusé | Paquet GHCR encore privé | Passer `agilometre-app` en public dans les paramètres GitHub (étape 2.6) |
| Conteneur `app` en boucle de redémarrage (`Restarting`) | `prisma migrate deploy` échoue au démarrage (migration invalide, base injoignable) | `docker compose logs app` - le message d'erreur Prisma apparaît avant tout log Nest |
| `docker compose exec app id` renvoie `root` | Image construite avant l'ajout de `USER node` au `Dockerfile` | Reconstruire/republier l'image depuis la version courante du `Dockerfile` |
| Le site répond mais les assets statiques (CSS/JS) sont en 404 | `apps/backend/public` absent de l'image (build frontend qui a échoué silencieusement) | Vérifier les logs du job `publish.yml` sur GitHub, étape de build frontend |
| Pour tout le reste (Caddy, DNS, TLS, réseaux Docker) | Générique à toutes les applications de ce serveur | Voir le tableau de `docs/deploy-generic.md` §6 |

## 5. Hors périmètre (à traiter séparément)

Aucune sauvegarde automatisée de la base Postgres n'est en place à ce stade. Le volume Docker
nommé (`db_data`) survit à un `down`/`up`/mise à jour d'image, mais pas à un disque de serveur qui
meurt. À couvrir (ex. `pg_dump` régulier avec sortie hors du serveur) avant d'avoir de vraies
données client en production.
