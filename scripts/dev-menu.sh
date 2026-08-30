#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Menu d'exploitation - environnement de developpement local
#
# Pendant local de deploy-agilometre.sh (production) : memes deux operations
# (importer le Referentiel, amorcer un compte Coach), mais executees directement
# via pnpm sur ce poste plutot que via "docker compose exec" sur un serveur -
# pas de conteneur "app" en dev (pnpm dev lance backend/frontend directement).
# Pas d'option "deployer une version" ici : ca n'a pas de sens en local.
#
# Usage : scripts/dev-menu.sh
#
# ATTENTION : agit sur apps/backend/.env, c'est-a-dire la base de developpement
# du port 5433 - la base de travail reelle avec des donnees saisies a la main
# (voir CLAUDE.md, "Database safety"). Jamais la base de test (5434) : ce script
# sert justement a preparer VOTRE environnement de dev, pas a le simuler.
# ============================================================

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
step() { echo ""; echo -e "${CYAN}>> $1${NC}"; }
ok()   { echo -e "${GREEN}   OK : $1${NC}"; }
err()  { echo -e "${RED}   ERREUR : $1${NC}"; }
warn() { echo -e "${YELLOW}   ATTENTION : $1${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Action 1 : importer le Referentiel (base de dev, port 5433) ────
action_importer_referentiel() {
  local fichier_yaml
  read -rp "Chemin du fichier YAML a importer : " fichier_yaml
  if [ ! -f "$fichier_yaml" ]; then
    err "Fichier introuvable : $fichier_yaml"
    return 1
  fi

  warn "Ceci agit sur votre base de developpement (port 5433) - donnees reelles, pas la base de test."
  step "Apercu du Referentiel ($fichier_yaml)"
  if ! pnpm --filter backend run import-referentiel:cli -- --apercu-only < "$fichier_yaml"; then
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
  pnpm --filter backend run import-referentiel:cli -- < "$fichier_yaml"
  ok "Referentiel importe (base de dev)."
}

# ── Action 2 : creer un compte Coach (base de dev, port 5433) ──────
action_creer_coach() {
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

  step "Creation du compte Coach ($email) sur la base de dev"
  pnpm --filter backend run bootstrap:coach -- \
    --email="$email" --prenom="$prenom" --nom="$nom" --mot-de-passe="$mot_de_passe"
}

# ── Menu interactif ──────────────────────────────────────────────────
while true; do
  echo ""
  echo "=== Agilometre - environnement de dev ==="
  echo "  1) Importer le Referentiel"
  echo "  2) Creer un compte Coach"
  echo "  3) Quitter"
  choix=""
  read -rp "Choix : " choix
  # "|| true" indispensable sous "set -e" : sans lui, un retour non nul d'une action (fichier
  # introuvable, mots de passe non concordants...) ferait sortir tout le script au lieu de
  # revenir au menu.
  case "$choix" in
    1) action_importer_referentiel || true ;;
    2) action_creer_coach || true ;;
    3) exit 0 ;;
    *) warn "Choix invalide." ;;
  esac
done
