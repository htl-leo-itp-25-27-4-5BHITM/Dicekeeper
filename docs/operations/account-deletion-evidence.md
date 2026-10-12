# Account deletion implementation evidence

Local and production verification recorded on 2026-10-07 through 2026-10-09 (Europe/Vienna). This file intentionally contains no credentials, cookies, tokens, identity subjects, email addresses, provider bodies, or production profile data.

## Passing checks

| Check | Result |
| --- | --- |
| `./mvnw -B -P '!dev' test` | PASS — 39 tests; no failures or skips, on Quarkus 3.40.1 |
| `npm run test:js` | PASS — 46 tests across 9 files |
| `PLAYWRIGHT_HTML_OPEN=never npm run test:browser` | PASS — 8 tests |
| `npm run verify:account-deletion-config` | PASS — application properties, both manifests, deployment workflow, and three negative fixtures |
| `./mvnw -B -P '!dev' -DskipTests package` | PASS — Quarkus production package built |
| `kubectl -n student-it200233 apply --dry-run=server -f k8s/deployment.yaml` | PASS — production Deployment accepted by the live API server without mutation |
| `kubectl -n student-it200233 apply --dry-run=server -f k8s/dev/deployment.yaml` | PASS — development Deployment accepted by the live API server without mutation |
| `openspec validate fix-account-deletion-flow --type change --strict --no-interactive` | PASS |

## Production image and rollout

| Check | Result |
| --- | --- |
| Immutable image | `ghcr.io/htl-leo-itp-25-27-4-5bhitm/dicekeeper:20261008060538` |
| OCI index digest | `sha256:338cf63ac8d1a37edbb5639348257808c39282337821cd38078355ea597fd96b` |
| Runtime platform | PASS — `linux/amd64` |
| Kubernetes rollout | PASS — one updated/ready/available replica, zero restarts, exact immutable digest |
| Public readiness | PASS — database `UP`; account deletion `UP`, `enabled=true` |
| Keycloak client-credentials exchange | PASS — HTTP 200; token content was discarded |

The first activation pod remained unready because application validation incorrectly rejected reuse of the configured confidential `dicekeeper-web` client even though the design and deployed secret contract require that client. The old ready pod continued serving traffic. `KeycloakAdminService` was corrected to accept the configured client while retaining missing, placeholder, timeout, and realm-URL checks. The focused provider tests, all 39 backend tests, production packaging, a fresh image build, and the replacement rollout then passed.

## Keycloak maintenance evidence

- The configured `dicekeeper-web` service account is enabled.
- Its direct `realm-management` role set was inspected as exactly `manage-users`; no broader direct realm-management role was assigned.
- A real in-cluster `client_credentials` exchange returned HTTP 200 without exposing the token.
- Temporary recovery administration used the supported Keycloak bootstrap-admin recovery flow during the approved maintenance window. The temporary client, Jobs, generated Secret, and local manifests were removed. Keycloak returned to one ready/available replica.
- Standard deployed keys remain `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET`; no secret value was written to repository files or evidence.

## Public disposable-account verification

All browser actions used `https://dicekeeper.net` and isolated temporary identities. Credentials and browser storage were held only in ignored, mode-`0600` local state and removed after verification.

| Scenario | Result |
| --- | --- |
| Empty account | PASS — public profile UI returned 204; Keycloak identity and local player were absent afterward |
| Populated owner fixture | PASS — profile image, public campaign, map, two memberships, submitted character, and notification were present before deletion |
| Unrelated control fixture | PASS — separate player, private campaign, and profile image were present before deletion |
| Controlled provider failure | PASS — temporary admin-only credential override produced bounded JSON 503 `ACCOUNT_DELETION_UNAVAILABLE`; UI showed fixed retry guidance; no HTML/internal diagnostic rendered; local rows/files were unchanged |
| Provider repair and retry | PASS — real Secret configuration restored, readiness and client credentials returned to UP/200, retry returned 204 |
| Populated cleanup | PASS — owner identity/player, owned campaign, both owned-campaign memberships, submitted unreferenced character, owner notification, profile image, and map were absent |
| Isolation | PASS — unrelated player, campaign, and profile image survived owner deletion |
| Disposable cleanup | PASS — remaining control account was deleted through the public UI; all three temporary Keycloak users, rows, and files were absent |
| Exploratory cleanup | PASS — the documented test identity was authenticated after a scoped temporary password reset, verified to map to player 751, and deleted through the public UI; the Keycloak user and player 751 are absent and one completed marker remains |
| Final marker state | PASS — ten `COMPLETED`, zero pending markers after the final six-hop/header probes |

The original public browser captures did not expose `Clear-Site-Data` on any of the four observed 204 responses. A Quarkus HTTP integration test first proved that the successful application endpoint emits `Clear-Site-Data: "cookies", "storage"`, not merely that the response builder contains the header. The authorized 2026-10-09 follow-up then captured that exact header on successful 204 responses at the application, LeoCloud ingress, direct VPS, and public Cloudflare hops. A native same-origin browser `fetch()` still returned `null` from `response.headers.get('clear-site-data')`, while Playwright's network event for that same response contained the exact header. The earlier observation was therefore a renderer-visible Fetch capture limitation, not current ingress, VPS, or Cloudflare stripping. The SPA also clears session/local storage and navigates to `/`, and completed markers prevent stale-session player recreation.

## Log and resource audit

- Current application logs: zero errors; one expected Quarkus deprecation warning; zero secret/PII-pattern hits.
- The controlled failure pod emitted only `stage=preflight`, `category=AUTHENTICATION`, a correlation identifier, and upstream status 401. It emitted no provider body or identity data.
- Current Keycloak logs: zero errors; one expected `invalid_client_credentials` warning from the controlled failure; zero secret/PII-pattern hits.
- Namespace warning events were startup-readiness probe failures while Quarkus initialized; every rollout completed and the final pod is ready with zero restarts.
- No temporary recovery Jobs or Secrets remain.
- LeoCloud ingress-controller logs are outside the student service account's RBAC scope. Configured read-only VPS and Cloudflare dashboard access was available for the follow-up below; neither retained the response headers of the historical deletion requests.

## Final edge and header follow-up

The follow-up used only read-only access and aggregate/sanitized output. No request body, response body, cookie, token, identity subject, email address, client address, or credential was printed or retained.

### Exact diagnostic commands and results

| Command or dashboard action | Sanitized result |
| --- | --- |
| `sha256sum ops/nginx/dicekeeper.net.conf` and `ssh -o BatchMode=yes root@94.16.109.175 'sha256sum /etc/nginx/sites-enabled/dicekeeper.net'` | PASS — both returned `f75a5998b45f3230806ef8e9badd087fdbe630243c7f27e9eee781128b976d4f` |
| `ssh -o BatchMode=yes root@94.16.109.175 'nginx -T 2>/dev/null'` with a local search for `proxy_hide_header`, `proxy_pass_header`, `add_header`, and `Clear-Site-Data` | PASS — no response-header filtering or rewriting directive was present for the Dicekeeper route |
| Read-only `awk` aggregation of `/var/log/nginx/access.log` for `08/Oct/2026:08:20:00` through `08:25:59 +0200` | 28 requests: 21×200, 2×204, 3×303, 1×499, 1×503. `DELETE /api/account`: 2×204 and 1×503. Zero credential/PII indicator matches |
| Read-only `awk` aggregation of `/var/log/nginx/access.log` for `08/Oct/2026:08:15:00` through `08:30:59 +0200` | 90 requests: 59×200, 4×201, 4×204, 12×302, 9×303, 1×499, 1×503. All five deletion requests were present: 4×204 and 1×503. Zero credential/PII indicator matches |
| Read-only `awk` aggregation of `/var/log/nginx/error.log` and `journalctl -u nginx` over the same windows | Zero matching errors or severe events; zero credential/PII indicator matches |
| `kubectl --context leocloud -n student-it200233 logs deployment/dicekeeper --since-time=2026-10-08T06:15:00Z --timestamps` with aggregate-only classification | Current pod began logging at 08:23:02 CEST: zero errors, one known deprecation warning, four info lines, zero credential/PII indicator matches |
| `kubectl --context leocloud -n student-it200233 logs deployment/keycloak --since-time=2026-10-08T06:15:00Z --timestamps` with aggregate-only classification | Zero errors, one expected controlled `invalid_client_credentials` event, zero credential/PII indicator matches |
| `kubectl --context leocloud auth can-i get pods -n ingress-nginx` and `kubectl --context leocloud auth can-i get pods/log -n ingress-nginx` | Both returned `no`; controller logs cannot be inspected with the student service account |
| `kubectl --context leocloud -n student-it200233 port-forward deployment/dicekeeper 18081:8080` plus header-only `curl` requests to the application, the private LeoCloud prefix, direct VPS origin using `--resolve`, and the public hostname | A public readiness request returned 200 at every hop. Ordinary response headers propagated; `x-leocloud` appeared at ingress and the expected Nginx/Cloudflare transport headers appeared at later hops. This unauthenticated probe could not exercise the deletion-only header |
| Cloudflare Analytics, custom window 08:15–08:30 CEST | 4×204 and 1×503 reached Cloudflare, matching the five VPS deletion records. Six separate 521 responses did not appear in the VPS log; the aggregate view did not expose their request paths, so no association with account deletion can be established |
| Cloudflare rule simulator for both `GET /api/account` and `DELETE /api/account` | No active rule/configuration matched. The zone overview showed no connected Worker, and Snippets were unavailable on the current plan |
| `./mvnw -B -P '!dev' test` | PASS — 39/39, including a real HTTP 204 assertion for `Clear-Site-Data: "cookies", "storage"` |

### Authorized per-hop resolution on 2026-10-09

Six additional isolated accounts were registered through the public Keycloak flow and immediately deleted. Each browser session generated its credentials only in memory. The commands returned only the hop name, identity-sync status, deletion status, and `Clear-Site-Data` result.

| Exact command shape and hop | Sanitized result |
| --- | --- |
| `kubectl --context leocloud -n student-it200233 port-forward deployment/dicekeeper 18081:8080`, then `playwright-cli -s=edge-probe-app --raw run-code <in-memory registration and authenticated DELETE http://127.0.0.1:18081/api/account>` | Identity sync 200; deletion 204; `Clear-Site-Data: "cookies", "storage"` |
| `playwright-cli -s=edge-probe-ingress --raw run-code <in-memory registration and authenticated DELETE https://it200233.cloud.htl-leonding.ac.at/_dicekeeper/prod/app/api/account>` | Identity sync 200; deletion 204; `Clear-Site-Data: "cookies", "storage"` |
| `playwright-cli -s=edge-probe-vps --raw run-code <in-memory registration and authenticated direct-origin DELETE with Host dicekeeper.net>` | Identity sync 200; deletion 204; `Clear-Site-Data: "cookies", "storage"` |
| `playwright-cli -s=edge-probe-public --raw run-code <in-memory registration and authenticated DELETE https://dicekeeper.net/api/account>` | Identity sync 200; deletion 204; `Clear-Site-Data: "cookies", "storage"` |
| Two native same-origin `fetch('/api/account', { method: 'DELETE', credentials: 'same-origin' })` repetitions, with `page.waitForResponse(...).allHeaders()` around the second request | Both identity syncs 200 and deletions 204; both Fetch-visible headers `null`; second request's Chromium network-visible header `"cookies", "storage"` |

The browser/network result reproduces and explains the old discrepancy. The header is present at the public network boundary, but the current Chromium renderer does not expose it through the Fetch `Headers` view used by the earlier inspection. This is consistent with the Clear-Site-Data processing model, which handles the header in the user agent before rendering the response ([W3C Clear Site Data, Fetch Integration](https://www.w3.org/TR/clear-site-data/#fetch-integration)).

Cleanup and final audit results:

- `kubectl --context leocloud -n student-it200233 exec postgres-0 -- psql -U dicekeeper_prod -d dicekeeper_prod -Atc "select state, count(*) from account_deletion_marker group by state order by state;"` returned `COMPLETED|10` and no pending state.
- Aggregate prefix queries returned zero matching Keycloak identities and zero matching application player rows. No raw identity value was selected or printed.
- `playwright-cli close-all` followed by `playwright-cli list` returned `(no browsers)`. All six verification sessions were in-memory; generated snapshots, console files, the temporary certificate-relaxation configuration, and the port-forward were removed.
- VPS access-log aggregation for 08:10–08:25 CEST found four VPS/public-facing deletion requests, all 204. The direct application and LeoCloud-ingress probes intentionally bypassed the VPS. VPS error-log and Nginx journal counts were zero.
- Application, Keycloak, VPS access, VPS error, and Nginx journal scans found zero disposable-identity, credential-assignment, or raw-identity-field indicators. No request body, response body, cookie, token, subject, email address, client address, or credential was retained.

The per-hop verification succeeds and task 7.6 is complete.

## Environment notes

- `.mvn/maven.config` activates the development port-forward profile, so release verification disables that profile explicitly with `-P '!dev'`.
- The deployed secret contract was verified to use `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET`; obsolete `KEYCLOAK_ADMIN_CLIENT_*` names are rejected by the repository validator.
