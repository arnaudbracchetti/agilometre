#!/usr/bin/env bash
# Poste un fichier YAML sur POST /api/referentiel/import/apercu et affiche le ChangeSet obtenu.
# N'écrit jamais en base (aperçu = lecture pure) — voir apps/backend/src/referentiel/.
#
# Usage: scripts/preview-import-referentiel.sh <fichier.yaml> [url_base]
set -euo pipefail

fichier="${1:?Usage: $0 <fichier.yaml> [url_base]}"
url_base="${2:-http://localhost:3000}"

if [[ ! -f "$fichier" ]]; then
  echo "Fichier introuvable : $fichier" >&2
  exit 1
fi

reponse=$(curl -sS -w '\n%{http_code}' -X POST "$url_base/api/referentiel/import/apercu" \
  -H 'Content-Type: text/plain' \
  --data-binary "@$fichier")

statut="${reponse##*$'\n'}"
corps="${reponse%$'\n'*}"

if command -v python3 >/dev/null 2>&1; then
  echo "$corps" | python3 -c '
import json
import sys

corps = json.load(sys.stdin)
print(json.dumps(corps, indent=2, ensure_ascii=False))

resume = corps.get("resume")
if resume:
    print()
    print("--- Résumé ---")
    print(resume)
'
else
  echo "$corps"
fi

if [[ "$statut" -ge 400 ]]; then
  echo "→ HTTP $statut (YAML rejeté)" >&2
  exit 1
fi
echo "→ HTTP $statut" >&2
