#!/usr/bin/env bash
# Executed exclusively by GitHub Actions. No builds or global Docker cleanup.
set -Eeuo pipefail
umask 077
# Immutable refs must come from the release manifest, not the caller's shell.
unset API_IMAGE_REF WEB_IMAGE_REF MIGRATOR_IMAGE_REF RELEASE_VERSION

APP_ROOT=/opt/rebequi
RELEASE_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE="$APP_ROOT/.env.production"
PRIMARY_DOMAIN=rebequi.com.br
SECONDARY_DOMAIN=www.rebequi.com.br
SITE_CONF=/etc/nginx/sites-available/rebequi
CERTBOT_WEBROOT=/var/www/rebequi-acme
REGISTRY_USER=${1:?GHCR user is required}
PREVIOUS_DIR=$(readlink -f "$APP_ROOT/current" 2>/dev/null || true)
ACTIVATED=0
NGINX_CHANGED=0
HAD_SITE=0
HAD_LINK=0

fail() { printf '%s\n' "$*" >&2; return 1; }
for command in docker curl openssl nginx certbot flock tar; do
  command -v "$command" >/dev/null || fail "Missing host dependency: $command"
done
docker compose version >/dev/null || fail 'Docker Compose v2 is required.'
[[ "$RELEASE_DIR" == "$APP_ROOT"/releases/* ]] || fail 'Invalid release directory.'
if [[ -d "$APP_ROOT/current" && ! -L "$APP_ROOT/current" ]]; then
  fail 'Legacy current directory needs an explicit migration; it was preserved.'
fi
[[ $(uname -m) == x86_64 ]] || fail 'Images require an x86_64 VPS.'
mkdir -p "$APP_ROOT/backups" "$APP_ROOT/releases"
# Public challenge files need to be readable by Nginx workers despite umask 077.
install -d -m 755 "$CERTBOT_WEBROOT"
exec 9>"$APP_ROOT/deploy.lock"
flock -n 9 || fail 'Another Rebequi deploy is in progress.'

export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d "$APP_ROOT/.registry-auth.XXXXXX")
cleanup() {
  # This is only the temporary auth directory created by this invocation.
  [[ "$DOCKER_CONFIG" == "$APP_ROOT"/.registry-auth.* ]] && rm -rf -- "$DOCKER_CONFIG"
}
trap cleanup EXIT

compose() {
  docker compose -p rebequi --env-file "$ENV_FILE" \
    --env-file "$RELEASE_DIR/.images.env" -f "$RELEASE_DIR/docker-compose.production.yml" "$@"
}

wait_healthy() {
  local name=$1 status
  for ((attempt=0; attempt<36; attempt++)); do
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || true)
    [[ "$status" == healthy ]] && return 0
    sleep 5
  done
  printf 'Health check failed: %s\n' "$name" >&2
  return 1
}

rollback_on_error() {
  local code=$? original_release=$RELEASE_DIR
  # Command substitutions report failure to their parent; rollback runs once.
  if (( BASH_SUBSHELL > 0 )); then exit "$code"; fi
  trap - ERR
  set +e
  printf 'Deploy failed; persistent data and backups are retained.\n' >&2
  compose ps
  if (( NGINX_CHANGED )); then
    if (( HAD_SITE )); then
      cp "$original_release/nginx.before" "$SITE_CONF"
    else
      rm -f -- "$SITE_CONF"
    fi
    if (( ! HAD_LINK )); then rm -f -- /etc/nginx/sites-enabled/rebequi; fi
    nginx -t && systemctl reload nginx
  fi
  if (( ACTIVATED )) && [[ -f "$PREVIOUS_DIR/.images.env" && -f "$PREVIOUS_DIR/docker-compose.production.yml" ]]; then
    printf 'Restoring previous application images; database is not reverted.\n' >&2
    RELEASE_DIR=$PREVIOUS_DIR
    compose up -d --no-deps --no-build --pull never api
    wait_healthy rebequi-api
    compose up -d --no-deps --no-build --pull never --force-recreate web
    wait_healthy rebequi-web
  fi
  exit "$code"
}
trap rollback_on_error ERR

# Token arrives through encrypted stdin, never as argv, logs or a release file.
IFS= read -r registry_token
printf '%s' "$registry_token" | docker login ghcr.io -u "$REGISTRY_USER" --password-stdin >/dev/null
unset registry_token

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$APP_ROOT/current/.env.production" ]]; then
    cp "$APP_ROOT/current/.env.production" "$ENV_FILE"
  else
    # Only for the first installation. Never regenerate existing credentials.
    db_password=$(openssl rand -hex 24)
    jwt_secret=$(openssl rand -hex 32)
    settings_key=$(openssl rand -hex 32)
    admin_password=$(openssl rand -hex 24)
    customer_password=$(openssl rand -hex 24)
    cat >"$ENV_FILE" <<ENV
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
POSTGRES_DB=rebequi
POSTGRES_USER=rebequi
POSTGRES_PASSWORD=$db_password
DATABASE_URL=postgresql://rebequi:$db_password@postgres:5432/rebequi
JWT_SECRET=$jwt_secret
SETTINGS_ENCRYPTION_KEY=$settings_key
JWT_EXPIRES_IN=7d
AUTH_COOKIE_NAME=rebequi_token
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_MAX_AGE_MS=604800000
AUTH_COOKIE_PATH=/
ALLOWED_ORIGINS=https://rebequi.com.br,https://www.rebequi.com.br
UPLOAD_DIR=./uploads
LOG_LEVEL=info
BOOTSTRAP_ADMIN_EMAIL=admin@rebequi.com.br
BOOTSTRAP_ADMIN_PASSWORD=$admin_password
BOOTSTRAP_CUSTOMER_EMAIL=cliente@rebequi.com.br
BOOTSTRAP_CUSTOMER_PASSWORD=$customer_password
ENV
    unset db_password jwt_secret settings_key admin_password customer_password
  fi
fi
chmod 600 "$ENV_FILE"
ln -sfn "$ENV_FILE" "$RELEASE_DIR/.env.production"
compose config --quiet

# Image digests and release ID are public; do not source the secret env file.
read_manifest() { sed -n "s/^$1=//p" "$RELEASE_DIR/.images.env"; }
RELEASE_VERSION=$(read_manifest RELEASE_VERSION)
[[ "$RELEASE_VERSION" =~ ^[0-9a-f]{40}$ ]] || fail 'Invalid release SHA.'
for key in API_IMAGE_REF WEB_IMAGE_REF MIGRATOR_IMAGE_REF; do
  ref=$(read_manifest "$key")
  [[ "$ref" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$ ]] || fail "Invalid image digest: $key"
done

for volume in rebequi-postgres-data rebequi-uploads rebequi-logs; do
  docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null
done
compose --profile tools pull api web migrator
# An existing DB must not be recreated during an application deploy.
if ! docker inspect rebequi-postgres >/dev/null 2>&1; then
  compose up -d --no-build postgres
elif [[ $(docker inspect -f '{{.State.Running}}' rebequi-postgres) != true ]]; then
  fail 'Existing PostgreSQL is stopped; investigate before restarting.'
fi
wait_healthy rebequi-postgres

# Consistent logical backup before any migration. No deletion or auto-restore.
backup="$APP_ROOT/backups/predeploy-$(date -u +%Y%m%dT%H%M%SZ)-$RELEASE_VERSION.dump"
docker exec rebequi-postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$backup"
test -s "$backup"
docker exec -i rebequi-postgres pg_restore --list <"$backup" >/dev/null

# Detect a new database BEFORE migrations; bootstrap is never rerun on updates.
table_present=$(docker exec rebequi-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT to_regclass('\''public.users'\'') IS NOT NULL"')
if [[ "$table_present" == f ]]; then touch "$APP_ROOT/.bootstrap-needed"; fi
compose run --rm --no-deps migrator
compose run --rm --no-deps migrator node /app/node_modules/prisma/build/index.js migrate status
if [[ -f "$APP_ROOT/.bootstrap-needed" ]]; then
  compose run --rm --no-deps migrator npm run prisma:bootstrap
  rm -f -- "$APP_ROOT/.bootstrap-needed"
fi

ACTIVATED=1
compose up -d --no-deps --no-build --pull never api
wait_healthy rebequi-api
# Nginx resolves the API address on startup; refresh it after API recreation.
compose up -d --no-deps --no-build --pull never --force-recreate web
wait_healthy rebequi-web

verify_health() {
  local body
  # Reload signals return before every Nginx worker uses the new TLS vhost.
  # Retry transient failures while still validating the actual certificate.
  body=$(curl -fsS --retry 5 --retry-delay 2 --retry-all-errors --max-time 15 "$@")
  [[ "$body" == *'"status":"ok"'* ]]
}
verify_health http://127.0.0.1:3190/api/health
curl -fsS --max-time 15 http://127.0.0.1:3190/health >/dev/null
[[ $(docker exec rebequi-api cat /app/.release-version) == "$RELEASE_VERSION" ]]
[[ $(docker exec rebequi-web cat /usr/share/nginx/html/release.txt) == "$RELEASE_VERSION" ]]
for pair in 'rebequi-api API_IMAGE_REF' 'rebequi-web WEB_IMAGE_REF'; do
  read -r name key <<<"$pair"
  [[ $(docker inspect -f '{{.Config.Image}}' "$name") == "$(read_manifest "$key")" ]]
done

html=$(curl -fsS --max-time 15 http://127.0.0.1:3190/)
asset=$(printf '%s' "$html" | grep -oE '/assets/[^" ]+\.(js|css)' | sed -n '1p')
[[ -n "$asset" ]]
curl -fsSI --max-time 15 http://127.0.0.1:3190/ | grep -qi '^Cache-Control: no-store'
curl -fsSI --max-time 15 "http://127.0.0.1:3190$asset" | grep -qi 'Cache-Control: .*immutable'

# Only the Rebequi vhost is changed. Shared defaults and other sites stay intact.
if [[ -f "$SITE_CONF" ]]; then
  HAD_SITE=1
  cp "$SITE_CONF" "$RELEASE_DIR/nginx.before"
fi
if [[ -e /etc/nginx/sites-enabled/rebequi || -L /etc/nginx/sites-enabled/rebequi ]]; then
  HAD_LINK=1
  [[ $(readlink -f /etc/nginx/sites-enabled/rebequi) == "$SITE_CONF" ]] || fail 'Unexpected Rebequi vhost symlink.'
fi
NGINX_CHANGED=1
if (( ! HAD_SITE )); then
cat >"$SITE_CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $PRIMARY_DOMAIN $SECONDARY_DOMAIN;
    location /.well-known/acme-challenge/ { root $CERTBOT_WEBROOT; }
    location / {
        proxy_pass http://127.0.0.1:3190;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
fi
ln -sfn "$SITE_CONF" /etc/nginx/sites-enabled/rebequi
if (( ! HAD_SITE || ! HAD_LINK )); then
  nginx -t
  systemctl reload nginx
fi

cert=/etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem
if [[ ! -f "$cert" ]] || ! openssl x509 -in "$cert" -noout -checkhost "$SECONDARY_DOMAIN" >/dev/null 2>&1 \
  || ! openssl x509 -in "$cert" -noout -checkhost "$PRIMARY_DOMAIN" >/dev/null 2>&1 \
  || ! openssl x509 -in "$cert" -noout -checkend 604800 >/dev/null 2>&1; then
  certbot certonly --webroot -w "$CERTBOT_WEBROOT" --cert-name "$PRIMARY_DOMAIN" \
    -d "$PRIMARY_DOMAIN" -d "$SECONDARY_DOMAIN" --expand --non-interactive \
    --agree-tos --email admin@rebequi.com.br
fi
cat >"$SITE_CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $PRIMARY_DOMAIN $SECONDARY_DOMAIN;
    location /.well-known/acme-challenge/ { root $CERTBOT_WEBROOT; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $PRIMARY_DOMAIN $SECONDARY_DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 55m;
    location ^~ /api/channels/oauth/ {
        access_log off;
        add_header Referrer-Policy "no-referrer" always;
        proxy_pass http://127.0.0.1:3190;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:3190;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
nginx -t
systemctl reload nginx
for domain in "$PRIMARY_DOMAIN" "$SECONDARY_DOMAIN"; do
  verify_health --resolve "$domain:443:127.0.0.1" "https://$domain/api/health"
done

# Prepare rollback pointer before committing the new current release.
if [[ -f "$PREVIOUS_DIR/.images.env" && "$PREVIOUS_DIR" != "$RELEASE_DIR" ]]; then
  ln -sfnT "$PREVIOUS_DIR" "$APP_ROOT/previous"
fi
# Atomic pointer update only AFTER health, TLS and exact image validation.
ln -sfn "$RELEASE_DIR" "$APP_ROOT/.current-$RELEASE_VERSION"
if [[ -d "$APP_ROOT/current" && ! -L "$APP_ROOT/current" ]]; then
  fail 'Legacy current directory needs an explicit migration; it was preserved.'
fi
mv -Tf "$APP_ROOT/.current-$RELEASE_VERSION" "$APP_ROOT/current"
ACTIVATED=0
NGINX_CHANGED=0
printf 'Deployed %s. No builds, image/volume pruning or backup removal on the VPS.\n' "$RELEASE_VERSION"
docker stats --no-stream --format '{{.Name}} CPU={{.CPUPerc}} MEM={{.MemUsage}} IO={{.BlockIO}}' rebequi-api rebequi-web rebequi-postgres
