#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$#" -gt 0 ]; then
  manifests=("$@")
else
  manifests=(
    "$repository_root/k8s/ingress.yaml"
    "$repository_root/k8s/dev/ingress.yaml"
  )
fi

for manifest in "${manifests[@]}"; do
  if [ ! -f "$manifest" ]; then
    echo "Edge-routing manifest does not exist: $manifest" >&2
    exit 1
  fi
done

rendered="$(mktemp)"
trap 'rm -f "$rendered"' EXIT

kubectl_args=(apply --dry-run=client -o json)
for manifest in "${manifests[@]}"; do
  kubectl_args+=(-f "$manifest")
done

kubectl "${kubectl_args[@]}" > "$rendered"

python3 - "$rendered" <<'PY'
import json
import sys

PERMITTED_HOST = "it200233.cloud.htl-leonding.ac.at"
EXPECTED_ROUTES = {
    (
        "/_dicekeeper/prod/app(/|$)(.*)",
        "dicekeeper",
        80,
        "/$2",
        "dicekeeper.net",
        "student-it200233/dicekeeper-edge-production-headers",
    ),
    (
        "/_dicekeeper/prod/imagor(/|$)(.*)",
        "imagor",
        8000,
        "/imagor/$2",
        "dicekeeper.net",
        "student-it200233/dicekeeper-edge-production-headers",
    ),
    (
        "/_dicekeeper/auth(/|$)(.*)",
        "keycloak",
        8080,
        "/$2",
        "auth.dicekeeper.net",
        "student-it200233/dicekeeper-edge-auth-headers",
    ),
    (
        "/_dicekeeper/dev/app(/|$)(.*)",
        "dicekeeper-dev",
        80,
        "/$2",
        "dev.dicekeeper.net",
        "student-it200233/dicekeeper-edge-development-headers",
    ),
    (
        "/_dicekeeper/dev/imagor(/|$)(.*)",
        "imagor-dev",
        8000,
        "/imagor/$2",
        "dev.dicekeeper.net",
        "student-it200233/dicekeeper-edge-development-headers",
    ),
}


def fail(messages):
    for message in messages:
        print(f"edge-routing validation: {message}", file=sys.stderr)
    raise SystemExit(1)


with open(sys.argv[1], encoding="utf-8") as rendered_file:
    rendered = json.load(rendered_file)

items = rendered.get("items", [rendered]) if rendered.get("kind") == "List" else [rendered]
ingresses = [item for item in items if item.get("kind") == "Ingress"]
config_maps = {
    item.get("metadata", {}).get("name"): item
    for item in items
    if item.get("kind") == "ConfigMap"
}

errors = []
for ingress in ingresses:
    name = ingress.get("metadata", {}).get("name", "<unnamed>")
    for rule in ingress.get("spec", {}).get("rules", []):
        host = rule.get("host")
        if host != PERMITTED_HOST:
            errors.append(
                f"Ingress {name!r} uses forbidden rule host {host!r}; "
                f"expected {PERMITTED_HOST!r}"
            )

# Report forbidden hosts before mapping errors so deliberately invalid fixtures
# produce an actionable policy failure even when they contain only one route.
if errors:
    fail(errors)

actual_routes = set()
for ingress in ingresses:
    metadata = ingress.get("metadata", {})
    name = metadata.get("name", "<unnamed>")
    annotations = metadata.get("annotations", {})
    rewrite = annotations.get("nginx.ingress.kubernetes.io/rewrite-target")
    upstream_host = annotations.get("nginx.ingress.kubernetes.io/upstream-vhost")
    header_config = annotations.get("nginx.ingress.kubernetes.io/proxy-set-headers")

    if annotations.get("nginx.ingress.kubernetes.io/use-regex") != "true":
        errors.append(f"Ingress {name!r} must enable regex paths")

    for rule in ingress.get("spec", {}).get("rules", []):
        for path in rule.get("http", {}).get("paths", []):
            service = path.get("backend", {}).get("service", {})
            port = service.get("port", {}).get("number")
            actual_routes.add(
                (
                    path.get("path"),
                    service.get("name"),
                    port,
                    rewrite,
                    upstream_host,
                    header_config,
                )
            )

missing = EXPECTED_ROUTES - actual_routes
unexpected = actual_routes - EXPECTED_ROUTES
for route in sorted(missing):
    errors.append(f"missing expected route mapping: {route}")
for route in sorted(unexpected):
    errors.append(f"unexpected route mapping: {route}")

expected_headers = {
    "dicekeeper-edge-production-headers": "dicekeeper.net",
    "dicekeeper-edge-auth-headers": "auth.dicekeeper.net",
    "dicekeeper-edge-development-headers": "dev.dicekeeper.net",
}
for config_name, canonical_host in expected_headers.items():
    config_map = config_maps.get(config_name)
    if config_map is None:
        errors.append(f"missing canonical-header ConfigMap {config_name!r}")
        continue

    data = config_map.get("data", {})
    expected_data = {
        "X-Forwarded-Host": canonical_host,
        "X-Forwarded-Proto": "https",
        "X-Forwarded-Port": "443",
    }
    for key, expected_value in expected_data.items():
        if data.get(key) != expected_value:
            errors.append(
                f"ConfigMap {config_name!r} must set {key} to {expected_value!r}"
            )

if errors:
    fail(errors)

print(
    f"Validated {len(ingresses)} edge Ingress resources, "
    f"{len(EXPECTED_ROUTES)} route mappings, and {len(expected_headers)} header ConfigMaps."
)
PY
