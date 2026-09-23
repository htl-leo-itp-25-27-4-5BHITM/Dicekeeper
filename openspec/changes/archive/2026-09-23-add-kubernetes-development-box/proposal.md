# Proposal

## Why

Dicekeeper development currently depends on tools and cluster port-forwards installed on each developer's workstation. A persistent development workspace in the existing Kubernetes namespace will provide a reproducible Java and Node toolchain close to the shared PostgreSQL and Keycloak services while keeping the deployed `dicekeeper-dev` application separate.

## What Changes

- Add a versioned development-container image with Java 21, Maven, Node.js, npm, TypeScript, Git/SSH, PostgreSQL client tools, OpenSpec, and common shell utilities.
- Add a single-replica `dicekeeper-devbox` Deployment with a persistent workspace volume and non-root runtime.
- Make the workspace available through `kubectl exec` and expose application and debugger ports through a ClusterIP Service for explicit port-forwarding.
- Allow Quarkus development mode to consume cluster-specific database and identity configuration from environment variables and existing Kubernetes Secrets.
- Add CI automation for building the development image and applying its Kubernetes manifests independently of production application deployment.
- Add helper commands and documentation for deploying, entering, using, validating, and troubleshooting the development box.
- Deliberately exclude a public browser IDE, public Ingress, privileged container runtime, and automatically mounted Kubernetes API credentials from the initial scope.

## Capabilities

### New Capabilities

- `development-workspace`: Defines the reproducible, persistent, and securely accessible Kubernetes development environment for building, testing, and running Dicekeeper.

### Modified Capabilities

None.

## Impact

- Adds a development image definition and a dedicated GHCR image.
- Adds Kubernetes Deployment, PersistentVolumeClaim, and Service manifests in the current `student-it200233` namespace.
- Extends GitHub Actions without changing the existing production or `develop` application deployment contract.
- Adjusts Quarkus development-profile configuration so database and identity endpoints can be supplied by the development-box environment while preserving local defaults.
- Reuses existing development Secrets by reference; no secret values are stored in source control.
- Adds persistent storage and compute consumption for one development pod, with explicit requests and limits.
