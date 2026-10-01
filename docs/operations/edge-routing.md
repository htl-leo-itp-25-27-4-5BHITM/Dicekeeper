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

- Ingresses `dicekeeper-edge-app`, `dicekeeper-edge-imagor`, and
  `dicekeeper-edge-auth`

New development resources:

- Ingresses `dicekeeper-dev-edge-app` and
  `dicekeeper-dev-edge-imagor`

Deployments `dicekeeper` and `dicekeeper-dev` set
`QUARKUS_HTTP_PROXY_ENABLE_FORWARDED_HOST=false`. This makes Quarkus use the
canonical backend `Host` pinned by each Ingress's `upstream-vhost` annotation
instead of ingress-nginx's normalized `X-Forwarded-Host`. The three former
`dicekeeper-edge-*-headers` ConfigMaps are obsolete and must not be recreated.
Each VPS virtual host also has fixed `proxy_redirect` rules that map only the
assigned LeoCloud hostname back to that virtual host's public origin and strip
the matching private prefix when present. This response-only fallback covers
redirect code paths that still derive an absolute `Location` from the
normalized forwarded host; it does not trust a client-supplied host.

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

## 2. Deploy the proxy setting and parallel LeoCloud resources

Run all checks before applying any manifest:

```bash
scripts/validate-edge-routing.sh
kubectl -n student-it200233 set env deployment/dicekeeper QUARKUS_HTTP_PROXY_ENABLE_FORWARDED_HOST=false --dry-run=server -o yaml > /dev/null
kubectl -n student-it200233 set env deployment/dicekeeper-dev QUARKUS_HTTP_PROXY_ENABLE_FORWARDED_HOST=false --dry-run=server -o yaml > /dev/null
kubectl -n student-it200233 apply --dry-run=client -f k8s/ingress.yaml
kubectl -n student-it200233 apply --dry-run=server -f k8s/ingress.yaml
kubectl -n student-it200233 apply --dry-run=client -f k8s/dev/ingress.yaml
kubectl -n student-it200233 apply --dry-run=server -f k8s/dev/ingress.yaml
```

Set the variable directly on the two existing Dicekeeper Deployments and wait
for both rollouts before applying the five Ingress resources. `kubectl set env`
preserves each currently pinned image instead of replacing it with a floating
tag from a local manifest. The repository Deployment manifests carry the same
setting for future normal deployments. The setting only disables
forwarded-host consumption; the retained legacy Ingresses already pass their
public hostname as `Host`, so their public behavior remains unchanged. Delete
only the three obsolete edge-header ConfigMaps from the superseded strategy.
The Ingress files do not update the retained rollback Ingresses.

```bash
kubectl -n student-it200233 set env deployment/dicekeeper QUARKUS_HTTP_PROXY_ENABLE_FORWARDED_HOST=false
kubectl -n student-it200233 rollout status deployment/dicekeeper --timeout=5m
kubectl -n student-it200233 set env deployment/dicekeeper-dev QUARKUS_HTTP_PROXY_ENABLE_FORWARDED_HOST=false
kubectl -n student-it200233 rollout status deployment/dicekeeper-dev --timeout=5m
kubectl -n student-it200233 apply -f k8s/ingress.yaml
kubectl -n student-it200233 apply -f k8s/dev/ingress.yaml
kubectl -n student-it200233 delete configmap dicekeeper-edge-production-headers dicekeeper-edge-auth-headers dicekeeper-edge-development-headers --ignore-not-found
kubectl -n student-it200233 get ingress dicekeeper-edge-app dicekeeper-edge-imagor dicekeeper-edge-auth dicekeeper-dev-edge-app dicekeeper-dev-edge-imagor -o wide
kubectl -n student-it200233 get ingress -o yaml > "$EDGE_RECORD_DIR/ingresses-after-parallel-create.yaml"
kubectl -n student-it200233 get ingress -o jsonpath='{range .items[?(@.metadata.name=="dashboard")].spec.rules[*]}{.host}{" "}{range .http.paths[*]}{.path}{"\n"}{end}{end}' > "$EDGE_RECORD_DIR/dashboard-route-after-parallel-create.txt"
```

Compare the before/after records. The dashboard must still own `/`, and the
two retained rollback Ingresses must be byte-for-byte unchanged. Repeat the
three public response checks from section 1 to confirm the deployment setting
did not change the retained public route.

## 3. Test the private LeoCloud routes directly

Use a known existing image path from each environment for the Imagor checks.
Keep the public path beginning with `/imagor/`; the private prefix is added in
front of it.

```bash
export PROD_IMAGOR_PATH=/imagor/REPLACE_WITH_A_VALID_PRODUCTION_IMAGE_PATH
export DEV_IMAGOR_PATH=/imagor/REPLACE_WITH_A_VALID_DEVELOPMENT_IMAGE_PATH
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-prod-app.headers" --output "$EDGE_RECORD_DIR/upstream-prod-app.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/prod/app/"
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-prod-imagor.headers" --output "$EDGE_RECORD_DIR/upstream-prod-imagor.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/prod${PROD_IMAGOR_PATH}"
curl --fail-with-body --silent --show-error --output "$EDGE_RECORD_DIR/upstream-keycloak.json" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/auth/realms/dicekeeper/.well-known/openid-configuration"
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-dev-app.headers" --output "$EDGE_RECORD_DIR/upstream-dev-app.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/dev/app/"
curl --fail-with-body --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-dev-imagor.headers" --output "$EDGE_RECORD_DIR/upstream-dev-imagor.body" "https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/dev${DEV_IMAGOR_PATH}"
```

Inspect the saved headers and Keycloak discovery JSON. Redirects, cookies,
OIDC issuer metadata, and callback URLs must use `dicekeeper.net`,
`auth.dicekeeper.net`, or `dev.dicekeeper.net` as appropriate. No response may
expose `it200233.cloud.htl-leonding.ac.at` or `/_dicekeeper/`. Confirm that the
application and Imagor responses come from the intended production or
development Service and are not cross-routed.

## 4. Install the dedicated VPS certificate and site

The certificate must cover `dicekeeper.net` and `*.dicekeeper.net`. This
deployment uses a publicly trusted Let's Encrypt certificate obtained through
Certbot's manual DNS-01 flow. Certbot manages the certificate files, and the
dedicated Nginx paths are stable symlinks to them:

- Certbot chain: `/etc/letsencrypt/live/dicekeeper.net/fullchain.pem`
- Certbot key: `/etc/letsencrypt/live/dicekeeper.net/privkey.pem`
- Nginx certificate link: `/etc/nginx/tls/dicekeeper.net/origin.pem`
- Nginx private-key link: `/etc/nginx/tls/dicekeeper.net/origin.key`
- Site: `/etc/nginx/sites-available/dicekeeper.net`, mode `0644`
- Enabled link: `/etc/nginx/sites-enabled/dicekeeper.net`

Run Certbot and add every TXT value it requests as a separate
`_acme-challenge.dicekeeper.net` record. Keep all requested values present until
issuance succeeds, then remove the temporary TXT records. Never paste private
key contents into a terminal transcript.

```bash
ssh -t root@94.16.109.175 '/usr/bin/env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "/usr/bin/certbot certonly --manual --preferred-challenges dns --cert-name dicekeeper.net -d dicekeeper.net -d \"*.dicekeeper.net\" --agree-tos --no-eff-email"'
ssh root@94.16.109.175 '/usr/bin/env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "openssl x509 -in /etc/letsencrypt/live/dicekeeper.net/fullchain.pem -noout -subject -issuer -dates -ext subjectAltName"'
ssh root@94.16.109.175 '/usr/bin/env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "for site in /etc/nginx/sites-enabled/*; do [ -f \"\$site\" ] && sha256sum \"\$site\"; done | sort"' > "$EDGE_RECORD_DIR/nginx-sites-before.sha256"
scp ops/nginx/dicekeeper.net.conf root@94.16.109.175:/tmp/dicekeeper.net.conf
ssh root@94.16.109.175 '/usr/bin/env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "install -d -m 0700 /etc/nginx/tls/dicekeeper.net && ln -s /etc/letsencrypt/live/dicekeeper.net/fullchain.pem /etc/nginx/tls/dicekeeper.net/origin.pem && ln -s /etc/letsencrypt/live/dicekeeper.net/privkey.pem /etc/nginx/tls/dicekeeper.net/origin.key && install -m 0644 /tmp/dicekeeper.net.conf /etc/nginx/sites-available/dicekeeper.net && ln -s /etc/nginx/sites-available/dicekeeper.net /etc/nginx/sites-enabled/dicekeeper.net && nginx -t && systemctl reload nginx"'
ssh root@94.16.109.175 '/usr/bin/env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "for site in /etc/nginx/sites-enabled/*; do [ \"\$(basename \"\$site\")\" = dicekeeper.net ] && continue; [ -f \"\$site\" ] && sha256sum \"\$site\"; done | sort"' > "$EDGE_RECORD_DIR/nginx-sites-after.sha256"
```

Compare the two checksum files after excluding the newly enabled site from the
post-install list. Existing enabled sites must be unchanged. The chained
remote command reloads Nginx only when `nginx -t` succeeds. This manual Certbot
certificate is not automatically renewable: the named renewal owner must
repeat the DNS-01 command before expiry, verify the renewed certificate, and
reload Nginx. Installing a scoped Certbot DNS plugin is the preferred future
automation path.

The publicly trusted ACME certificate uses the workstation's default trust
store; never use `-k`.

```bash
curl --fail-with-body --silent --show-error --resolve dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/vps-prod.headers" --output "$EDGE_RECORD_DIR/vps-prod.body" https://dicekeeper.net/
curl --fail-with-body --silent --show-error --resolve auth.dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/vps-keycloak.json" https://auth.dicekeeper.net/realms/dicekeeper/.well-known/openid-configuration
curl --fail-with-body --silent --show-error --resolve dev.dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/vps-dev.headers" --output "$EDGE_RECORD_DIR/vps-dev.body" https://dev.dicekeeper.net/
curl --silent --show-error --resolve auth.dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/vps-keycloak-root-query.headers" --output /dev/null 'https://auth.dicekeeper.net/?edge_redirect_probe=preserve-me'
```

The queried Keycloak root may be a redirect, but its `Location` must begin
with `https://auth.dicekeeper.net/`, retain
`edge_redirect_probe=preserve-me`, and contain neither the assigned LeoCloud
hostname nor `/_dicekeeper/`. Compare this with a private-upstream probe to
confirm that the VPS, rather than Cloudflare, performs the normalization:

```bash
curl --silent --show-error --dump-header "$EDGE_RECORD_DIR/upstream-keycloak-root-query.headers" --output /dev/null 'https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/auth/?edge_redirect_probe=preserve-me'
```

## 5. Run the complete pre-cutover smoke suite

Run every request against the VPS with `--resolve`. Use a dedicated test user,
test campaign, representative image, and browser session. Store any cookie jar
only in `EDGE_RECORD_DIR` with mode `0600` and remove it after the test.

Required checks:

1. Production page and a public API response.
2. Production Imagor response for a known existing image.
3. Keycloak discovery with issuer `https://auth.dicekeeper.net/realms/dicekeeper`.
4. Canonical queried-root redirect plus production login redirect, callback,
   authenticated page, and logout return.
5. Development page/API, Imagor, and the development login/callback/logout.
6. An authorized multipart upload smaller than 100 MB, followed by retrieval.
7. An authenticated SSE connection that remains unbuffered and receives an
   event; keep it open long enough to detect a default short proxy timeout.

Representative non-authenticated commands:

```bash
curl --fail-with-body --silent --show-error --resolve dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/precutover-prod-login.headers" --output /dev/null https://dicekeeper.net/api/auth/login
curl --fail-with-body --silent --show-error --resolve dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/precutover-prod-imagor.body" "https://dicekeeper.net${PROD_IMAGOR_PATH}"
curl --fail-with-body --silent --show-error --resolve auth.dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/precutover-keycloak.json" https://auth.dicekeeper.net/realms/dicekeeper/.well-known/openid-configuration
curl --fail-with-body --silent --show-error --resolve dev.dicekeeper.net:443:94.16.109.175 --dump-header "$EDGE_RECORD_DIR/precutover-dev-login.headers" --output /dev/null https://dev.dicekeeper.net/api/auth/login
curl --fail-with-body --silent --show-error --resolve dev.dicekeeper.net:443:94.16.109.175 --output "$EDGE_RECORD_DIR/precutover-dev-imagor.body" "https://dev.dicekeeper.net${DEV_IMAGOR_PATH}"
```

For the authenticated checks, set the real test URLs and IDs rather than
copying production identifiers into this document:

```bash
export AUTH_COOKIE_JAR="$EDGE_RECORD_DIR/precutover.cookies"
export AUTHORIZED_UPLOAD_URL=https://dicekeeper.net/REPLACE_WITH_AUTHORIZED_UPLOAD_ENDPOINT
export TEST_UPLOAD_FILE=/absolute/private/path/representative-upload.png
export AUTHENTICATED_SSE_URL=https://dicekeeper.net/REPLACE_WITH_AUTHENTICATED_SSE_ENDPOINT
install -m 0600 /dev/null "$AUTH_COOKIE_JAR"
curl --fail-with-body --silent --show-error --resolve dicekeeper.net:443:94.16.109.175 --cookie "$AUTH_COOKIE_JAR" --form "file=@${TEST_UPLOAD_FILE}" "$AUTHORIZED_UPLOAD_URL"
curl --fail-with-body --no-buffer --silent --show-error --max-time 3700 --resolve dicekeeper.net:443:94.16.109.175 --cookie "$AUTH_COOKIE_JAR" "$AUTHENTICATED_SSE_URL" > "$EDGE_RECORD_DIR/precutover-sse.txt"
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
ssh root@94.16.109.175 '/usr/bin/env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -c "journalctl -u nginx --since=-30min --no-pager"' > "$EDGE_RECORD_DIR/nginx-public-smoke.log"
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
- Client/server dry-run results, both application rollouts, and five new
  deployed resource names
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
