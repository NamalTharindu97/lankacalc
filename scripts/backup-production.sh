#!/usr/bin/env bash
set -euo pipefail
umask 077

project="${COMPOSE_PROJECT_NAME:-lankacalc-production}"
environment_file="${PRODUCTION_ENV_FILE:-/etc/lankacalc/production.env}"
backup_environment_file="${BACKUP_ENV_FILE:-/etc/lankacalc/backup.env}"
backup_directory="${BACKUP_DIRECTORY:-/var/backups/lankacalc/daily}"
compose=(docker compose --env-file "$environment_file" -p "$project" -f compose.yaml -f compose.production.yaml)

[[ -f "$environment_file" ]] || { printf 'Missing production environment: %s\n' "$environment_file" >&2; exit 1; }
[[ -f "$backup_environment_file" ]] || { printf 'Missing backup environment: %s\n' "$backup_environment_file" >&2; exit 1; }

# The root-owned file contains the public encryption recipient and remote destination.
# shellcheck disable=SC1090
source "$backup_environment_file"

: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT in the backup environment}"
: "${RCLONE_REMOTE:?Set RCLONE_REMOTE in the backup environment}"
local_retention_days="${LOCAL_RETENTION_DAYS:-7}"
remote_retention_days="${REMOTE_RETENTION_DAYS:-35}"
[[ "$local_retention_days" =~ ^[1-9][0-9]*$ ]] || { printf 'LOCAL_RETENTION_DAYS must be a positive integer.\n' >&2; exit 1; }
[[ "$remote_retention_days" =~ ^[1-9][0-9]*$ ]] || { printf 'REMOTE_RETENTION_DAYS must be a positive integer.\n' >&2; exit 1; }

command -v age >/dev/null || { printf 'age is required.\n' >&2; exit 1; }
command -v rclone >/dev/null || { printf 'rclone is required.\n' >&2; exit 1; }
command -v sha256sum >/dev/null || { printf 'sha256sum is required.\n' >&2; exit 1; }

mkdir -p "$backup_directory"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
basename="lankacalc-$timestamp.dump.age"
backup="$backup_directory/$basename"
checksum="$backup.sha256"
partial="$backup.partial"

cleanup() {
  rm -f "$partial"
}
trap cleanup EXIT

"${compose[@]}" up -d db
# Expand database credentials inside the container, not on the host.
# shellcheck disable=SC2016
"${compose[@]}" exec -T db sh -c 'pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$partial"
test -s "$partial"
mv "$partial" "$backup"

hash="$(sha256sum "$backup" | cut -d ' ' -f 1)"
printf '%s  %s\n' "$hash" "$basename" > "$checksum"

rclone copyto "$backup" "${RCLONE_REMOTE%/}/$basename"
rclone copyto "$checksum" "${RCLONE_REMOTE%/}/$basename.sha256"
rclone check "$backup_directory" "$RCLONE_REMOTE" --include "$basename" --include "$basename.sha256" --one-way

find "$backup_directory" -type f \( -name 'lankacalc-*.dump.age' -o -name 'lankacalc-*.dump.age.sha256' \) -mtime "+$local_retention_days" -delete
rclone delete "$RCLONE_REMOTE" --min-age "${remote_retention_days}d" --include 'lankacalc-*.dump.age' --include 'lankacalc-*.dump.age.sha256'

printf 'Encrypted backup uploaded and verified: %s/%s\n' "${RCLONE_REMOTE%/}" "$basename"
