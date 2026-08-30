#!/usr/bin/env bash
# Poste un fichier YAML sur POST /api/referentiel/import/apercu, affiche le ChangeSet obtenu,
# puis (sauf --apercu-only) poste le même fichier sur POST /api/referentiel/import/application.
# N'appelle jamais l'application si l'aperçu échoue (YAML invalide) ni si l'utilisateur refuse
# la confirmation — voir apps/backend/src/referentiel/.
#
# Usage: AGILOMETRE_TOKEN=<jeton> scripts/import-referentiel.sh [--apercu-only|-y] <fichier.yaml> [url_base]
#   --apercu-only  n'affiche que l'aperçu, n'écrit jamais en base
#   -y             saute la confirmation interactive, applique directement après l'aperçu
#
# AGILOMETRE_TOKEN : jeton Coach obtenu via POST /api/auth/login (issue #59 — ces deux routes
# exigent désormais un compte, voir docs/deploy-agilometre.md).
set -euo pipefail

if [[ -z "${AGILOMETRE_TOKEN:-}" ]]; then
  echo "AGILOMETRE_TOKEN manquant — obtenir un jeton Coach via POST /api/auth/login" >&2
  exit 1
fi

apercu_seulement=false
bypasser_confirmation=false
case "${1:-}" in
  --apercu-only)
    apercu_seulement=true
    shift
    ;;
  -y)
    bypasser_confirmation=true
    shift
    ;;
esac

fichier="${1:?Usage: $0 [--apercu-only|-y] <fichier.yaml> [url_base]}"
url_base="${2:-http://localhost:3000}"

if [[ ! -f "$fichier" ]]; then
  echo "Fichier introuvable : $fichier" >&2
  exit 1
fi

if [[ -n "${2:-}" && ! "$url_base" =~ ^https?:// ]]; then
  echo "url_base doit inclure le schéma (http:// ou https://) : reçu '$url_base'" >&2
  exit 1
fi

# Affiche le corps JSON (pretty-print si python3 dispo) et isole le champ résumé donné en 2e arg.
afficher_reponse() {
  local corps="$1"
  local cle_resume="$2"

  if command -v python3 >/dev/null 2>&1; then
    if ! echo "$corps" | python3 -c '
import json
import sys

try:
    corps = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(1)

print(json.dumps(corps, indent=2, ensure_ascii=False))

cle_resume = sys.argv[1]
if cle_resume:
    resume = corps.get(cle_resume)
    if resume:
        print()
        print("--- Résumé ---")
        print(resume)
' "$cle_resume"; then
      echo "(réponse non-JSON, affichée telle quelle - vérifier l'URL et le schéma http(s))" >&2
      echo "$corps"
    fi
  else
    echo "$corps"
  fi
}

# Appelle l'endpoint donné avec le fichier YAML, affiche la réponse, et laisse le statut HTTP
# dans la variable globale `statut` (pas de capture via $(...), qui mêlerait sortie et statut).
appeler_endpoint() {
  local chemin="$1"
  local cle_resume="$2"

  local reponse
  reponse=$(curl -sS -w '\n%{http_code}' -X POST "$url_base$chemin" \
    -H 'Content-Type: text/plain' \
    -H "Authorization: Bearer $AGILOMETRE_TOKEN" \
    --data-binary "@$fichier")

  statut="${reponse##*$'\n'}"
  local corps="${reponse%$'\n'*}"
  afficher_reponse "$corps" "$cle_resume"
}

echo "=== Aperçu ==="
appeler_endpoint "/api/referentiel/import/apercu" "resume"

if [[ "$statut" -ge 400 ]]; then
  echo "→ HTTP $statut (YAML rejeté par l'aperçu — application non appelée)" >&2
  exit 1
fi
echo "→ HTTP $statut" >&2

if [[ "$apercu_seulement" == true ]]; then
  exit 0
fi

if [[ "$bypasser_confirmation" != true ]]; then
  reponse_confirmation=""
  read -r -p "Appliquer ces changements ? [o/N] " reponse_confirmation || true
  case "$reponse_confirmation" in
    o|O|oui|Oui|OUI) ;;
    *)
      echo "Annulé, aucune écriture."
      exit 0
      ;;
  esac
fi

echo
echo "=== Application ==="
appeler_endpoint "/api/referentiel/import/application" ""

if [[ "$statut" -ge 400 ]]; then
  echo "→ HTTP $statut (échec de l'application)" >&2
  exit 1
fi
echo "→ HTTP $statut" >&2
