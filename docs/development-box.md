# Kubernetes Development Box

The `dicekeeper-devbox` workload is a persistent, non-root development workspace in the
`student-it200233` namespace. It is separate from the deployed `dicekeeper-dev`
application: installing, restarting, or removing the development box does not change the
application Deployment, Service, or Ingress.

## Prerequisites

- `kubectl` configured for the target cluster and authorized for the namespace.
- The existing `dicekeeper-dev-db-secret`, `dicekeeper-dev-secret`, and
  `ghcr-pull-secret` Secrets in that namespace.
- A published `linux/amd64` image at
  `ghcr.io/htl-leo-itp-25-27-4-5bhitm/dicekeeper-devbox`.
- A Keycloak development client that permits
  `http://localhost:8080/api/auth/callback`, `http://localhost:8080/*` as a post-logout
  redirect, and `http://localhost:8080` as a web origin when browser login is needed.

Select a different namespace by putting `-n NAME` before a helper command or by setting
`DICEKEEPER_DEVBOX_NAMESPACE`.

## Validate and deploy

Validate the manifests without changing the cluster:

```bash
./scripts/devbox.sh -n student-it200233 validate
```

The preferred first deployment is the **Build and Deploy Development Box** GitHub Actions
workflow. It builds `devbox/Dockerfile` for `linux/amd64`, publishes both the commit SHA
and `development` tags, server-side dry-runs only `k8s/devbox/`, substitutes the immutable
commit tag, applies those resources, waits for rollout, and verifies the toolchain.

For an already-published immutable tag, deploy manually from the repository root:

```bash
namespace=student-it200233
image=ghcr.io/htl-leo-itp-25-27-4-5bhitm/dicekeeper-devbox:COMMIT_SHA

kubectl -n "$namespace" apply -f k8s/devbox/pvc.yaml
kubectl -n "$namespace" apply -f k8s/devbox/service.yaml
sed "s|ghcr.io/htl-leo-itp-25-27-4-5bhitm/dicekeeper-devbox:development|$image|g" \
  k8s/devbox/deployment.yaml | kubectl -n "$namespace" apply -f -
kubectl -n "$namespace" rollout status deployment/dicekeeper-devbox --timeout=600s
./scripts/devbox.sh -n "$namespace" status
```

The first init container clones the public `develop` branch into
`/workspace/dicekeeper`. On later starts, it detects the existing Git checkout and leaves
all files, local commits, and uncommitted changes untouched. If the checkout path contains
non-Git data, initialization fails visibly instead of overwriting it.

## Enter and verify the workspace

```bash
./scripts/devbox.sh -n student-it200233 shell
whoami
id
verify-devbox-toolchain
```

The shell runs as UID/GID `10001`. `/workspace` is the persistent writable volume and
`/tmp` is a pod-local writable volume. The image root filesystem is read-only. Maven,
npm, configuration, home-directory state, and SSH material are placed below
`/workspace/.cache` or `/workspace/.home` so they survive pod replacement.

## Build and test

Inside the workspace:

```bash
cd /workspace/dicekeeper
./mvnw test
./mvnw package
```

The development datasource uses `DEV_DB_USERNAME`, `DEV_DB_PASSWORD`, and
`DEV_DB_JDBC_URL` from `dicekeeper-dev-db-secret`. Outside the pod, absent variables keep
the existing local defaults (`keeperofthedice`, `dicekeeper`, and the localhost JDBC URL).

## Run Quarkus and connect

Inside the workspace, start Quarkus with the image-provided command:

```bash
start-dicekeeper-dev
```

This is equivalent to:

```bash
DICEKEEPER_SKIP_LOCAL_PORT_FORWARDS=1 mvn quarkus:dev \
  -Dquarkus.http.host=0.0.0.0 \
  -Ddebug=5005 \
  -DdebugHost=0.0.0.0 \
  -Dsuspend=n
```

It changes binding only for this in-cluster process. Normal workstation `quarkus:dev`
continues to use localhost and the existing local port-forward startup.

In another terminal, forward both workspace ports:

```bash
./scripts/devbox.sh -n student-it200233 port-forward
curl --fail http://localhost:8080/q/health/ready
```

The application is then at `http://localhost:8080`; attach a Java debugger to
`localhost:5005`. Neither port has a public Ingress. For browser login, the Keycloak URL
configured for the development pod must be browser-reachable, and the Keycloak client
must allow the localhost callback listed under prerequisites. A cluster-only hostname
such as `keycloak` works for server-to-server traffic but cannot be opened by a browser on
the workstation.

## Git write credentials

The initial public HTTPS clone needs no credential. Choose a developer-controlled runtime
option only when pushing changes:

- Use a short-lived HTTPS token and Git's in-memory credential cache. Do not put the token
  in the remote URL or a committed file.
- Place a dedicated SSH key below `$HOME/.ssh` at runtime, set file mode `0600`, change the
  remote to the SSH URL, and remove the key when it is no longer needed.
- Use an organization-approved credential helper that stores state under the persistent
  `$HOME` (`/workspace/.home`).

Credential material stored under `/workspace` survives pod replacement and is readable by
anyone who can exec into this development pod. Prefer short-lived, least-privilege
credentials and remove them after use.

## Status, recovery, and rollback

Inspect the workspace without displaying Secret values:

```bash
./scripts/devbox.sh -n student-it200233 status
kubectl -n student-it200233 logs deployment/dicekeeper-devbox -c initialize-workspace
```

If a dependency cache is corrupt, stop the affected build and preserve the old cache while
creating a clean one:

```bash
timestamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "/workspace/recovery/$timestamp"
mv /workspace/.cache/maven "/workspace/recovery/$timestamp/maven"
mv /workspace/.cache/npm "/workspace/recovery/$timestamp/npm"
mkdir -p /workspace/.cache/maven/repository /workspace/.cache/npm
```

For a fresh checkout without losing work, first rename the existing directory, then
restart the pod so the init container creates a new checkout:

```bash
mv /workspace/dicekeeper "/workspace/dicekeeper.backup-$(date +%Y%m%d-%H%M%S)"
kubectl -n student-it200233 delete pod -l app.kubernetes.io/name=dicekeeper-devbox
```

Remove compute and networking while retaining all persistent source and caches:

```bash
./scripts/devbox.sh -n student-it200233 remove
kubectl -n student-it200233 get pvc dicekeeper-devbox-workspace
```

Reapply the Service and Deployment to restore the workspace. PVC deletion is deliberately
separate and destructive; after backup and explicit confirmation, use:

```bash
./scripts/devbox.sh -n student-it200233 delete-data DELETE-WORKSPACE-DATA
```

## Security boundary

- The pod runs as non-root UID/GID `10001`, drops all Linux capabilities, disallows
  privilege escalation, uses `RuntimeDefault` seccomp, and has a read-only image root.
- Kubernetes does not automatically mount a service-account token. The shell has no
  implicit Kubernetes API credential.
- Only development-scoped database and Keycloak Secrets are referenced. Do not add
  production credentials. A developer with exec access can read the development process
  environment, so namespace exec authorization is the security boundary.
- There is no Docker daemon, privileged mode, SSH server, public IDE, or workspace
  Ingress. Access is through Kubernetes authorization and explicit local port-forwarding.
- The dedicated workspace PVC is not the application uploads PVC. Normal removal retains
  it; data deletion requires the separate confirmation command above.
