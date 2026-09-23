# Tasks

## 1. Development Image

- [x] 1.1 Add `devbox/Dockerfile` with the pinned Java 21, Maven 3.9.11, Node.js LTS, npm/npx, TypeScript, Git/SSH, PostgreSQL client, OpenSpec 1.13.1, and shell utilities; build the `linux/amd64` image successfully and verify every required version command in a container.
- [x] 1.2 Add the non-root development user, `/workspace` layout, persistent Maven/npm cache paths, writable `/tmp`, and long-running workspace command; verify the container runs as the intended UID without privilege escalation and can write only to the documented writable paths.

## 2. Cluster-Aware Development Configuration

- [x] 2.1 Change the Quarkus `%dev` datasource properties to accept `DEV_DB_USERNAME`, `DEV_DB_PASSWORD`, and `DEV_DB_JDBC_URL` with the current local values as fallbacks; run the existing Maven tests and verify both environment-driven and fallback property resolution.
- [x] 2.2 Define the documented in-cluster Quarkus start command with HTTP binding on `0.0.0.0` and remote debugging on port 5005; verify a containerized development-mode process listens on ports 8080 and 5005 without changing workstation defaults.

## 3. Kubernetes Workspace Resources

- [x] 3.1 Add `k8s/devbox/pvc.yaml` for the 10 Gi `dicekeeper-devbox-workspace` claim and `k8s/devbox/service.yaml` for HTTP and debug ports; verify both manifests pass `kubectl apply --dry-run=server` in `student-it200233`.
- [x] 3.2 Add the single-replica `dicekeeper-devbox` Deployment with `Recreate`, the workspace and temporary volumes, resource requests/limits, GHCR pull secret, development Secret references, and the required pod/container security contexts; verify the rendered pod spec has no privileged mode, public Ingress dependency, or mounted service-account token.
- [x] 3.3 Add idempotent empty-workspace initialization for the public Dicekeeper `develop` checkout; verify an empty PVC receives a writable checkout and a restarted pod preserves a sentinel file and uncommitted Git change without resetting or pulling them.
- [x] 3.4 Validate the complete `k8s/devbox/` resource set with client-side schema validation and a server-side dry run, and verify it creates no name or selector collision with `dicekeeper-dev`.

## 4. Automation and Operator Commands

- [x] 4.1 Add a dedicated GitHub Actions workflow that builds and publishes `dicekeeper-devbox` with commit and development tags, dry-runs and applies only the workspace manifests, waits for rollout, and checks tool versions; verify the workflow syntax and path/manual triggers do not invoke the existing application deployment job.
- [x] 4.2 Add a namespace-aware helper script with `validate`, `status`, `shell`, `port-forward`, and non-destructive removal operations; run each read-only operation and verify removal retains the PVC unless data deletion is separately and explicitly requested.

## 5. Documentation

- [x] 5.1 Document prerequisites, first deployment, shell access, source initialization, Git write-credential options, Maven build/test commands, Quarkus startup, HTTP/debug port-forwarding, Keycloak localhost callback requirements, cache recovery, and rollback; follow the documented happy path against a test or current namespace and correct any command that does not work as written.
- [x] 5.2 Document the security boundary and exclusions, including development-secret visibility, no production credentials, no Kubernetes API token, no public IDE/Ingress, and no Docker daemon; verify the documentation matches the applied pod specification.

## 6. Deployment and End-to-End Verification

- [x] 6.1 Publish the immutable development image, apply the validated PVC, Service, and Deployment to `student-it200233`, and verify the PVC is `Bound`, exactly one devbox pod is `Ready`, and the Deployment uses the immutable image tag.
- [x] 6.2 Enter the deployed pod and verify Java, Maven, Node.js, npm, npx, TypeScript, Git, SSH, psql, OpenSpec, Bash, curl, jq, and archive commands report the expected versions as the non-root user.
- [x] 6.3 Run the project's Maven tests and start Quarkus development mode in the workspace, then verify `/q/health/ready` over an HTTP port-forward and a debugger connection over the debug port-forward.
- [x] 6.4 Compare the existing `dicekeeper-dev` Deployment, Service, Ingress, and ready pod before and after installation, and verify they remain available and unchanged; exercise the documented non-destructive rollback and confirm the workspace PVC remains intact.
