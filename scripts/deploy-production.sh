#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <expected-git-commit> [private|public]" >&2
  exit 64
fi

expected_commit="$1"
visibility="${2:-private}"
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
case "$visibility" in
  private)
    grep -q '^PUBLIC_INDEXING_ENABLED=false$' "$environment_file" || { echo "Refusing private deployment unless PUBLIC_INDEXING_ENABLED=false is explicit." >&2; exit 1; }
    ;;
  public)
    grep -q '^PUBLIC_INDEXING_ENABLED=true$' "$environment_file" || { echo "Refusing public deployment unless PUBLIC_INDEXING_ENABLED=true is explicit." >&2; exit 1; }
    : "${PREVIOUS_DEPLOYMENT_VISIBILITY:?Set PREVIOUS_DEPLOYMENT_VISIBILITY to private for first launch or public for later public releases}"
    : "${EXPECTED_SITE_URL:?Set EXPECTED_SITE_URL to the canonical public HTTPS origin}"
    : "${REDIRECT_FROM_URL:?Set REDIRECT_FROM_URL to the secondary public hostname}"
    site_url="$(grep '^SITE_URL=' "$environment_file" | cut -d= -f2-)"
    [[ "$EXPECTED_SITE_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] || { echo "EXPECTED_SITE_URL must be an HTTPS origin without a path, query, or fragment." >&2; exit 1; }
    [[ "$site_url" == "$EXPECTED_SITE_URL" ]] || { echo "EXPECTED_SITE_URL must exactly match SITE_URL in the production environment." >&2; exit 1; }
    [[ "$REDIRECT_FROM_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] || { echo "REDIRECT_FROM_URL must be an HTTPS origin without a path, query, or fragment." >&2; exit 1; }
    [[ "$REDIRECT_FROM_URL" != "$EXPECTED_SITE_URL" ]] || { echo "REDIRECT_FROM_URL must differ from EXPECTED_SITE_URL." >&2; exit 1; }
    ;;
  *)
    echo "Deployment visibility must be private or public." >&2
    exit 64
    ;;
esac
rollback_visibility="${PREVIOUS_DEPLOYMENT_VISIBILITY:-private}"
[[ "$rollback_visibility" == "private" || "$rollback_visibility" == "public" ]] || { echo "PREVIOUS_DEPLOYMENT_VISIBILITY must be private or public." >&2; exit 64; }
docker network inspect edge >/dev/null

verify_release() {
  "${compose[@]}" run --rm verify
  if [[ "$visibility" == "private" ]]; then
    "${compose[@]}" run --rm verify node scripts/verify-private.mjs
  else
    "${compose[@]}" run --rm \
      -e "EXPECTED_SITE_URL=$EXPECTED_SITE_URL" \
      -e "APP_BASE_URL=$EXPECTED_SITE_URL" \
      -e "REDIRECT_FROM_URL=$REDIRECT_FROM_URL" \
      verify node scripts/verify-launch.mjs
  fi
}

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
  echo "DEPLOYMENT_VISIBILITY=$visibility"
  echo "ROLLBACK_VISIBILITY=$rollback_visibility"
  if [[ "$visibility" == "public" ]]; then
    echo "EXPECTED_SITE_URL=$EXPECTED_SITE_URL"
    echo "REDIRECT_FROM_URL=$REDIRECT_FROM_URL"
  fi
} > "$release_record"

"${compose[@]}" config --quiet
"${compose[@]}" up -d db
# Expand database credentials inside the container, not on the host.
# shellcheck disable=SC2016
"${compose[@]}" exec -T db sh -c 'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$backup"
test -s "$backup"
sha256sum "$backup" > "$backup.sha256"

"${compose[@]}" build web migrate verify
"${compose[@]}" run --rm migrate
"${compose[@]}" up -d web proxy
verify_release

current_web_image="$("${compose[@]}" images -q web)"
{
  echo "CURRENT_WEB_IMAGE=$current_web_image"
  echo "BACKUP_SHA256=$(cut -d ' ' -f 1 "$backup.sha256")"
} >> "$release_record"

echo "$visibility deployment verified. Release record: $release_record"
