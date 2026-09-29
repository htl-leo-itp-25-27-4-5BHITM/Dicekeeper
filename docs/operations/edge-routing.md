# Dicekeeper public edge routing runbook

This runbook moves the three public Dicekeeper hostnames to the path
Cloudflare -> VPS `94.16.109.175` -> LeoCloud
`it200233.cloud.htl-leonding.ac.at`. Stop at the first failed required check.
Do not change public DNS until every pre-cutover check passes.

The private prefixes are routing identifiers, not authorization boundaries.
Never store certificates, private keys, API tokens, authenticated cookie jars,
or Cloudflare rollback values in this repository.

## Fixed resource inventory

New production resources:

- ConfigMaps `dicekeeper-edge-production-headers` and
  `dicekeeper-edge-auth-headers`
- Ingresses `dicekeeper-edge-app`, `dicekeeper-edge-imagor`, and
  `dicekeeper-edge-auth`

New development resources:

- ConfigMap `dicekeeper-edge-development-headers`
- Ingresses `dicekeeper-dev-edge-app` and
  `dicekeeper-dev-edge-imagor`

The retained rollback Ingresses are `dicekeeper` and `dicekeeper-dev`.
Ingress `dashboard` continues to own `/` on the assigned LeoCloud hostname.
Do not edit or delete any of those three resources during preparation,
cutover, or the rollback window.

## 1. Prepare the operator record

Create a private record directory outside the repository. Set an explicit
absolute path appropriate for the operator workstation; do not put it below
the Dicekeeper checkout.

```bash
export EDGE_RECORD_DIR=/absolute/private/path/dicekeeper-edge-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 0700 "$EDGE_RECORD_DIR"
umask 077
date -u +%Y-%m-%dT%H:%M:%SZ | tee "$EDGE_RECORD_DIR/start-time.txt"
```

Record the public status, Cloudflare-facing DNS answers, all live Ingress YAML,
and the existing dashboard route. These files contain no Kubernetes Secret
objects, but the directory remains private because it is an operational
record.

```bash
for host in dicekeeper.net auth.dicekeeper.net dev.dicekeeper.net; do
  curl --silent --show-error --output /dev/null --dump-header "$EDGE_RECORD_DIR/${host}.headers" "https://${host}/"
  dig +short A "$host" > "$EDGE_RECORD_DIR/${host}.dns-a"
  dig +short AAAA "$host" > "$EDGE_RECORD_DIR/${host}.dns-aaaa"
done
kubectl -n student-it200233 get ingress -o yaml > "$EDGE_RECORD_DIR/ingresses-before.yaml"
kubectl -n student-it200233 get ingress -o jsonpath='{range .items[?(@.metadata.name=="dashboard")].spec.rules[*]}{.host}{" "}{range .http.paths[*]}{.path}{"\n"}{end}{end}' > "$EDGE_RECORD_DIR/dashboard-route-before.txt"
```

In the operator record, explicitly confirm that the rollback Ingress names are
`dicekeeper` and `dicekeeper-dev`, and record the current origin for each of
the three public hostnames. Do not infer an origin from `dig` while a record is
proxied; capture it from Cloudflare as described in section 6.

## 2. Validate and create only the parallel LeoCloud resources

Run all four checks before applying either manifest:

```bash
scripts/validate-edge-routing.sh
kubectl -n student-it200233 apply --dry-run=client -f k8s/ingress.yaml
kubectl -n student-it200233 apply --dry-run=server -f k8s/ingress.yaml
kubectl -n student-it200233 apply --dry-run=client -f k8s/dev/ingress.yaml
kubectl -n student-it200233 apply --dry-run=server -f k8s/dev/ingress.yaml
```

Apply the two multi-resource files. They contain only the eight new resources
listed above and do not update the retained rollback Ingresses.

```bash
kubectl -n student-it200233 apply -f k8s/ingress.yaml
kubectl -n student-it200233 apply -f k8s/dev/ingress.yaml
kubectl -n student-it200233 get configmap dicekeeper-edge-production-headers dicekeeper-edge-auth-headers dicekeeper-edge-development-headers -o wide
kubectl -n student-it200233 get ingress dicekeeper-edge-app dicekeeper-edge-imagor dicekeeper-edge-auth dicekeeper-dev-edge-app dicekeeper-dev-edge-imagor -o wide
kubectl -n student-it200233 get ingress -o yaml > "$EDGE_RECORD_DIR/ingresses-after-parallel-create.yaml"
kubectl -n student-it200233 get ingress -o jsonpath='{range .items[?(@.metadata.name=="dashboard")].spec.rules[*]}{.host}{" "}{range .http.paths[*]}{.path}{"\n"}{end}{end}' > "$EDGE_RECORD_DIR/dashboard-route-after-parallel-create.txt"
```

Compare the before/after records. The dashboard must still own `/`, and the
two retained rollback Ingresses must be byte-for-byte unchanged.

## 3. Test the private LeoCloud routes directly

Use a known existing image path from each environment for the Imagor checks.
Keep the public path beginning with `/imagor/`; the private prefix is added in
front of it.

```bash
export PROD_IMAGOR_PATH=/imagor/REPLACE_WITH_A_VALID_PRODUCTION_IMAGE_PATH
export DEV_IMAGOR_PATH=/imagor/REPLACE_WITH_A_VALID_DEVELOPMENT_IMAGE_PATH
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-prod-app.headers" --output "$EDGE_RECORD_DIR/upstream-prod-app.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/prod/app/"
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-prod-imagor.headers" --output "$EDGE_RECORD_DIR/upstream-prod-imagor.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/prod/imagor${PROD_IMAGOR_PATH}"
curl --fail-with-body --silent --show-error --output "$EDGE_RECORD_DIR/upstream-keycloak.json" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/auth/realms/dicekeeper/.well-known/openid-configuration"
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-dev-app.headers" --output "$EDGE_RECORD_DIR/upstream-dev-app.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/dev/app/"
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-dev-imagor.headers" --output "$EDGE_RECORD_DIR/upstream-dev-imagor.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/dev/imagor${DEV_IMAGOR_PATH}"
```

Inspect the saved headers and Keycloak discovery JSON. Redirects, cookies,
OIDC issuer metadata, and callback URLs must use `dicekeeper.net`,
`auth.dicekeeper.net`, or `dev.dicekeeper.net` as appropriate. No response may
expose `it200233.cloud.htl-leonding.ac.at` or `/_dicekeeper/`. Confirm that the
application and Imagor responses come from the intended production or
development Service and are not cross-routed.

## 4. Install the dedicated VPS certificate and site

The certificate must cover `dicekeeper.net` and `*.dicekeeper.net`. A
Cloudflare Origin CA certificate is preferred; a publicly trusted ACME
certificate obtained with DNS-01 is also acceptable. The final VPS paths are:

- Certificate chain: `/etc/nginx/tls/dicekeeper.net/origin.pem`, mode `0644`
- Private key: `/etc/nginx/tls/dicekeeper.net/origin.key`, mode `0600`
- Site: `/etc/nginx/sites-available/dicekeeper.net`, mode `0644`
- Enabled link: `/etc/nginx/sites-enabled/dicekeeper.net`

The source certificate and key paths below refer to private files outside the
repository. Never paste their contents into a terminal transcript.

```bash
export ORIGIN_CERT_SOURCE=/absolute/private/path/origin.pem
export ORIGIN_KEY_SOURCE=/absolute/private/path/origin.key
ssh root@94.16.109.175 'env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "for site in /etc/nginx/sites-enabled/*; do [ -f \"\$site\" ] && sha256sum \"\$site\"; done | sort"' > "$EDGE_RECORD_DIR/nginx-sites-before.sha256"
scp "$ORIGIN_CERT_SOURCE" root@94.16.109.175:/tmp/dicekeeper-origin.pem
scp "$ORIGIN_KEY_SOURCE" root@94.16.109.175:/tmp/dicekeeper-origin.key
scp ops/nginx/dicekeeper.net.conf root@94.16.109.175:/tmp/dicekeeper.net.conf
ssh root@94.16.109.175 'env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "install -d -m 0700 /etc/nginx/tls/dicekeeper.net && install -m 0644 /tmp/dicekeeper-origin.pem /etc/nginx/tls/dicekeeper.net/origin.pem && install -m 0600 /tmp/dicekeeper-origin.key /etc/nginx/tls/dicekeeper.net/origin.key && install -m 0644 /tmp/dicekeeper.net.conf /etc/nginx/sites-available/dicekeeper.net && ln -s /etc/nginx/sites-available/dicekeeper.net /etc/nginx/sites-enabled/dicekeeper.net && nginx -t && systemctl reload nginx"'
ssh root@94.16.109.175 'env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "for site in /etc/nginx/sites-enabled/*; do [ \"\$(basename \"\$site\")\" = dicekeeper.net ] && continue; [ -f \"\$site\" ] && sha256sum \"\$site\"; done | sort"' > "$EDGE_RECORD_DIR/nginx-sites-after.sha256"
```

Compare the two checksum files after excluding the newly enabled site from the
post-install list. Existing enabled sites must be unchanged. The chained
remote command reloads Nginx only when `nginx -t` succeeds.

For a Cloudflare Origin CA certificate, download the matching Cloudflare
Origin CA root to a private local file and use it with `--cacert`; never use
`-k`. A public ACME certificate can use the workstation's default trust store.

```bash
export VPS_PREFLIGHT_CA=/absolute/private/path/cloudflare-origin-ca-root.pem
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/vps-prod.headers" --output "$EDGE_RECORD_DIR/vps-prod.body" https://dicekeeper.net/
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve auth.dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/vps-keycloak.json" https://auth.dicekeeper.net/realms/dicekeeper/.well-known/openid-configuration
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve dev.dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/vps-dev.headers" --output "$EDGE_RECORD_DIR/vps-dev.body" https://dev.dicekeeper.net/
```

## 5. Run the complete pre-cutover smoke suite

Run every request against the VPS with `--resolve`. Use a dedicated test user,
test campaign, representative image, and browser session. Store any cookie jar
only in `EDGE_RECORD_DIR` with mode `0600` and remove it after the test.

Required checks:

1. Production page and a public API response.
2. Production Imagor response for a known existing image.
3. Keycloak discovery with issuer `https://auth.dicekeeper.net/realms/dicekeeper`.
4. Production login redirect, callback, authenticated page, and logout return.
5. Development page/API, Imagor, and the development login/callback/logout.
6. An authorized multipart upload smaller than 100 MB, followed by retrieval.
7. An authenticated SSE connection that remains unbuffered and receives an
   event; keep it open long enough to detect a default short proxy timeout.

Representative non-authenticated commands:

```bash
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/precutover-prod-login.headers" --output /dev/null https://dicekeeper.net/api/auth/login
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/precutover-prod-imagor.body" "https://dicekeeper.net${PROD_IMAGOR_PATH}"
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve auth.dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/precutover-keycloak.json" https://auth.dicekeeper.net/realms/dicekeeper/.well-known/openid-configuration
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve dev.dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/precutover-dev-login.headers" --output /dev/null https://dev.dicekeeper.net/api/auth/login
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve dev.dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/precutover-dev-imagor.body" "https://dev.dicekeeper.net${DEV_IMAGOR_PATH}"
```

For the authenticated checks, set the real test URLs and IDs rather than
copying production identifiers into this document:

```bash
export AUTH_COOKIE_JAR="$EDGE_RECORD_DIR/precutover.cookies"
export AUTHORIZED_UPLOAD_URL=https://dicekeeper.net/REPLACE_WITH_AUTHORIZED_UPLOAD_ENDPOINT
export TEST_UPLOAD_FILE=/absolute/private/path/representative-upload.png
export AUTHENTICATED_SSE_URL=https://dicekeeper.net/REPLACE_WITH_AUTHENTICATED_SSE_ENDPOINT
install -m 0600 /dev/null "$AUTH_COOKIE_JAR"
curl --fail-with-body --silent --show-error --cacert "$VPS_PREFLIGHT_CA" --resolve dicekeeper.net:443:94.16.109.175 --cookie "$AUTH_COOKIE_JAR" --form "file=@${TEST_UPLOAD_FILE}" "$AUTHORIZED_UPLOAD_URL"
curl --fail-with-body --no-buffer --silent --show-error --max-time 3700 --cacert "$VPS_PREFLIGHT_CA" --resolve dicekeeper.net:443:94.16.109.175 --cookie "$AUTH_COOKIE_JAR" "$AUTHENTICATED_SSE_URL" > "$EDGE_RECORD_DIR/precutover-sse.txt"
```

Search all saved response headers and bodies for internal routing details:

```bash
if grep -R -n -E 'it200233\.cloud\.htl-leonding\.ac\.at|/_dicekeeper/' "$EDGE_RECORD_DIR"; then
  echo 'STOP: a pre-cutover response exposed an internal host or prefix' >&2
  exit 1
fi
```

Do not change DNS if any required check fails.

## 6. Snapshot Cloudflare and cut over

Before changing a record, confirm the installed certificate is valid for all
three names and Cloudflare SSL/TLS encryption mode is **Full (strict)**. Export
the zone ID and a scoped token in the operator shell; do not echo either value.

```bash
export CF_ZONE_ID=REPLACE_IN_OPERATOR_SHELL
export CF_API_TOKEN=REPLACE_IN_OPERATOR_SHELL
curl --fail-with-body --silent --show-error "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/ssl" -H "Authorization: Bearer ${CF_API_TOKEN}" -H 'Content-Type: application/json' > "$EDGE_RECORD_DIR/cloudflare-ssl-before.json"
curl --fail-with-body --silent --show-error "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&name=dicekeeper.net" -H "Authorization: Bearer ${CF_API_TOKEN}" -H 'Content-Type: application/json' > "$EDGE_RECORD_DIR/cloudflare-dicekeeper-before.json"
curl --fail-with-body --silent --show-error "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&name=auth.dicekeeper.net" -H "Authorization: Bearer ${CF_API_TOKEN}" -H 'Content-Type: application/json' > "$EDGE_RECORD_DIR/cloudflare-auth-before.json"
curl --fail-with-body --silent --show-error "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&name=dev.dicekeeper.net" -H "Authorization: Bearer ${CF_API_TOKEN}" -H 'Content-Type: application/json' > "$EDGE_RECORD_DIR/cloudflare-dev-before.json"
```

Verify the SSL response says `strict`. Verify each DNS snapshot contains
exactly one intended record and preserves its prior `content`, `proxied`, TTL,
and record ID for rollback. Keep these files outside the repository.

In the Cloudflare dashboard, change only the origin/content of the proxied A
records for `dicekeeper.net`, `auth.dicekeeper.net`, and
`dev.dicekeeper.net` to `94.16.109.175`. Do not change proxy status, TLS mode,
or unrelated records. Immediately repeat the API snapshots with `after` file
names and verify all three records have `content` `94.16.109.175` and
`proxied` `true`.

## 7. Public smoke test and rollback rule

Repeat the complete section 5 suite through normal DNS, removing every
`--resolve` and `--cacert "$VPS_PREFLIGHT_CA"` option. Also inspect Cloudflare
analytics, VPS Nginx access/error logs, the five new LeoCloud Ingresses,
application logs, and Keycloak logs. Confirm there is no cross-environment
response and no internal hostname/prefix in a response or redirect.

```bash
curl --fail-with-body --silent --show-error --output "$EDGE_RECORD_DIR/public-prod.body" https://dicekeeper.net/
curl --fail-with-body --silent --show-error --output "$EDGE_RECORD_DIR/public-keycloak.json" https://auth.dicekeeper.net/realms/dicekeeper/.well-known/openid-configuration
curl --fail-with-body --silent --show-error --output "$EDGE_RECORD_DIR/public-dev.body" https://dev.dicekeeper.net/
kubectl -n student-it200233 describe ingress dicekeeper-edge-app dicekeeper-edge-imagor dicekeeper-edge-auth dicekeeper-dev-edge-app dicekeeper-dev-edge-imagor > "$EDGE_RECORD_DIR/new-ingresses-public-smoke.txt"
kubectl -n student-it200233 logs deployment/dicekeeper --since=30m > "$EDGE_RECORD_DIR/dicekeeper-public-smoke.log"
kubectl -n student-it200233 logs deployment/dicekeeper-dev --since=30m > "$EDGE_RECORD_DIR/dicekeeper-dev-public-smoke.log"
kubectl -n student-it200233 logs deployment/keycloak --since=30m > "$EDGE_RECORD_DIR/keycloak-public-smoke.log"
ssh root@94.16.109.175 'env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "journalctl -u nginx --since=-30min --no-pager"' > "$EDGE_RECORD_DIR/nginx-public-smoke.log"
```

If any required page, API, Imagor, login redirect/callback/logout, upload, or
SSE check fails, immediately restore the three exact prior Cloudflare record
contents from the private `before` snapshots. Keep the records proxied and
keep Full (strict) enabled. Then repeat the public checks and verify the
retained rollback route is serving traffic. Do not remove the new parallel
resources while diagnosing; they do not receive public traffic after the
origin rollback.

## 8. Minimum 24-hour rollback window

Record the cutover UTC time. Observe the new route for at least 24 continuous
hours. The window is successful only after all public checks stay healthy and
both of these complete successfully against commits containing the new
manifests and workflow safeguards:

```bash
gh workflow run deploy.yml --ref main
gh workflow run deploy.yml --ref develop
gh run list --workflow deploy.yml --branch main --limit 1
gh run list --workflow deploy.yml --branch develop --limit 1
```

During the window, check for hostname-admission rejection, increased 4xx/5xx
or proxy errors, cross-environment content, internal-host redirects, failed
uploads, and interrupted SSE streams. A failed required check resets the
window after repair or triggers the rollback rule in section 7.

Before cleanup, confirm the compliant manifest and workflow changes exist on
both `main` and `develop`, both branch deployments manage only the new resource
names, and the full observation window is documented as successful.

## 9. Final legacy cleanup

Only after section 8 succeeds, delete exactly the two retained rollback
Ingresses. These are the only commands in this runbook that delete legacy
resources:

```bash
kubectl -n student-it200233 delete ingress dicekeeper
kubectl -n student-it200233 delete ingress dicekeeper-dev
```

Do not delete Services, Deployments, ConfigMaps, the dashboard Ingress,
persistent volumes, claims, or data. Repeat the complete public smoke suite,
then verify there is no live Ingress rule with an external Dicekeeper host and
both manifests still pass server-side dry-run:

```bash
kubectl -n student-it200233 get ingress -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.rules[*]}{.host}{"\n"}{end}{end}'
kubectl -n student-it200233 apply --dry-run=server -f k8s/ingress.yaml
kubectl -n student-it200233 apply --dry-run=server -f k8s/dev/ingress.yaml
```

## Operator record completion checklist

Keep this completed record in `EDGE_RECORD_DIR`, not in Git:

- Baseline capture time and the three prior Cloudflare origins
- Baseline public response status and Cloudflare-facing A/AAAA answers
- Full live Ingress snapshot, including dashboard `/`
- Exact rollback Ingress names: `dicekeeper`, `dicekeeper-dev`
- Client/server dry-run results and eight new deployed resource names
- Direct LeoCloud route results for all five mappings
- VPS certificate subject/SANs, expiry, and certificate renewal owner
- Nginx configuration check, reload time, unchanged-site checksums, and direct
  VPS TLS results
- Pre-cutover page/API, Imagor, OIDC, upload, and SSE results
- Cloudflare Full (strict) result and before/after snapshots
- Cutover UTC time and complete public smoke results
- 24-hour window start/end, production deployment run, development deployment
  run, and monitoring results
- Legacy cleanup time, post-cleanup smoke results, and final server dry-runs
