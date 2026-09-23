# Design

## Context

The repository builds a Quarkus 3.28.4 application with Java 21 and the Maven 3.9.11 wrapper. It also contains Node-based development scripts, an empty npm lockfile, plain JavaScript frontend assets, OpenSpec artifacts, and Kubernetes manifests for separate production and `develop` application deployments. PostgreSQL and Keycloak already run in namespace `student-it200233`, the default storage provisioner successfully binds existing PVCs, and the current identity has permission to create the namespaced resources required here.

The existing `dicekeeper-dev` Deployment is a runtime-only application image. It must remain independent from the proposed interactive workspace. See `proposal.md` for the motivation and `specs/development-workspace/spec.md` for observable requirements.

## Goals / Non-Goals

**Goals:**

- Produce the same core toolchain after every pod replacement.
- Preserve source, uncommitted work, and dependency caches independently of pod lifetime.
- Support compiling, testing, running, and debugging Dicekeeper close to its cluster dependencies.
- Reuse existing namespace infrastructure without coupling the workspace lifecycle to the deployed development application.
- Limit the workspace's privileges and external exposure.

**Non-Goals:**

- Hosting a public browser IDE or SSH server.
- Running Docker-in-Docker or granting privileged container access.
- Replacing the existing GitHub Actions application build and deployment path.
- Automatically pushing source changes or storing a developer's Git credentials in the image or repository.
- Sharing the existing application uploads PVC with the workspace.

## Decisions

### Use a dedicated, versioned development image

Add `devbox/Dockerfile` based on a maintained Java 21 JDK Linux image. Install Maven 3.9.11, a pinned Node.js LTS release with npm/npx, a pinned TypeScript compiler, Git and OpenSSH client, PostgreSQL client, OpenSpec CLI 1.13.1, Bash, curl, jq, unzip, and required certificates. Build for the cluster's `linux/amd64` platform and publish as `ghcr.io/htl-leo-itp-25-27-4-5bhitm/dicekeeper-devbox` with both an immutable commit tag and a movable development tag.

This is preferred over installing packages at pod startup because startup remains deterministic and does not depend on package repositories. Reusing the application's multi-stage Dockerfile was rejected because its final image intentionally contains only a JRE and packaged application. A generic prebuilt dev image was rejected because it would not pin the project-specific Maven, OpenSpec, and auxiliary tools together.

### Use a one-replica Deployment with a dedicated workspace PVC

Create `k8s/devbox/` manifests for:

- `dicekeeper-devbox-workspace`, a 10 Gi `ReadWriteOnce` PVC using the namespace's default storage class.
- `dicekeeper-devbox`, a one-replica Deployment using the `Recreate` strategy.
- `dicekeeper-devbox`, a ClusterIP Service exposing HTTP port 8080 and debug port 5005.

Mount the PVC at `/workspace`, set the checkout path to `/workspace/dicekeeper`, and place Maven and npm caches below `/workspace/.cache`. The image's non-root user owns writable workspace paths. A startup init container using the same tool image clones the public HTTPS `develop` branch only when `/workspace/dicekeeper/.git` is absent. If content already exists, initialization leaves it untouched; repository updates remain an explicit developer action.

A StatefulSet was considered, but stable network identity and ordered replicas add no value for a single interactive pod. `Recreate` avoids two Deployment revisions contending for a single-writer volume during rollout.

### Access through Kubernetes authorization and port-forwarding

Interactive access uses `kubectl exec -it deployment/dicekeeper-devbox -- bash`. The Service exists only to make application and debugger port-forwarding stable across pod replacement. No Ingress, SSH daemon, or code-server process is added.

The pod sets `automountServiceAccountToken: false`. Container security uses a non-root UID/GID, `allowPrivilegeEscalation: false`, all capabilities dropped, and `seccompProfile: RuntimeDefault`. The root filesystem is read-only where the chosen tools permit it, with writable `/workspace` and `/tmp` volumes. These controls are preferable to giving a convenient development shell implicit authority over the namespace.

### Keep development runtime configuration environment-driven

Update the Quarkus `%dev` datasource properties to read `DEV_DB_USERNAME`, `DEV_DB_PASSWORD`, and `DEV_DB_JDBC_URL`, preserving the current localhost values as fallbacks. The Deployment maps those variables from `dicekeeper-dev-db-secret`. Identity variables are mapped from the existing development secret without copying their values into manifests.

Quarkus binds to `0.0.0.0` only in the documented in-cluster start command so the Service can reach it; ordinary workstation behavior remains unchanged. Full browser login through a local port-forward requires the configured Keycloak client to allow `http://localhost:8080/api/auth/callback`, as already documented for local development. The workspace documentation will distinguish cluster-internal endpoints from browser-reachable identity endpoints.

Using the `%prod` profile from the workspace was rejected because it would hide development-mode behavior and hot reload. Mounting production secrets was rejected; only development-scoped credentials are referenced.

### Build and deploy independently through CI

Add a dedicated workflow for the development image rather than extending the application deploy job. It runs on manual dispatch and on relevant changes to the devbox image or manifests, publishes immutable and development tags, applies manifests with the existing kubeconfig secret, substitutes the immutable image tag, waits for rollout, and verifies the installed toolchain. Separating workflows prevents a workspace-only edit from rebuilding or restarting the production application.

The workflow and local helper perform `kubectl apply --dry-run=server` before mutation. A helper script provides `status`, `shell`, `port-forward`, and validation operations while always resolving or accepting the intended namespace explicitly.

### Treat Git write credentials as developer-supplied runtime state

The initial clone uses the repository's public HTTPS endpoint and needs no credential. Developers who need to push SHALL configure a short-lived token, SSH material, or Git credential mechanism at runtime according to the documentation. No credential is included in the image, manifest, init container command, or Git checkout. Automatic Git synchronization was rejected because it could overwrite uncommitted work in the persistent workspace.

## Risks / Trade-offs

- **Interactive shells can read development credentials supplied to the pod** -> Mount only development-scoped secrets, document their exposure, and avoid production credentials and Kubernetes API tokens.
- **A persistent checkout can accumulate stale dependencies or broken state** -> Provide documented cache-clean and fresh-checkout recovery procedures without automatic deletion.
- **A `ReadWriteOnce` volume and `Recreate` strategy cause brief rollout downtime** -> Accept this for a single-user workspace and retain all source data on the PVC.
- **The selected resource limits may be insufficient for large Java builds** -> Start with documented requests and limits, observe actual use, and allow explicit manifest adjustment without changing the capability contract.
- **Keycloak redirect configuration can block browser login through a port-forward** -> Validate the localhost callback prerequisite and document API/build testing that remains available when browser login is not configured.
- **A movable development image tag can drift** -> Deploy commit-addressed tags and retain the movable tag only as a convenience pointer.

## Migration Plan

1. Build and publish the initial development image under an immutable commit tag.
2. Validate the PVC, Service, and Deployment with a server-side dry run in `student-it200233`.
3. Apply the PVC and Service, then the Deployment with the immutable image tag.
4. Wait for the PVC to bind and the single pod to become ready.
5. Verify all required tool versions, the initialized checkout, Maven tests, Quarkus startup, and HTTP/debug port-forwarding.
6. Confirm the existing `dicekeeper-dev` Deployment, Service, and Ingress were not changed.

Rollback removes or scales down the development Deployment and removes its Service. The workspace PVC is retained by default so a corrected image can be deployed without losing work. PVC deletion is a separate, explicit destructive operation after backup or confirmation.
