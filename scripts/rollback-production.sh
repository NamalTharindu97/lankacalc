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

visibility="$(grep '^ROLLBACK_VISIBILITY=' "$release_record" | cut -d= -f2- || true)"
if [[ -z "$visibility" ]]; then
  visibility="$(grep '^DEPLOYMENT_VISIBILITY=' "$release_record" | cut -d= -f2- || true)"
fi
visibility="${visibility:-private}"
case "$visibility" in
  private)
    grep -q '^PUBLIC_INDEXING_ENABLED=false$' "$environment_file" || { echo "Refusing private rollback unless PUBLIC_INDEXING_ENABLED=false is explicit." >&2; exit 1; }
    ;;
  public)
    grep -q '^PUBLIC_INDEXING_ENABLED=true$' "$environment_file" || { echo "Refusing public rollback unless PUBLIC_INDEXING_ENABLED=true is explicit." >&2; exit 1; }
    expected_site_url="$(grep '^EXPECTED_SITE_URL=' "$release_record" | cut -d= -f2- || true)"
    redirect_from_url="$(grep '^REDIRECT_FROM_URL=' "$release_record" | cut -d= -f2- || true)"
    [[ -n "$expected_site_url" && -n "$redirect_from_url" ]] || { echo "Public release record is missing launch-verification origins." >&2; exit 1; }
    site_url="$(grep '^SITE_URL=' "$environment_file" | cut -d= -f2-)"
    [[ "$site_url" == "$expected_site_url" ]] || { echo "Release-record EXPECTED_SITE_URL does not match the production SITE_URL." >&2; exit 1; }
    ;;
  *)
    echo "Release record has an invalid deployment visibility." >&2
    exit 1
    ;;
esac

verify_release() {
  "${compose[@]}" run --rm verify
  if [[ "$visibility" == "private" ]]; then
    "${compose[@]}" run --rm verify node scripts/verify-private.mjs
  else
    "${compose[@]}" run --rm \
      -e "EXPECTED_SITE_URL=$expected_site_url" \
      -e "APP_BASE_URL=$expected_site_url" \
      -e "REDIRECT_FROM_URL=$redirect_from_url" \
      verify node scripts/verify-launch.mjs
  fi
}

previous_web_image="$(grep '^PREVIOUS_WEB_IMAGE=' "$release_record" | cut -d= -f2-)"
[[ -n "$previous_web_image" ]] || { echo "Release record has no previous web image." >&2; exit 1; }
docker image inspect "$previous_web_image" >/dev/null

docker tag "$previous_web_image" "$project-web:latest"
"${compose[@]}" up -d --no-build --force-recreate web proxy
verify_release

echo "$visibility application image rollback verified. Database was not restored."
