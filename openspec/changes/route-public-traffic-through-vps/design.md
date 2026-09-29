# Design

## Context

See `proposal.md` for motivation and `specs/public-edge-routing/spec.md` for the behavior contract.

The namespace currently has three relevant public routes:

- Ingress `dicekeeper` serves the production application and Imagor on `dicekeeper.net`, plus Keycloak on `auth.dicekeeper.net`.
- Ingress `dicekeeper-dev` serves the development application and Imagor on `dev.dicekeeper.net`.
- Ingress `dashboard` already owns `/` on the only future-permitted hostname, `it200233.cloud.htl-leonding.ac.at`.

The deployment workflow reapplies `k8s/ingress.yaml` on `main` and `k8s/dev/ingress.yaml` on `develop`, so its next run will fail once LeoCloud begins enforcing the hostname rule. All three public records are currently proxied by Cloudflare and the live responses come from LeoCloud. The target VPS already runs Nginx 1.22.1 on ports 80 and 443 for unrelated sites, has a working default catch-all, and has no active Dicekeeper virtual host or certificate. Keycloak pins `KC_HOSTNAME=https://auth.dicekeeper.net`; Quarkus already accepts forwarded proxy headers; both production and development generate host-sensitive OIDC redirects.

## Goals / Non-Goals

**Goals:**

- Keep the three current public origins and all existing public paths stable.
- Give the VPS and LeoCloud routes an explicit one-to-one service mapping that cannot collide with the dashboard.
- Preserve secure proxying, 100 MB uploads, Imagor paths, SSE behavior, and canonical OIDC redirects.
- Make the migration independently testable before DNS cutover and quickly reversible afterward.
- Keep the Nginx configuration reviewable in the repository while deploying certificates and keys only on the VPS.

**Non-Goals:**

- Moving application, Keycloak, Imagor, database, or persistent storage workloads to the VPS.
- Renaming public origins, realms, clients, callbacks, API paths, or application routes.
- Replacing Cloudflare, changing application authentication, or making the private upstream prefixes an authorization boundary.
- Modifying the existing dashboard ingress or unrelated Nginx virtual hosts.
- Automating Cloudflare DNS mutation with the repository's cache-purge token.

## Decisions

### 1. Use Cloudflare -> VPS -> LeoCloud as the request path

Cloudflare remains the public edge. Its proxied DNS records will target `94.16.109.175`; Nginx will terminate the Cloudflare origin connection and proxy over verified HTTPS to `it200233.cloud.htl-leonding.ac.at`. LeoCloud then routes by private prefix to the existing namespace Services.

```text
Browser
   |
   v
Cloudflare: dicekeeper.net / auth.dicekeeper.net / dev.dicekeeper.net
   |
   v
VPS Nginx: 94.16.109.175
   |  Host + SNI: it200233.cloud.htl-leonding.ac.at
   v
LeoCloud ingress: /_dicekeeper/...
   |
   +--> dicekeeper / imagor / keycloak / dicekeeper-dev / imagor-dev
```

This keeps workloads in LeoCloud and makes the VPS a stateless routing layer. A Cloudflare Tunnel or moving workloads to the VPS would introduce a second deployment/runtime model and is unnecessary for the stated restriction.

### 2. Route through five non-overlapping private prefixes

The external-to-upstream mapping is fixed as follows:

| Public request | LeoCloud upstream path | Service-visible path | Service |
|---|---|---|---|
| `dicekeeper.net/<path>` | `/_dicekeeper/prod/app/<path>` | `/<path>` | `dicekeeper:80` |
| `dicekeeper.net/imagor/<path>` | `/_dicekeeper/prod/imagor/<path>` | `/imagor/<path>` | `imagor:8000` |
| `auth.dicekeeper.net/<path>` | `/_dicekeeper/auth/<path>` | `/<path>` | `keycloak:8080` |
| `dev.dicekeeper.net/<path>` | `/_dicekeeper/dev/app/<path>` | `/<path>` | `dicekeeper-dev:80` |
| `dev.dicekeeper.net/imagor/<path>` | `/_dicekeeper/dev/imagor/<path>` | `/imagor/<path>` | `imagor-dev:8000` |

Five separate Ingress resources will use regex paths with rewrite targets because application/Keycloak routes strip the private prefix while Imagor must retain `/imagor`. Separating the resources also allows a different canonical upstream host and rewrite rule per backend. Every rule uses only `it200233.cloud.htl-leonding.ac.at`; the existing dashboard `/` remains the least-specific route.

Alternative: place all backends under one Ingress. Rejected because rewrite annotations apply to the whole resource and would make the application and Imagor transformations fragile. Alternative: reuse `/` on the assigned hostname. Rejected because it conflicts with `dashboard` and cannot distinguish production, auth, and development.

### 3. Make canonical proxy metadata static per route

The VPS selects the route from its own `server_name`, sets the upstream HTTP `Host` and TLS SNI to the permitted LeoCloud hostname, and forwards the original client chain. Each LeoCloud Ingress sets the backend `Host` to its canonical public hostname and uses route-specific header configuration to set trusted `X-Forwarded-Host`, `X-Forwarded-Proto=https`, and `X-Forwarded-Port=443` values. Client-supplied values cannot select the backend's canonical origin.

The production app and Imagor use `dicekeeper.net`, Keycloak uses `auth.dicekeeper.net`, and development app/Imagor use `dev.dicekeeper.net`. This is necessary because using the permitted hostname all the way to Quarkus would generate an invalid OIDC callback even though the correct Service received the request. `KC_HOSTNAME` remains unchanged and provides a second canonical-host safeguard for Keycloak.

Alternative: rely on whatever forwarding headers survive both proxies. Rejected because ingress-controller header normalization is cluster configuration and a future controller setting could leak the LeoCloud hostname into redirects. Alternative: modify the application to hard-code its public base URL. Rejected because route-owned forwarding metadata already solves the issue for all backends without application changes.

### 4. Preserve streaming, upload, and protocol behavior at both hops

The LeoCloud resources retain the existing `100m` body limit, disabled proxy buffering, and 3600-second read/send timeouts. The VPS virtual hosts use the same body limit and timeouts, HTTP/1.1 upstream connections, disabled buffering, and Upgrade/Connection handling via an Nginx `map`. Query strings and request bodies pass unchanged. The Imagor route is declared before the catch-all application route on both public application hosts.

Nginx explicitly enables upstream SNI, names `it200233.cloud.htl-leonding.ac.at`, enables certificate verification against the system CA bundle, and uses the same hostname in the upstream HTTP `Host`. It does not disable certificate verification.

### 5. Store the Nginx template and runbook, not secrets

Implementation will add a repository-owned Nginx site template and a runbook containing validation, deployment, cutover, rollback, and cleanup commands. Apply copies the reviewed site to a new `/etc/nginx/sites-available/dicekeeper.net` file, enables only that site, runs `nginx -t`, and reloads Nginx. It does not edit existing site files or the default catch-all.

A dedicated Cloudflare Origin CA certificate covering `dicekeeper.net` and `*.dicekeeper.net` will be installed under dedicated VPS paths with a root-readable private key. Cloudflare must use Full (strict) mode before the DNS cutover. Certificate material and Cloudflare credentials are never written to the repository. A publicly trusted ACME certificate obtained with DNS-01 is an acceptable operational substitution if it covers the same names and does not require weakening Cloudflare TLS mode.

The VPS root login currently emits SDKMAN/PATH startup errors during non-interactive SSH. Remote commands therefore use an explicit safe `PATH` and absolute shell where needed; repairing the unrelated shell profile is outside this change.

### 6. Create new resource names and retain legacy resources for rollback

The compliant manifests use new resource names instead of modifying `dicekeeper` and `dicekeeper-dev`. Applying them creates a parallel path and leaves the working legacy ingresses untouched. The repository and workflow then manage only the compliant names, so later deployments never submit the forbidden hosts. The legacy resources are deleted manually only after the observation window.

Alternative: edit the two live ingresses in place. Rejected because it removes the current public route before the VPS/DNS path can be validated and weakens rollback. Alternative: leave the old manifests under CI management. Rejected because every later `kubectl apply` would be denied by the new admission policy.

## Risks / Trade-offs

- [Two proxy hops add latency and another availability dependency] -> Keep Nginx stateless, monitor all three public hosts, retain direct legacy ingress rollback during migration, and document VPS recovery.
- [LeoCloud may reject regex, rewrite, header ConfigMap, or duplicate-host behavior] -> Use server-side dry-run first, then create the new resources without touching legacy routes and test every private prefix directly.
- [Incorrect forwarding metadata breaks login or produces internal redirects] -> Validate OIDC discovery, login `Location`, callback host, logout, and cookies for both production and development before DNS cutover.
- [Prefix rewrite errors can send production media to the application or mix environments] -> Use separate named Ingress resources, exact route tests, and a mapping table mirrored by automated manifest tests.
- [Cloudflare origin TLS or DNS changes can cause an outage] -> Install and validate the origin certificate before changing DNS, use Full (strict), lower or account for TTL, record previous record values, and make reverting those values the first rollback action.
- [SSE buffering or short timeouts may only appear under real traffic] -> Test an authenticated stream through the final public route and retain matching timeout/buffering settings on both hops.
- [The private prefixes are reachable directly on the assigned hostname] -> Treat them as routing identifiers, not secrets; application and Keycloak authorization remain authoritative and no administrative bypass is introduced.
- [Production and development deploy from different branches] -> Land the compliant manifests and workflow safeguards on both branches before removing either legacy ingress.

## Migration Plan

1. Add the five compliant Ingress resources, route header ConfigMaps, Nginx site template, manifest checks, and operator runbook in the repository. Validate YAML, Nginx syntax in an isolated include context, and the expected host/path mapping without mutating live systems.
2. Run client-side and server-side Kubernetes dry-runs. Create the compliant resources under new names, verify that the dashboard route is unchanged, and request every private prefix through `it200233.cloud.htl-leonding.ac.at`.
3. Obtain and install the dedicated origin certificate and key on the VPS. Copy the new site configuration without altering unrelated sites, run `nginx -t`, reload, and preflight each public hostname against `94.16.109.175` with explicit name resolution.
4. Verify production pages/API, production Imagor, Keycloak discovery/login redirect/callback/logout, development pages/API/Imagor/login, a representative upload, and an authenticated SSE stream through the preflight route. Stop without changing DNS on any failure.
5. Record the existing Cloudflare record targets and proxy/TLS settings. Point the proxied A records for `dicekeeper.net`, `auth.dicekeeper.net`, and `dev.dicekeeper.net` to `94.16.109.175`, keeping Full (strict) TLS.
6. Repeat the complete smoke suite through normal public DNS and observe Nginx, Cloudflare, LeoCloud, application, and Keycloak errors. During the rollback window, restore the recorded DNS targets immediately if a required check fails.
7. Ensure the compliant ingress manifests and deployment safeguards exist on both `main` and `develop`. After the documented healthy observation period, delete only the legacy `dicekeeper` and `dicekeeper-dev` Ingress resources and confirm a later deployment succeeds.

Rollback after DNS cutover restores the recorded Cloudflare targets while the legacy ingresses are still present. If the compliant resources themselves cause a cluster issue before cutover, delete only the new resource names; the current public path remains untouched. Once the legacy resources have been removed, rollback is a forward repair through the VPS path or recreation of a compliant route, not restoration of forbidden host rules.
