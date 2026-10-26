#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
app_port="${1:-4173}"
if [[ ! "$app_port" =~ ^[0-9]+$ ]]; then
  printf 'Usage: bash start.sh [port-number]\n' >&2
  exit 1
fi
if [[ ! -f dist/index.html ]]; then
  printf 'Build the app first: npm ci && npm run build\n' >&2
  exit 1
fi
printf 'RolePilot: http://127.0.0.1:%s\nKeep this terminal open. Press Ctrl+C to stop.\n' "$app_port"
exec python3 -m http.server "$app_port" --bind 127.0.0.1 --directory dist
