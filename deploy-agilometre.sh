#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Script de deploiement - Agilometre (VPS production)
#
# Usage : ./deploy-agilometre.sh <tag>          (ex. ./deploy-agilometre.sh v0.1.1)
#
# Automatise la procedure documentee dans docs/deploy-generic.md #4 :
#   1. Memorise le tag actuellement deploye (pour un rollback eventuel)
#   2. Met a jour IMAGE_TAG dans /opt/agilometre/.env
#   3. Pull la nouvelle image de l'app (et postgres, sans changement de version)
#   4. Redemarre les conteneurs (up -d) - les migrations Prisma s'appliquent
#      seules au demarrage du conteneur app
#   5. Attend que les 2 services (app + database) soient "healthy"
#   6. Si le healthy n'arrive jamais dans le delai imparti : rollback
#      automatique vers le tag precedent, pull+up dessus, reverification.
#
# Ne construit JAMAIS rien sur le VPS (pas de --build) - l'image est
# deja publiee par la CI GitHub Actions (.github/workflows/publish.yml),
# ce script ne fait que pull/up sur une image existante.
#
# Ne declenche pas de "caddy reload" : la config Caddy elle-meme ne change
# pas a chaque mise a jour applicative (uniquement necessaire pour un
# premier deploiement ou un changement du fichier .caddy, cf. doc).
# ============================================================

APP_DIR="/opt/agilometre"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="$APP_DIR/.env"
HEALTH_TIMEOUT=120   # secondes max d'attente du "healthy"
HEALTH_INTERVAL=5    # secondes entre deux verifications

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
step() { echo ""; echo -e "${CYAN}>> $1${NC}"; }
ok()   { echo -e "${GREEN}   OK : $1${NC}"; }
err()  { echo -e "${RED}   ERREUR : $1${NC}"; }
warn() { echo -e "${YELLOW}   ATTENTION : $1${NC}"; }

# ── 1. Validation des arguments et de l'environnement ──────────────
if [ $# -ne 1 ]; then
  err "Usage : $0 <tag>  (ex. $0 v0.1.1)"
  exit 1
fi
NEW_TAG="$1"

if [[ ! "$NEW_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  err "Le tag doit suivre le format vX.Y.Z (recu : '$NEW_TAG')"
  exit 1
fi

cd "$APP_DIR" 2>/dev/null || { err "Repertoire $APP_DIR introuvable"; exit 1; }
[ -f "$ENV_FILE" ] || { err "$ENV_FILE introuvable"; exit 1; }
[ -f "$COMPOSE_FILE" ] || { err "$COMPOSE_FILE introuvable dans $APP_DIR"; exit 1; }

# ── 2. Memoriser le tag actuellement deploye (cible du rollback) ───
PREVIOUS_TAG="$(grep -oP '^IMAGE_TAG=\K.*' "$ENV_FILE" || true)"
if [ -z "$PREVIOUS_TAG" ]; then
  warn "Aucun IMAGE_TAG trouve dans $ENV_FILE - rollback automatique indisponible si l'etape suivante echoue"
fi

if [ "$NEW_TAG" == "$PREVIOUS_TAG" ]; then
  warn "Le tag $NEW_TAG est deja celui actuellement deploye."
  read -rp "Continuer quand meme (pull/up force) ? [o/N] " CONFIRM
  [[ "$CONFIRM" =~ ^[oO]$ ]] || { echo "Annule."; exit 0; }
fi

step "Deploiement de $NEW_TAG (version actuelle : ${PREVIOUS_TAG:-inconnue})"

# ── 3. Fonctions reutilisables (deploiement direct ET rollback) ────
deploy_tag() {
  local tag="$1"
  cp "$ENV_FILE" "$ENV_FILE.bak"
  if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then
    sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$tag/" "$ENV_FILE"
  else
    echo "IMAGE_TAG=$tag" >> "$ENV_FILE"
  fi

  docker compose -f "$COMPOSE_FILE" pull
  docker compose -f "$COMPOSE_FILE" up -d
}

wait_healthy() {
  local elapsed=0
  while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
    local total unhealthy
    total="$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Health}}' | wc -l)"
    unhealthy="$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Health}}' | grep -vc '^healthy$' || true)"
    if [ "$total" -gt 0 ] && [ "$unhealthy" -eq 0 ]; then
      return 0
    fi
    sleep "$HEALTH_INTERVAL"
    elapsed=$((elapsed + HEALTH_INTERVAL))
    echo "   ... en attente du healthy (${elapsed}s/${HEALTH_TIMEOUT}s)"
  done
  return 1
}

# ── 4. Deploiement de la nouvelle version + verification ───────────
deploy_tag "$NEW_TAG"

step "Attente du healthcheck (max ${HEALTH_TIMEOUT}s)"
if wait_healthy; then
  ok "Tous les conteneurs sont healthy - deploiement de $NEW_TAG reussi"
  rm -f "$ENV_FILE.bak"
  exit 0
fi

# ── 5. Echec : rollback automatique vers la version precedente ─────
err "Healthcheck en echec apres ${HEALTH_TIMEOUT}s pour $NEW_TAG"
echo ""
echo "----- Dernieres lignes de logs (app) -----"
docker compose -f "$COMPOSE_FILE" logs --tail=50 app || true
echo "---------------------------------------------------------"

if [ -z "$PREVIOUS_TAG" ]; then
  err "Pas de tag precedent connu - rollback automatique impossible."
  err "Intervention manuelle requise sur le VPS (verifier IMAGE_TAG et les logs ci-dessus)."
  exit 1
fi

warn "Rollback automatique vers la version precedente : $PREVIOUS_TAG"
deploy_tag "$PREVIOUS_TAG"

if wait_healthy; then
  ok "Rollback vers $PREVIOUS_TAG reussi - le service est de nouveau sain"
  err "Le deploiement de $NEW_TAG a echoue et a ete annule. Voir les logs ci-dessus avant de reessayer."
  exit 1
else
  err "CRITIQUE : le rollback vers $PREVIOUS_TAG a lui aussi echoue son healthcheck."
  err "Intervention manuelle requise IMMEDIATEMENT sur le VPS."
  exit 2
fi
