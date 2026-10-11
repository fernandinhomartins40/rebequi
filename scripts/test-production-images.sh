#!/usr/bin/env bash
# Destructive cleanup is confined to the disposable GitHub-hosted test runner.
set -Eeuo pipefail
[[ ${CI:-} == true && ${GITHUB_ACTIONS:-} == true && ${RUNNER_ENVIRONMENT:-} == github-hosted ]] || {
  printf 'Run this integration test only in a disposable GitHub Actions runner.\n' >&2
  exit 1
}
umask 077
TEST_DIR=$(mktemp -d)
cp docker-compose.production.yml "$TEST_DIR/compose.yml"
compose() { docker compose --env-file "$TEST_DIR/.env.production" -f "$TEST_DIR/compose.yml" "$@"; }
cleanup() {
  local code=$?
  trap - EXIT
  set +e
  if (( code )); then compose ps; docker logs rebequi-api --tail 40; fi
  compose --profile tools down
  # These three external volumes were created only by this isolated test.
  docker volume rm rebequi-postgres-data rebequi-uploads rebequi-logs >/dev/null
  rm -rf -- "$TEST_DIR"
  exit "$code"
}
trap cleanup EXIT
cat >"$TEST_DIR/.env.production" <<ENV
POSTGRES_DB=rebequi
POSTGRES_USER=rebequi
POSTGRES_PASSWORD=integration-only-password
DATABASE_URL=postgresql://rebequi:integration-only-password@postgres:5432/rebequi
JWT_SECRET=integration-only-secret-at-least-32-characters
NODE_ENV=test
HOST=0.0.0.0
PORT=3000
BOOTSTRAP_ADMIN_EMAIL=integration@example.invalid
BOOTSTRAP_ADMIN_PASSWORD=integration-only-admin-password
BOOTSTRAP_CUSTOMER_EMAIL=customer@example.invalid
BOOTSTRAP_CUSTOMER_PASSWORD=integration-only-customer-password
AUTH_COOKIE_SECURE=false
ALLOWED_ORIGINS=http://127.0.0.1:3190
UPLOAD_DIR=./uploads
ENV
for volume in rebequi-postgres-data rebequi-uploads rebequi-logs; do
  # Refuse to touch an existing volume even in CI.
  if docker volume inspect "$volume" >/dev/null 2>&1; then
    printf 'Unexpected existing test volume: %s\n' "$volume" >&2
    trap - EXIT
    exit 1
  fi
  docker volume create "$volume" >/dev/null
done
compose config --quiet
# The disposable runner uses the public mirror to avoid Docker Hub IP quotas.
docker pull mirror.gcr.io/library/postgres:16-alpine
docker tag mirror.gcr.io/library/postgres:16-alpine postgres:16-alpine
compose --profile tools pull api migrator web
compose up -d --wait --wait-timeout 120 postgres
compose run --rm --no-deps migrator
compose run --rm --no-deps migrator npm run prisma:bootstrap
# Simulate merchant changes and prove a bootstrap retry cannot overwrite them.
docker exec rebequi-postgres psql -U rebequi -d rebequi -c "UPDATE products SET stock = 137, price = 19.37 WHERE id = (SELECT id FROM products ORDER BY id LIMIT 1); UPDATE users SET name = 'Preserved merchant' WHERE email = 'integration@example.invalid';" >/dev/null
compose run --rm --no-deps migrator npm run prisma:bootstrap
[[ $(docker exec rebequi-postgres psql -U rebequi -d rebequi -Atc 'SELECT count(*) FROM products WHERE stock = 137 AND price = 19.37') -ge 1 ]]
[[ $(docker exec rebequi-postgres psql -U rebequi -d rebequi -Atc "SELECT name FROM users WHERE email = 'integration@example.invalid'") == 'Preserved merchant' ]]
compose run --rm --no-deps migrator node /app/node_modules/prisma/build/index.js migrate status
# A second migration execution verifies the no-op update path.
compose run --rm --no-deps migrator
compose up -d --no-build --wait --wait-timeout 180 api web

curl -fsS http://127.0.0.1:3190/api/health | grep -q '"status":"ok"'
curl -fsS http://127.0.0.1:3190/health | grep -q healthy
curl -fsSI http://127.0.0.1:3190/ | grep -qi '^Cache-Control: no-store'
html=$(curl -fsS http://127.0.0.1:3190/)
asset=$(printf '%s' "$html" | grep -oE '/assets/[^" ]+\.(js|css)' | sed -n '1p')
curl -fsSI "http://127.0.0.1:3190$asset" | grep -qi 'Cache-Control: .*immutable'
[[ $(docker exec rebequi-api cat /app/.release-version) == "$RELEASE_VERSION" ]]
[[ $(docker exec rebequi-web cat /usr/share/nginx/html/release.txt) == "$RELEASE_VERSION" ]]

login() {
  curl -fsS --cookie-jar "$TEST_DIR/cookies" -H 'Content-Type: application/json' \
    --data '{"identifier":"integration@example.invalid","password":"integration-only-admin-password"}' \
    http://127.0.0.1:3190/api/auth/login | grep -q '"success":true'
  curl -fsS --cookie "$TEST_DIR/cookies" http://127.0.0.1:3190/api/auth/me | grep -q '"role":"ADMIN"'
}
login
# Production runtime must not contain a local inference engine.
if docker exec rebequi-api sh -c 'command -v python3'; then
  echo 'Unexpected local Python runtime' >&2
  exit 1
fi
docker exec rebequi-api node --input-type=module -e 'import sharp from "sharp"; import {PrismaClient} from "@prisma/client"; const p=new PrismaClient(); await p.$connect(); await sharp({create:{width:32,height:32,channels:3,background:"white"}}).png().toFile("/app/uploads/ocr-smoke.png"); await p.$disconnect();'
# No paid credentials in CI. Exercise cloud protocol with mocks in unit tests,
# then prove HTTP upload persists the draft when no provider is configured.
docker cp rebequi-api:/app/uploads/ocr-smoke.png "$TEST_DIR/ocr.png"
curl -fsS --cookie-jar "$TEST_DIR/customer-cookies" -H 'Content-Type: application/json' \
  --data '{"name":"Smoke Customer","whatsapp":"11987654325"}' \
  http://127.0.0.1:3190/api/quotes/public/start >/dev/null
curl -fsS --cookie "$TEST_DIR/customer-cookies" -F "document=@$TEST_DIR/ocr.png;type=image/png" \
  http://127.0.0.1:3190/api/quotes/public/anonymous-document >"$TEST_DIR/draft.json"
draft_token=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).data.token)' "$TEST_DIR/draft.json")
for ((attempt=0; attempt<15; attempt++)); do
  curl -fsS --cookie "$TEST_DIR/customer-cookies" "http://127.0.0.1:3190/api/quotes/public/anonymous/$draft_token" >"$TEST_DIR/draft-status.json"
  ocr_status=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).data.ocrStatus)' "$TEST_DIR/draft-status.json")
  [[ "$ocr_status" == FAILED ]] && break
  sleep 1
done
[[ "$ocr_status" == FAILED ]]
node -e 'const q=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).data; require("assert").ok(q.documentUrl || q.documentPath || q.originalDocumentUrl, "Original document must be preserved"); console.log("Quote draft survives unavailable cloud providers");' "$TEST_DIR/draft-status.json"

# Verify actual upload/download routes, not just volume presence.
docker exec rebequi-api node --input-type=module -e 'import sharp from "sharp"; await sharp({create:{width:32,height:32,channels:3,background:"white"}}).png().toFile("/app/uploads/persistence-smoke.png");'
curl -fsS http://127.0.0.1:3190/uploads/persistence-smoke.png -o "$TEST_DIR/upload.png"
curl -fsS --cookie "$TEST_DIR/cookies" -F "image=@$TEST_DIR/upload.png;type=image/png" \
  http://127.0.0.1:3190/api/products/images/upload >"$TEST_DIR/upload-response.json"
uploaded_path=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).data.url)' "$TEST_DIR/upload-response.json")
[[ "$uploaded_path" == /uploads/* ]]
curl -fsS "http://127.0.0.1:3190$uploaded_path" -o "$TEST_DIR/multipart.png"
node -e 'const fs=require("fs");const image=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).data;const bytes=fs.readFileSync(process.argv[2]);if(image.mimeType!=="image/webp"||image.width!==1200||image.height!==1200||image.size!==bytes.length||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP")throw new Error("Upload not normalized to bounded WebP");' "$TEST_DIR/upload-response.json" "$TEST_DIR/multipart.png"
compose up -d --no-deps --no-build --force-recreate --wait --wait-timeout 180 api
compose up -d --no-deps --no-build --force-recreate --wait --wait-timeout 120 web
curl -fsS http://127.0.0.1:3190/uploads/persistence-smoke.png -o "$TEST_DIR/upload-after.png"
cmp "$TEST_DIR/upload.png" "$TEST_DIR/upload-after.png"
curl -fsS "http://127.0.0.1:3190$uploaded_path" -o "$TEST_DIR/multipart-after.png"
cmp "$TEST_DIR/multipart.png" "$TEST_DIR/multipart-after.png"
login

# Restore into a separate database in the disposable runner; never production.
docker exec rebequi-postgres pg_dump -U rebequi -d rebequi -Fc >"$TEST_DIR/backup.dump"
docker exec rebequi-postgres createdb -U rebequi rebequi_restore_test
docker exec -i rebequi-postgres pg_restore -U rebequi -d rebequi_restore_test <"$TEST_DIR/backup.dump"
original_count=$(docker exec rebequi-postgres psql -U rebequi -d rebequi -Atc 'SELECT count(*) FROM users')
restored_count=$(docker exec rebequi-postgres psql -U rebequi -d rebequi_restore_test -Atc 'SELECT count(*) FROM users')
[[ "$original_count" == "$restored_count" && "$original_count" -gt 0 ]]

# Run the real deploy script with an incompatible release manifest. Its actual
# image-version check must reject the release and restore existing containers,
# credentials and upload volumes before any host proxy changes.
sudo mkdir -p /opt/rebequi/releases/test-before /opt/rebequi/releases/test-failing
sudo chown -R "$(id -un):$(id -gn)" /opt/rebequi
cp "$TEST_DIR/.env.production" /opt/rebequi/.env.production
for release in test-before test-failing; do
  cp docker-compose.production.yml "/opt/rebequi/releases/$release/"
  ln -s /opt/rebequi/.env.production "/opt/rebequi/releases/$release/.env.production"
  printf 'API_IMAGE_REF=%s\nMIGRATOR_IMAGE_REF=%s\nWEB_IMAGE_REF=%s\nRELEASE_VERSION=%s\n' \
    "$API_IMAGE_REF" "$MIGRATOR_IMAGE_REF" "$WEB_IMAGE_REF" "$RELEASE_VERSION" \
    >"/opt/rebequi/releases/$release/.images.env"
done
ln -s /opt/rebequi/releases/test-before /opt/rebequi/current
mkdir -p /opt/rebequi/releases/test-failing/scripts
cp scripts/deploy-production.sh /opt/rebequi/releases/test-failing/scripts/
sed -i 's/^RELEASE_VERSION=.*/RELEASE_VERSION=0000000000000000000000000000000000000000/' \
  /opt/rebequi/releases/test-failing/.images.env
set +e
printf '%s\n' "$GHCR_TOKEN" | sudo \
  bash /opt/rebequi/releases/test-failing/scripts/deploy-production.sh "$GHCR_USER"
rollback_status=$?
set -e
[[ "$rollback_status" -ne 0 ]]
[[ $(readlink /opt/rebequi/current) == /opt/rebequi/releases/test-before ]]
[[ $(docker exec rebequi-api node -p 'process.env.RELEASE_VERSION') == "$RELEASE_VERSION" ]]
curl -fsS http://127.0.0.1:3190/api/health | grep -q '"status":"ok"'
curl -fsS "http://127.0.0.1:3190$uploaded_path" -o "$TEST_DIR/rollback-upload.png"
cmp "$TEST_DIR/multipart.png" "$TEST_DIR/rollback-upload.png"
login

# Browser and security flows use this runner's actual PostgreSQL and images.
npm test --prefix tests/product

curl -fsS --cookie "$TEST_DIR/cookies" --cookie-jar "$TEST_DIR/cookies" -X POST http://127.0.0.1:3190/api/auth/logout >/dev/null
[[ $(curl -sS -o /dev/null -w '%{http_code}' --cookie "$TEST_DIR/cookies" http://127.0.0.1:3190/api/auth/me) == 401 ]]
printf 'Production images: migrations, auth, OCR, upload download, recreation, backup restore and deploy rollback passed.\n'
