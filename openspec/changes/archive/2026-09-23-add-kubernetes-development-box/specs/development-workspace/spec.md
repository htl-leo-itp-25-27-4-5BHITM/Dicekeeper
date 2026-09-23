# Spec Delta

## Purpose

Defines a reproducible, persistent, and securely accessible Kubernetes workspace in which developers can build, test, and run Dicekeeper with the project's required tools.

## ADDED Requirements

### Requirement: DEVWS-001 Reproducible project toolchain
The development workspace SHALL run a versioned container image that provides a Java 21 JDK, Maven compatible with the project's Maven 3.9.11 wrapper, a supported Node.js LTS runtime, npm and npx, the TypeScript compiler, Git with SSH support, PostgreSQL client tools, OpenSpec CLI, Bash, curl, jq, and archive utilities. Tool versions SHALL be fixed by the image build and SHALL be inspectable from an interactive shell.

#### Scenario: Developer verifies the toolchain
- **WHEN** a developer opens a shell in a ready development workspace and requests each required tool's version
- **THEN** every required command is available and reports the version selected by the development image

#### Scenario: Workspace pod is recreated
- **WHEN** Kubernetes replaces the development workspace pod without changing the selected image
- **THEN** the replacement provides the same toolchain versions as the prior pod

### Requirement: DEVWS-002 Persistent source workspace
The development workspace SHALL mount a dedicated persistent volume at its documented workspace path. On first use it SHALL initialize a Dicekeeper checkout from the configured repository and branch, but it MUST NOT overwrite, reset, or automatically update an existing checkout or other existing workspace content. Source files, uncommitted changes, and configured build caches SHALL remain available after an ordinary pod replacement.

#### Scenario: Empty workspace starts for the first time
- **WHEN** the development pod starts with an empty persistent workspace
- **THEN** the configured Dicekeeper branch is checked out into the documented project directory and is writable by the development user

#### Scenario: Existing workspace is mounted after replacement
- **WHEN** the development pod starts with an existing checkout containing local changes
- **THEN** the pod leaves the checkout unchanged and makes the same files available to the development user

#### Scenario: Repository initialization fails
- **WHEN** the configured repository or branch cannot be cloned into an empty workspace
- **THEN** the development pod does not report ready and exposes a diagnostic initialization failure without deleting other persistent content

### Requirement: DEVWS-003 Least-privilege workspace isolation
The development workspace SHALL run as a non-root user, SHALL disallow privilege escalation, SHALL drop unnecessary Linux capabilities, and SHALL use the runtime's default seccomp profile. It MUST NOT run a Docker daemon, use privileged mode, receive an automatically mounted Kubernetes API token, expose a public Ingress, or contain repository and application secret values in its image or committed manifests.

#### Scenario: Workspace security settings are inspected
- **WHEN** an operator inspects the deployed pod specification
- **THEN** the pod and container security settings enforce non-root execution, disabled privilege escalation, dropped capabilities, default seccomp, and disabled service-account token mounting

#### Scenario: Developer accesses the workspace
- **WHEN** an authorized developer uses Kubernetes exec access
- **THEN** the developer receives a non-root shell with write access to the persistent workspace and no implicit Kubernetes API credential

#### Scenario: External client inspects namespace routing
- **WHEN** namespace Services and Ingresses are listed after installation
- **THEN** the development workspace has no public Ingress and its ports are reachable only through cluster networking or an explicit authorized port-forward

### Requirement: DEVWS-004 Cluster-aware application development
The workspace SHALL allow Dicekeeper to be built, tested, and started in Quarkus development mode against namespace-local PostgreSQL and configured Keycloak services. Development database and identity settings SHALL be supplied through environment variables and Kubernetes Secret references, while existing workstation defaults SHALL continue to work when those variables are absent. Secret values MUST NOT be emitted by helper commands or stored in the persistent Git checkout.

#### Scenario: Developer builds and tests Dicekeeper
- **WHEN** a developer runs the project's Maven test or package command in the initialized checkout
- **THEN** the command uses the workspace JDK and Maven environment and can complete without requiring tools from the developer's workstation

#### Scenario: Developer starts Quarkus in the cluster
- **WHEN** a developer starts Quarkus development mode using the documented workspace command
- **THEN** Dicekeeper listens on the configured pod interface and uses the database and identity configuration supplied to the development pod

#### Scenario: Developer runs the project on a workstation
- **WHEN** the cluster-specific development environment variables are absent
- **THEN** the existing local development defaults remain effective

### Requirement: DEVWS-005 Explicit application and debugger access
The workspace SHALL provide a namespace-local Service for the Quarkus HTTP and Java debug ports and SHALL document explicit port-forward commands for both. Starting or stopping the application process inside the workspace MUST NOT change the separately deployed `dicekeeper-dev` application Service, Deployment, or Ingress.

#### Scenario: Developer forwards the application port
- **WHEN** an authorized developer forwards the documented HTTP Service port to their workstation while Quarkus is running
- **THEN** the developer can reach the workspace application through the selected local port

#### Scenario: Developer attaches a debugger
- **WHEN** Quarkus is started with remote debugging enabled and the developer forwards the documented debug port
- **THEN** a local debugger can connect without exposing the debug port through a public Ingress

#### Scenario: Workspace application stops
- **WHEN** the workspace's Quarkus process exits or is stopped
- **THEN** the independently deployed `dicekeeper-dev` application remains available and unchanged

### Requirement: DEVWS-006 Controlled deployment lifecycle
The development workspace SHALL be installed as one explicitly named replica with resource requests and limits, a persistent-volume-safe update strategy, and an image from the project's registry. Image publication and workspace deployment SHALL be independently triggerable from production and `develop` application deployments. Operators SHALL be able to validate manifests, observe rollout state, verify the toolchain, and remove the compute workload while retaining the persistent workspace for recovery.

#### Scenario: Workspace manifests are validated
- **WHEN** an operator performs the documented server-side dry run in the target namespace
- **THEN** the cluster accepts the workspace resources without mutating the running workloads

#### Scenario: Workspace is deployed
- **WHEN** an operator publishes the development image and applies the workspace resources
- **THEN** exactly one workspace pod becomes ready with the requested resources and bound persistent volume

#### Scenario: Workspace compute is removed
- **WHEN** an operator follows the documented removal procedure without requesting data deletion
- **THEN** the Deployment and Service are removed or disabled while the workspace persistent volume remains available for restoration
