FROM eclipse-temurin:21.0.8_9-jdk-jammy@sha256:adb9b2d15adf1833d9dae0bdc1cff61ef5a804dc58dfbfb34269f32432b2e5dc

ARG TARGETARCH
ARG MAVEN_VERSION=3.9.11
ARG MAVEN_SHA512=bcfe4fe305c962ace56ac7b5fc7a08b87d5abd8b7e89027ab251069faebee516b0ded8961445d6d91ec1985dfe30f8153268843c89aa392733d1a3ec956c9978
ARG NODE_VERSION=24.21.0
ARG NODE_SHA256=fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6
ARG TYPESCRIPT_VERSION=7.0.2
ARG OPENSPEC_VERSION=1.13.1
ARG DEV_UID=10001
ARG DEV_GID=10001

LABEL org.opencontainers.image.source="https://github.com/htl-leo-itp-25-27-4-5BHITM/Dicekeeper" \
      org.opencontainers.image.description="Reproducible Dicekeeper Kubernetes development workspace"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN test "${TARGETARCH}" = "amd64" \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        iproute2 \
        jq \
        openssh-client \
        postgresql-client \
        procps \
        tar \
        unzip \
        xz-utils \
        zip \
    && rm -rf /var/lib/apt/lists/*

RUN curl --fail --location --show-error \
        "https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz" \
        --output "/tmp/apache-maven-${MAVEN_VERSION}-bin.tar.gz" \
    && echo "${MAVEN_SHA512}  /tmp/apache-maven-${MAVEN_VERSION}-bin.tar.gz" | sha512sum --check --strict \
    && tar --extract --gzip --file "/tmp/apache-maven-${MAVEN_VERSION}-bin.tar.gz" --directory /opt \
    && ln --symbolic "/opt/apache-maven-${MAVEN_VERSION}/bin/mvn" /usr/local/bin/mvn \
    && rm "/tmp/apache-maven-${MAVEN_VERSION}-bin.tar.gz"

RUN curl --fail --location --show-error \
        "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
        --output "/tmp/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    && echo "${NODE_SHA256}  /tmp/node-v${NODE_VERSION}-linux-x64.tar.xz" | sha256sum --check --strict \
    && tar --extract --xz --file "/tmp/node-v${NODE_VERSION}-linux-x64.tar.xz" --directory /usr/local --strip-components=1 \
    && rm "/tmp/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    && npm install --global \
        "typescript@${TYPESCRIPT_VERSION}" \
        "@fission-ai/openspec@${OPENSPEC_VERSION}" \
    && npm cache clean --force

RUN groupadd --gid "${DEV_GID}" developer \
    && useradd --uid "${DEV_UID}" --gid "${DEV_GID}" --create-home --shell /bin/bash developer \
    && mkdir --parents \
        /workspace/.cache/maven/repository \
        /workspace/.cache/npm \
        /workspace/.cache/config \
        /workspace/.home/.ssh \
        /workspace/dicekeeper \
    && chown --recursive "${DEV_UID}:${DEV_GID}" /workspace \
    && chmod 0700 /workspace/.home/.ssh \
    && chmod 1777 /tmp

COPY --chmod=0755 verify-toolchain.sh /usr/local/bin/verify-devbox-toolchain
COPY --chmod=0755 init-workspace.sh /usr/local/bin/init-dicekeeper-workspace
COPY --chmod=0755 start-quarkus-dev.sh /usr/local/bin/start-dicekeeper-dev

ENV HOME=/workspace/.home \
    MAVEN_USER_HOME=/workspace/.cache/maven \
    MAVEN_OPTS=-Dmaven.repo.local=/workspace/.cache/maven/repository \
    NPM_CONFIG_CACHE=/workspace/.cache/npm \
    XDG_CACHE_HOME=/workspace/.cache \
    XDG_CONFIG_HOME=/workspace/.cache/config \
    PATH=/opt/java/openjdk/bin:/opt/apache-maven-3.9.11/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin

USER 10001:10001
WORKDIR /workspace/dicekeeper

EXPOSE 8080 5005

CMD ["bash", "-lc", "trap 'exit 0' TERM INT; while true; do sleep 3600 & wait $!; done"]
