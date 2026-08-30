#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Script d'exploitation - Agilometre (VPS production)
#
# Usage :
#   ./deploy-agilometre.sh <tag>   deploiement direct (ex. ./deploy-agilometre.sh v0.1.1)
#   ./deploy-agilometre.sh         menu interactif (deployer / importer le Referentiel /
#                                  amorcer un compte Coach)
#
# Deploiement (option 1 du menu, ou usage direct avec un tag), automatise la procedure
# documentee dans docs/deploy-generic.md #4 :
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
#
# Import du Referentiel et amorcage du Coach (options 2 et 3 du menu) appellent des scripts Node
# deja presents dans l'image (dist/src/import-referentiel-cli.js, dist/src/bootstrap-coach.js) via
# "docker compose exec" - aucun appel HTTP, aucun jeton necessaire (issue #59).
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

# ── 0. Verifications d'environnement, communes aux 3 actions ───────
cd "$APP_DIR" 2>/dev/null || { err "Repertoire $APP_DIR introuvable"; exit 1; }
[ -f "$ENV_FILE" ] || { err "$ENV_FILE introuvable"; exit 1; }
[ -f "$COMPOSE_FILE" ] || { err "$COMPOSE_FILE introuvable dans $APP_DIR"; exit 1; }

# ── Fonctions reutilisables (deploiement direct ET rollback) ───────
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

# ── Action 1 : deployer une version ─────────────────────────────────
action_deployer() {
  local new_tag="${1:-}"
  if [ -z "$new_tag" ]; then
    read -rp "Tag a deployer (ex: v1.2.3) : " new_tag
  fi

  if [[ ! "$new_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    err "Le tag doit suivre le format vX.Y.Z (recu : '$new_tag')"
    return 1
  fi

  local previous_tag
  previous_tag="$(grep -oP '^IMAGE_TAG=\K.*' "$ENV_FILE" || true)"
  if [ -z "$previous_tag" ]; then
    warn "Aucun IMAGE_TAG trouve dans $ENV_FILE - rollback automatique indisponible si l'etape suivante echoue"
  fi

  if [ "$new_tag" == "$previous_tag" ]; then
    warn "Le tag $new_tag est deja celui actuellement deploye."
    local confirm
    read -rp "Continuer quand meme (pull/up force) ? [o/N] " confirm
    [[ "$confirm" =~ ^[oO]$ ]] || { echo "Annule."; return 0; }
  fi

  step "Deploiement de $new_tag (version actuelle : ${previous_tag:-inconnue})"
  deploy_tag "$new_tag"

  step "Attente du healthcheck (max ${HEALTH_TIMEOUT}s)"
  if wait_healthy; then
    ok "Tous les conteneurs sont healthy - deploiement de $new_tag reussi"
    rm -f "$ENV_FILE.bak"
    return 0
  fi

  err "Healthcheck en echec apres ${HEALTH_TIMEOUT}s pour $new_tag"
  echo ""
  echo "----- Dernieres lignes de logs (app) -----"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 app || true
  echo "---------------------------------------------------------"

  if [ -z "$previous_tag" ]; then
    err "Pas de tag precedent connu - rollback automatique impossible."
    err "Intervention manuelle requise sur le VPS (verifier IMAGE_TAG et les logs ci-dessus)."
    return 1
  fi

  warn "Rollback automatique vers la version precedente : $previous_tag"
  deploy_tag "$previous_tag"

  if wait_healthy; then
    ok "Rollback vers $previous_tag reussi - le service est de nouveau sain"
    err "Le deploiement de $new_tag a echoue et a ete annule. Voir les logs ci-dessus avant de reessayer."
    return 1
  else
    err "CRITIQUE : le rollback vers $previous_tag a lui aussi echoue son healthcheck."
    err "Intervention manuelle requise IMMEDIATEMENT sur le VPS."
    return 2
  fi
}

# ── Action 2 : importer le Referentiel (hors HTTP, aucun jeton) ────
action_importer_referentiel() {
  local fichier_yaml
  read -rp "Chemin du fichier YAML a importer : " fichier_yaml
  if [ ! -f "$fichier_yaml" ]; then
    err "Fichier introuvable : $fichier_yaml"
    return 1
  fi

  step "Apercu du Referentiel ($fichier_yaml)"
  if ! docker compose -f "$COMPOSE_FILE" exec -T app node dist/src/import-referentiel-cli.js \
    --apercu-only < "$fichier_yaml"; then
    err "Apercu rejete - YAML invalide, voir le detail ci-dessus. Import non applique."
    return 1
  fi

  echo ""
  warn "Chaque import remplace tout le Referentiel : toute Question absente de ce fichier sera archivee."
  local confirm
  read -rp "Appliquer ces changements ? [o/N] " confirm
  if [[ ! "$confirm" =~ ^[oO]$ ]]; then
    echo "Annule, aucune ecriture."
    return 0
  fi

  step "Application du Referentiel"
  docker compose -f "$COMPOSE_FILE" exec -T app node dist/src/import-referentiel-cli.js \
    < "$fichier_yaml"
  ok "Referentiel importe."
}

# ── Action 3 : amorcer le premier compte Coach ──────────────────────
action_amorcer_coach() {
  local email prenom nom mot_de_passe mot_de_passe_confirmation
  read -rp "Email du Coach : " email
  read -rp "Prenom : " prenom
  read -rp "Nom : " nom
  read -rsp "Mot de passe : " mot_de_passe
  echo ""
  read -rsp "Confirmer le mot de passe : " mot_de_passe_confirmation
  echo ""

  if [ "$mot_de_passe" != "$mot_de_passe_confirmation" ]; then
    err "Les deux mots de passe ne correspondent pas."
    return 1
  fi

  step "Amorcage du compte Coach ($email)"
  docker compose -f "$COMPOSE_FILE" exec -T app node dist/src/bootstrap-coach.js \
    --email="$email" --prenom="$prenom" --nom="$nom" --mot-de-passe="$mot_de_passe"
}

# ── Menu interactif ──────────────────────────────────────────────────
afficher_menu() {
  while true; do
    echo ""
    echo "=== Agilometre - exploitation ($APP_DIR) ==="
    echo "  1) Deployer une version"
    echo "  2) Importer le Referentiel"
    echo "  3) Amorcer un compte Coach"
    echo "  4) Quitter"
    local choix
    read -rp "Choix : " choix
    # "|| true" indispensable sous "set -e" : sans lui, un retour non nul d'une action (tag
    # invalide, fichier introuvable, mots de passe non concordants, healthcheck en echec...)
    # ferait sortir tout le script au lieu de revenir au menu.
    case "$choix" in
      1) action_deployer || true ;;
      2) action_importer_referentiel || true ;;
      3) action_amorcer_coach || true ;;
      4) exit 0 ;;
      *) warn "Choix invalide." ;;
    esac
  done
}

# ── Point d'entree ───────────────────────────────────────────────────
if [ $# -ge 1 ]; then
  action_deployer "$1"
else
  afficher_menu
fi
