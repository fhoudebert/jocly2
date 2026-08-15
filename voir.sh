#!/usr/bin/env bash

set -euo pipefail

PORT=8002
URL="http://localhost:${PORT}/examples/browser/fairy-check.html"

# Vérifier que Python est disponible.
command -v python3 >/dev/null || {
    echo "Erreur : python3 n'est pas installé." >&2
    exit 1
}

# Vérifier que Firefox est disponible.
command -v firefox >/dev/null || {
    echo "Erreur : firefox n'est pas installé." >&2
    exit 1
}

# Arrêter le serveur en quittant le script.
cleanup() {
    [[ -n "${SERVER_PID:-}" ]] && kill "${SERVER_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Démarrage du serveur HTTP sur le port ${PORT}..."
python3 -m http.server "${PORT}" &
SERVER_PID=$!

# Attendre que le serveur soit prêt.
sleep 1

echo "Ouverture de Firefox sur ${URL}"
firefox "${URL}" >/dev/null 2>&1 &

echo "Serveur en cours d'exécution (PID ${SERVER_PID})."
echo "Appuyez sur Ctrl+C pour arrêter."

wait "${SERVER_PID}"
