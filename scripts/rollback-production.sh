#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <release-record>" >&2
  exit 64
fi

release_record="$1"
project="${COMPOSE_PROJECT_NAME:-lankacalc-production}"
environment_file="${PRODUCTION_ENV_FILE:-/etc/lankacalc/production.env}"
compose=(docker compose --env-file "$environment_file" -p "$project" -f compose.yaml -f compose.production.yaml)

[[ -f "$release_record" ]] || { echo "Missing release record: $release_record" >&2; exit 1; }
[[ -f "$environment_file" ]] || { echo "Missing production environment: $environment_file" >&2; exit 1; }
grep -q '^PUBLIC_INDEXING_ENABLED=false$' "$environment_file" || { echo "Refusing private rollback unless PUBLIC_INDEXING_ENABLED=false is explicit." >&2; exit 1; }

previous_web_image="$(grep '^PREVIOUS_WEB_IMAGE=' "$release_record" | cut -d= -f2-)"
[[ -n "$previous_web_image" ]] || { echo "Release record has no previous web image." >&2; exit 1; }
docker image inspect "$previous_web_image" >/dev/null

docker tag "$previous_web_image" "$project-web:latest"
"${compose[@]}" up -d --no-build web proxy
"${compose[@]}" run --rm verify
"${compose[@]}" run --rm verify node scripts/verify-private.mjs

echo "Application image rollback verified. Database was not restored."
