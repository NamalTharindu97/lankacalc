#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <expected-git-commit>" >&2
  exit 64
fi

expected_commit="$1"
project="${COMPOSE_PROJECT_NAME:-lankacalc-production}"
environment_file="${PRODUCTION_ENV_FILE:-/etc/lankacalc/production.env}"
backup_directory="${BACKUP_DIRECTORY:-/var/backups/lankacalc}"
release_directory="${RELEASE_DIRECTORY:-/var/lib/lankacalc/releases}"
compose=(docker compose --env-file "$environment_file" -p "$project" -f compose.yaml -f compose.production.yaml)
git_command=(git --no-optional-locks -c "safe.directory=$PWD")

[[ -f "$environment_file" ]] || { echo "Missing production environment: $environment_file" >&2; exit 1; }
actual_commit="$("${git_command[@]}" rev-parse HEAD)"
expected_commit="$("${git_command[@]}" rev-parse "$expected_commit^{commit}")"
worktree_status="$("${git_command[@]}" status --porcelain)"
[[ "$actual_commit" == "$expected_commit" ]] || { echo "HEAD does not match expected commit $expected_commit." >&2; exit 1; }
[[ -z "$worktree_status" ]] || { echo "Refusing to deploy a dirty checkout." >&2; exit 1; }
grep -q '^PUBLIC_INDEXING_ENABLED=false$' "$environment_file" || { echo "Refusing private deployment unless PUBLIC_INDEXING_ENABLED=false is explicit." >&2; exit 1; }
docker network inspect edge >/dev/null

mkdir -p "$backup_directory" "$release_directory"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
release_record="$release_directory/$timestamp.env"
backup="$backup_directory/pre-release-$timestamp.sql.gz"
previous_web_image="$("${compose[@]}" images -q web 2>/dev/null || true)"

{
  echo "DEPLOYED_COMMIT=$actual_commit"
  echo "PREVIOUS_WEB_IMAGE=$previous_web_image"
  echo "DATABASE_BACKUP=$backup"
  echo "CREATED_AT=$timestamp"
} > "$release_record"

"${compose[@]}" config --quiet
"${compose[@]}" up -d db
"${compose[@]}" exec -T db sh -c 'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$backup"
test -s "$backup"
sha256sum "$backup" > "$backup.sha256"

"${compose[@]}" build web migrate verify
"${compose[@]}" run --rm migrate
"${compose[@]}" up -d web proxy
"${compose[@]}" run --rm verify
"${compose[@]}" run --rm verify node scripts/verify-private.mjs

current_web_image="$("${compose[@]}" images -q web)"
{
  echo "CURRENT_WEB_IMAGE=$current_web_image"
  echo "BACKUP_SHA256=$(cut -d ' ' -f 1 "$backup.sha256")"
} >> "$release_record"

echo "Deployment verified. Release record: $release_record"
