#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s <local-encrypted-backup-or-rclone-object>\n' "$0" >&2
  exit 64
fi

source_object="$1"
project="${COMPOSE_PROJECT_NAME:-lankacalc-production}"
environment_file="${PRODUCTION_ENV_FILE:-/etc/lankacalc/production.env}"
backup_environment_file="${BACKUP_ENV_FILE:-/etc/lankacalc/backup.env}"
compose=(docker compose --env-file "$environment_file" -p "$project" -f compose.yaml -f compose.production.yaml)

[[ -f "$environment_file" ]] || { printf 'Missing production environment: %s\n' "$environment_file" >&2; exit 1; }
[[ -f "$backup_environment_file" ]] || { printf 'Missing backup environment: %s\n' "$backup_environment_file" >&2; exit 1; }

# shellcheck disable=SC1090
source "$backup_environment_file"
: "${BACKUP_AGE_IDENTITY_FILE:?Set BACKUP_AGE_IDENTITY_FILE in the backup environment used for restore verification}"
[[ -f "$BACKUP_AGE_IDENTITY_FILE" ]] || { printf 'Missing age identity: %s\n' "$BACKUP_AGE_IDENTITY_FILE" >&2; exit 1; }

command -v age >/dev/null || { printf 'age is required.\n' >&2; exit 1; }
command -v sha256sum >/dev/null || { printf 'sha256sum is required.\n' >&2; exit 1; }

temporary_directory="$(mktemp -d)"
encrypted_backup="$temporary_directory/backup.dump.age"
checksum_file="$temporary_directory/backup.dump.age.sha256"
restore_database="lankacalc_restore_$(date -u +%Y%m%d%H%M%S)_$$"
database_created=false

cleanup() {
  if [[ "$database_created" == true ]]; then
    "${compose[@]}" exec -T db sh -c "dropdb --if-exists -U \"\$POSTGRES_USER\" '$restore_database'" >/dev/null 2>&1 || true
  fi
  rm -rf "$temporary_directory"
}
trap cleanup EXIT

if [[ -f "$source_object" ]]; then
  cp "$source_object" "$encrypted_backup"
  [[ -f "$source_object.sha256" ]] && cp "$source_object.sha256" "$checksum_file"
else
  command -v rclone >/dev/null || { printf 'rclone is required for remote restore verification.\n' >&2; exit 1; }
  rclone copyto "$source_object" "$encrypted_backup"
  rclone copyto "$source_object.sha256" "$checksum_file"
fi

test -s "$encrypted_backup"
if [[ -f "$checksum_file" ]]; then
  expected_hash="$(cut -d ' ' -f 1 "$checksum_file")"
  actual_hash="$(sha256sum "$encrypted_backup" | cut -d ' ' -f 1)"
  [[ "$actual_hash" == "$expected_hash" ]] || { printf 'Backup checksum mismatch.\n' >&2; exit 1; }
else
  printf 'Refusing restore verification without a checksum sidecar.\n' >&2
  exit 1
fi

"${compose[@]}" up -d db
"${compose[@]}" exec -T db sh -c "createdb -U \"\$POSTGRES_USER\" '$restore_database'"
database_created=true

age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$encrypted_backup" \
  | "${compose[@]}" exec -T db sh -c "pg_restore --exit-on-error --no-owner --no-privileges -U \"\$POSTGRES_USER\" -d '$restore_database'"

table_count="$("${compose[@]}" exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d '$restore_database' -Atqc \"select count(*) from information_schema.tables where table_schema = 'public'\"")"
[[ "$table_count" =~ ^[1-9][0-9]*$ ]] || { printf 'Restored database has no public tables.\n' >&2; exit 1; }
"${compose[@]}" exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d '$restore_database' -v ON_ERROR_STOP=1 -Atqc 'select 1'" >/dev/null

printf 'Restore verification passed with %s public tables; temporary database removed.\n' "$table_count"
