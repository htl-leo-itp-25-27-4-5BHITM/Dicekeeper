# Proposal

## Why

LeoCloud will reject any future create or update of the current Dicekeeper ingresses because they declare hostnames outside the namespace's assigned `it200233.cloud.htl-leonding.ac.at` hostname. Dicekeeper needs a compliant, testable routing path before the next deployment attempts to apply an ingress, while keeping the existing production, authentication, and development URLs available to users.

## What Changes

- Add LeoCloud ingress routes that use only `it200233.cloud.htl-leonding.ac.at`, expose the production application, production Imagor service, Keycloak, development application, and development Imagor service behind distinct private path prefixes, and pin the canonical backend `Host` per route.
- Add a dedicated Nginx reverse-proxy configuration for the existing VPS at `94.16.109.175` that accepts `dicekeeper.net`, `auth.dicekeeper.net`, and `dev.dicekeeper.net`, forwards each request to the appropriate private LeoCloud prefix, and preserves the public scheme and hostname for redirects and OIDC, including route-specific normalization of any upstream redirect that still names the assigned LeoCloud host.
- Configure the production-profile Dicekeeper applications to use the route-pinned backend `Host` instead of ingress-nginx's normalized `X-Forwarded-Host`, while continuing to honor the trusted forwarded HTTPS scheme and client chain.
- Preserve 100 MB uploads, long-lived SSE responses, streaming behavior, and future HTTP upgrade support across both proxy hops.
- Update deployment automation and operational documentation so routine production and development deployments apply only LeoCloud-compliant ingress manifests.
- Stage the rollout so the new upstream paths and VPS are verified before Cloudflare DNS is moved, with the legacy ingresses retained during a rollback window and removed only after the new path is proven stable.
- Provision a dedicated certificate for the Dicekeeper hostnames on the VPS and keep certificate material and Cloudflare credentials outside the repository.

## Capabilities

### New Capabilities

- `public-edge-routing`: Defines compliant public routing for the production application, identity provider, media processor, and development deployment through the VPS and the namespace's single permitted LeoCloud hostname, including continuity, proxy behavior, validation, and rollback.

### Modified Capabilities

None. Public URLs and the existing application, OIDC, media, and development-workspace behavior remain unchanged.

## Impact

- Repository-managed Kubernetes ingress and application deployment manifests under `k8s/` and `k8s/dev/`.
- The production/development deployment workflow in `.github/workflows/deploy.yml` and a new deployment/runbook surface for edge routing.
- Nginx on `root@94.16.109.175`, without changing unrelated virtual hosts already served by that machine.
- Cloudflare DNS and TLS/origin-certificate configuration for `dicekeeper.net`, `auth.dicekeeper.net`, and `dev.dicekeeper.net`.
- Live LeoCloud ingress resources in namespace `student-it200233`; application Deployments, Services, persistent data, public URLs, Keycloak realm/client identities, and user-facing API paths are not renamed.
