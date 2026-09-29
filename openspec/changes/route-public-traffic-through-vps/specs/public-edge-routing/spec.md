# Spec Delta

## Purpose

Defines how Dicekeeper's stable public hostnames remain available through a VPS edge while LeoCloud accepts only the namespace's assigned hostname.

## ADDED Requirements

### Requirement: EDGE-001 Stable public endpoints
The edge routing system SHALL continue to serve the production application at `https://dicekeeper.net`, the identity provider at `https://auth.dicekeeper.net`, and the development application at `https://dev.dicekeeper.net` without exposing an internal routing prefix in a browser-visible URL. Existing application paths, query strings, HTTP methods, request bodies, response status codes, and response bodies MUST remain usable through their corresponding public hostname.

#### Scenario: Production application request
- **WHEN** a client requests an application or API path on `https://dicekeeper.net`
- **THEN** the request reaches the production Dicekeeper service with the same public path, query string, method, and body

#### Scenario: Production identity request
- **WHEN** a client requests an identity-provider path on `https://auth.dicekeeper.net`
- **THEN** the request reaches the shared Keycloak service and any advertised issuer or browser redirect continues to use `https://auth.dicekeeper.net`

#### Scenario: Development application request
- **WHEN** a client requests an application, API, or media path on `https://dev.dicekeeper.net`
- **THEN** the request reaches the development service selected for that path without changing the public hostname or exposing production application content

### Requirement: EDGE-002 LeoCloud-compliant upstream routing
Every repository-managed Ingress created or updated for the public edge SHALL declare only `it200233.cloud.htl-leonding.ac.at` as its rule hostname. The upstream routes SHALL use distinct private path prefixes for the production application, production media processor, identity provider, development application, and development media processor, and MUST NOT replace or capture the existing dashboard route at `/` on the assigned hostname.

#### Scenario: Ingress manifests are admitted
- **WHEN** the production or development deployment applies its repository-managed edge ingress resources after LeoCloud enforces the hostname restriction
- **THEN** every resource passes the hostname policy without declaring `dicekeeper.net`, `auth.dicekeeper.net`, or `dev.dicekeeper.net` as an Ingress rule host

#### Scenario: Edge selects an upstream service
- **WHEN** the VPS forwards a request using one of the defined private prefixes on the assigned LeoCloud hostname
- **THEN** LeoCloud strips only that private routing prefix and sends the intended public path to exactly the corresponding application, Keycloak, or media service

#### Scenario: Dashboard root remains independent
- **WHEN** a client requests `/` on `it200233.cloud.htl-leonding.ac.at` without a Dicekeeper private prefix
- **THEN** Dicekeeper edge routes do not claim that request and the existing dashboard ingress remains responsible for it

### Requirement: EDGE-003 Canonical proxy context
The proxy chain SHALL provide each application backend with its canonical public host, HTTPS scheme, port, and forwarding context even though LeoCloud routing uses the assigned hostname. Redirect locations, OIDC callback URLs, logout return URLs, cookie scope, and identity-provider metadata MUST remain on the applicable public hostname and MUST NOT contain the assigned LeoCloud hostname or a private routing prefix.

#### Scenario: Production login starts through the edge
- **WHEN** a guest starts sign-in from `https://dicekeeper.net`
- **THEN** Dicekeeper redirects to `https://auth.dicekeeper.net` with a callback under `https://dicekeeper.net` and neither URL exposes an internal hostname or prefix

#### Scenario: Development login starts through the edge
- **WHEN** a guest starts sign-in from `https://dev.dicekeeper.net`
- **THEN** the identity flow uses the development client's callback under `https://dev.dicekeeper.net`

#### Scenario: Forwarded headers are supplied by the edge
- **WHEN** a public request contains conflicting client-supplied forwarding headers
- **THEN** the trusted proxy hops replace or normalize the canonical host, scheme, and port used by the backend rather than allowing the client to choose them

### Requirement: EDGE-004 Long-lived and large request compatibility
The edge SHALL accept valid request bodies up to the application's existing 100 MB limit, SHALL avoid response buffering for streaming endpoints, and SHALL keep long-lived responses open for at least the existing 3600-second proxy timeout. The chain SHALL use an HTTP version and connection handling compatible with SSE and HTTP protocol upgrades.

#### Scenario: Valid large upload crosses both proxies
- **WHEN** an authorized client sends a valid upload within the 100 MB application limit
- **THEN** neither proxy rejects the request because of a smaller body-size limit and the application remains authoritative for validation

#### Scenario: SSE response remains streaming
- **WHEN** an authorized client opens a live Dicekeeper event stream
- **THEN** events are delivered without proxy batching and the connection is not closed merely because the default short proxy timeout elapsed

#### Scenario: Media transformation is requested
- **WHEN** a client requests a valid `/imagor` path on the production or development public hostname
- **THEN** the request reaches the matching environment's media processor with the `/imagor` service path intact

### Requirement: EDGE-005 Authenticated transport and configuration isolation
Public traffic SHALL use HTTPS from the client through Cloudflare to the VPS, and the VPS SHALL verify HTTPS when connecting to the assigned LeoCloud hostname. The VPS SHALL serve only the declared Dicekeeper hostnames from the Dicekeeper virtual hosts. Private keys, origin certificates, API tokens, and other deployment credentials MUST NOT be committed to the repository or emitted by validation commands.

#### Scenario: Cloudflare connects to the VPS origin
- **WHEN** Cloudflare forwards a request for a Dicekeeper public hostname after cutover
- **THEN** it validates a certificate covering that hostname and completes an encrypted origin connection

#### Scenario: VPS connects to LeoCloud
- **WHEN** the VPS forwards a request to `it200233.cloud.htl-leonding.ac.at`
- **THEN** it sends the assigned hostname for TLS SNI and HTTP routing and rejects an upstream certificate that cannot be validated for that name

#### Scenario: Unknown host reaches the VPS
- **WHEN** a request reaches the VPS with a hostname not declared for Dicekeeper
- **THEN** the Dicekeeper virtual hosts do not proxy that request to LeoCloud

### Requirement: EDGE-006 Staged cutover and recoverability
The migration SHALL make the compliant LeoCloud paths and VPS proxy verifiably ready before public DNS is changed. The legacy ingresses SHALL remain available for a defined rollback window after cutover, and routine production and development deployments during that window MUST NOT attempt to update those legacy resources. If a required production, authentication, media, or development check fails, operators SHALL be able to restore the prior Cloudflare origin while the legacy ingresses remain present.

#### Scenario: Pre-cutover validation fails
- **WHEN** any new upstream route, canonical redirect, certificate, streaming check, or Nginx configuration check fails before DNS cutover
- **THEN** public DNS remains on the legacy LeoCloud route and current public availability is unchanged

#### Scenario: Post-cutover validation fails during the rollback window
- **WHEN** a required public smoke check fails after DNS points to the VPS
- **THEN** operators restore the previous Cloudflare origin and verify service through the retained legacy ingresses

#### Scenario: Routine deployment runs after migration
- **WHEN** the production or development deployment reapplies its ingress manifest
- **THEN** it updates only the compliant resources and is not rejected for an external rule hostname

#### Scenario: Rollback window completes successfully
- **WHEN** production, authentication, media, and development routes have remained healthy for the documented observation period
- **THEN** operators may remove the unmanaged legacy ingresses without affecting the compliant edge route
