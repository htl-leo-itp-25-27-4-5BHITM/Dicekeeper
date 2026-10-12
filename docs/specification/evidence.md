# Live session recovery verification evidence

Verification recorded on 2026-10-07 through 2026-10-09 (Europe/Vienna). This evidence intentionally excludes credentials, cookies, token values, OIDC state, identity subjects, screenshots, traces, storage state, and raw provider responses.

## Synchronization deviation resolved

The controlled dev boundary initially reproduced the deviation against the deployed Quarkus 3.28.4 application after the configured 300-second token lifetime:

```text
OIDC_BOUNDARY_RESULT {"verdict":"refresh-invalidation-reproduced","configuredTokenLifetimeSeconds":300,"waitSeconds":305,"simultaneousRequests":8,"simultaneousStatusCounts":{"authentication-redirect":8},"followUpStatusCounts":{"499":1}}
```

Quarkus 3.28.4 dependency metadata does not contain `quarkus.oidc.token.refresh-token-cache-time-to-live`. The upstream fix for concurrent rotating refresh tokens landed in [Quarkus commit 738ddd15](https://github.com/quarkusio/quarkus/commit/738ddd15d88e708705a4759ebd082a4faa855723) and first shipped in 3.38. The project was upgraded to the current 3.40.1 LTS platform and now configures an environment-backed five-second refresh-result cache.

The same 300/305-second boundary against the upgraded local application, real development Keycloak realm, and approved development account passed:

```text
OIDC_BOUNDARY_RESULT {"verdict":"pass","configuredTokenLifetimeSeconds":300,"waitSeconds":305,"simultaneousRequests":8,"simultaneousStatusCounts":{"200":8},"followUpStatusCounts":{"200":1}}
```

This resolves the recorded server-side refresh-concurrency deviation without lengthening token or session lifetimes. Client recovery remains implemented for genuine expiry, revocation, transport failure, and stale snapshot cases.

## Real browser acceptance

`npm run verify:live-session-recovery` ran headlessly against the upgraded local application with the real development database and Keycloak realm. It selected an approved account with a started mapped campaign, removed only the application session cookie, triggered the real event-stream failure path, and retained no browser artifacts.

```text
LIVE_SESSION_RECOVERY_RESULT {"verdict":"pass","campaignRoute":"play","loginInitiations":1,"loginRouteRequests":2,"api499Responses":1,"notification499Responses":0,"authoritativeReads":["campaign","decisions","markers","state"],"finalStatus":"current","mapCanvasRestored":true}
```

The two `/api/auth/login` route requests are the expected protocol legs of one authorization initiation: the initial protected challenge and Quarkus's restored authenticated route after the callback. Only one Keycloak authorization flow was initiated.

## Release verification

| Check | Result |
| --- | --- |
| `./mvnw -B -P '!dev' test` | PASS — 39 Java tests |
| `npm run test:js` | PASS — 46 JavaScript tests across 9 files |
| `PLAYWRIGHT_HTML_OPEN=never npm run test:browser` | PASS — 8 Chromium tests |
| `./mvnw -B -P '!dev' -DskipTests package` | PASS — Quarkus 3.40.1 production package |
| `npm run verify:account-deletion-config` | PASS |
| Server dry-run of `k8s/deployment.yaml` | PASS — live API server, no mutation |
| Server dry-run of `k8s/dev/deployment.yaml` | PASS — live API server, no mutation |
| `openspec validate stabilize-live-session-recovery --type change --strict --no-interactive` | PASS |
| `openspec validate fix-account-deletion-flow --type change --strict --no-interactive` | PASS |
| `openspec instructions apply --change stabilize-live-session-recovery --json` | PASS — 21/21 tasks complete |

## Production rollout and acceptance

The approved production rollout completed on 2026-10-08. Image `ghcr.io/htl-leo-itp-25-27-4-5bhitm/dicekeeper:20261008060538` was built for `linux/amd64`, pushed with OCI index digest `sha256:338cf63ac8d1a37edbb5639348257808c39282337821cd38078355ea597fd96b`, and deployed as one ready/available replica with zero restarts. Public readiness reports the database and enabled account-deletion check `UP`, and a credential-safe Keycloak client exchange returns HTTP 200.

Public disposable-account acceptance covered an empty account, a populated owner, an unrelated survivor, a controlled provider-authentication failure, and a successful retry. The retry removed the Keycloak identity, player, owned campaign, memberships, unreferenced character, notification, profile image, and map while the unrelated player, campaign, and file survived until their own public-flow cleanup. The documented exploratory player 751 and identity were also removed through the authenticated public flow. That acceptance phase ended with four completed deletion markers and zero pending markers; the later per-hop probes brought the final count to ten completed markers.

No raw HTML, upstream diagnostic, token, secret, subject, email, or provider body appeared in the public failure UI or the reviewed application, Keycloak, VPS Nginx, or Nginx journal aggregates. VPS records for 08:15–08:30 CEST contain all four deletion 204 responses and the controlled 503; Cloudflare Analytics reports the same counts. Cloudflare's rule simulator found no matching configuration for `DELETE /api/account`, the zone has no connected Worker, and the live VPS configuration matches the repository without response-header filtering. LeoCloud ingress-controller logs remain forbidden to the student service account.

A real Quarkus HTTP integration test proves that the successful application endpoint returns `Clear-Site-Data: "cookies", "storage"`. On 2026-10-09, six additional isolated accounts completed authenticated public registration and deletion probes. The exact header was captured on 204 responses at the application, LeoCloud ingress, direct VPS, and public Cloudflare hops. A native same-origin browser Fetch response returned `null` for the header while Chromium's network event for the same request contained it, reproducing the earlier observation as a renderer-visible Fetch capture limitation rather than proxy stripping.

All six new Keycloak identities and player rows are absent; the final marker state is ten completed and zero pending. No verification browser, generated snapshot/console file, temporary configuration, credential, or port-forward remains. The final application, Keycloak, VPS access/error, and Nginx journal scans found no disposable-identity, credential-assignment, or raw-identity-field indicators. `fix-account-deletion-flow` is therefore complete at 31/31, while `stabilize-live-session-recovery` remains complete at 21/21.
