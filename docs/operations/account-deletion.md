# Account deletion operations

This runbook covers the Keycloak service account used for identity administration, safe rollout, pending-deletion repair, and rollback. Never paste client secrets, access tokens, raw OIDC subjects, email addresses, or provider response bodies into commands, tickets, or logs.

## Enable the configured Keycloak client's service account

Use an authenticated `kcadm.sh` session and keep the selected realm in `KC_REALM`. Store command results in shell variables; do not print secret-bearing responses.

```bash
export KC_REALM=dicekeeper
export KC_ADMIN_CLIENT_ID=dicekeeper-web

client_uuid="$(kcadm.sh get clients -r "$KC_REALM" -q clientId="$KC_ADMIN_CLIENT_ID" --fields id --format csv --noquotes)"
kcadm.sh update "clients/$client_uuid" -r "$KC_REALM" -s serviceAccountsEnabled=true

service_user_id="$(kcadm.sh get "clients/$client_uuid/service-account-user" -r "$KC_REALM" --fields id --format csv --noquotes)"
realm_management_id="$(kcadm.sh get clients -r "$KC_REALM" -q clientId=realm-management --fields id --format csv --noquotes)"
manage_users_id="$(kcadm.sh get "clients/$realm_management_id/roles/manage-users" -r "$KC_REALM" --fields id --format csv --noquotes)"

kcadm.sh create "users/$service_user_id/role-mappings/clients/$realm_management_id" \
  -r "$KC_REALM" \
  -b "[{\"id\":\"$manage_users_id\",\"name\":\"manage-users\"}]"
```

Assign only `realm-management/manage-users`. Do not assign `realm-admin`, `manage-realm`, `manage-clients`, or composite realm-management roles. Confirm the effective mapping without retrieving credentials:

```bash
kcadm.sh get "users/$service_user_id/role-mappings/clients/$realm_management_id/composite" \
  -r "$KC_REALM" --fields name
```

Retrieve or rotate the client secret only into the approved GitHub Actions secret and Kubernetes Secret workflows. Do not echo it. Revoke a suspected credential by regenerating the client secret, updating the approved stores, and restarting the deployment. Disable its service account when administrative access must be revoked without disabling browser login.

The deployed names are `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET`; development uses `DEV_KEYCLOAK_CLIENT_ID` and `DEV_KEYCLOAK_CLIENT_SECRET` in GitHub Actions and writes the same deployed key names into `dicekeeper-dev-secret`. Development deletion remains disabled unless `DEV_ACCOUNT_DELETION_ENABLED=true` and the development client service account has the reviewed role.

## Retention and enablement

`ACCOUNT_DELETION_MARKER_RETENTION` defaults to `P7D`; `ACCOUNT_DELETION_SESSION_WINDOW` defaults to `PT8H`. Marker retention must never be shorter than the longest OIDC token, cookie, offline-session, or accepted stale-session lifetime. Review Keycloak realm/client session settings and Quarkus session policy before lowering either value.

Keep `ACCOUNT_DELETION_ENABLED=false` during the first deployment. Check `/q/health/ready`, verify the `account_deletion_marker` table exists, and exercise ordinary login, profile edits, campaign access, uploads, and Keycloak health. Set the environment-specific repository variable to `true` only after these checks pass and the configured client's service-account role inspection is clean.

Production activation on 2026-10-20 uses the repository variable `ACCOUNT_DELETION_ENABLED=true`. The production readiness check was `UP`, the deletion-marker table held ten completed markers and no pending markers, and the configured Keycloak client obtained a token with `manage-users`. The production deployment workflow now requires this variable to be explicitly `true` or `false`; an unset value fails the deployment before it replaces any Secrets. Development remains disabled because its configured client's token request returned HTTP 401. Repair and verify that client before setting `DEV_ACCOUNT_DELETION_ENABLED=true`.

To disable new attempts in an emergency, set `ACCOUNT_DELETION_ENABLED=false` and redeploy. Keep the coordinator and deletion-marker guard deployed: removing the guard can recreate players for identities whose local data is already gone.

## Inspect pending markers

The marker contains only a SHA-256 subject digest, original player identifier, bounded state/category, timestamps, and relative cleanup paths. Query only these operational fields:

```sql
select id, original_player_id, state, failure_category, created_at, updated_at
from account_deletion_marker
where state <> 'COMPLETED'
order by updated_at;
```

Do not join the digest to profile data or copy it into tickets. A marker in `LOCAL_DELETED` needs file cleanup followed by provider deletion. A marker in `FILES_DELETED` needs only provider deletion. The authenticated user should first retry `DELETE /api/account`; missing files and a Keycloak 404 are completion conditions.

## Repair a pending deletion

1. Ask the affected authenticated user to use **Löschung fortsetzen**. This is the preferred application retry and does not recreate a player.
2. If the retry fails, inspect readiness and the marker's state/failure category. Inspect application and Keycloak logs using the correlation identifier; never search by email or raw subject.
3. For `FILESYSTEM`, verify each manifest path is relative to the configured upload root, remove only the listed file when safe, then retry through the application.
4. For `AUTHENTICATION`, `AUTHORIZATION`, `TIMEOUT`, `TRANSPORT`, or `UPSTREAM_STATUS`, repair the configured client's service account, role, network, or deadline configuration, then retry. A missing Keycloak user is already complete.
5. Verify local data independently: the player, notifications, affected memberships, owned campaigns/dependents, unreferenced characters, and listed uploads must be absent; unrelated campaigns and still-referenced characters must remain.
6. If safe convergence is not possible, disable the capability. Do not delete the marker or recreate the player. Escalate with the marker id, state, failure category, and correlation id only.

For the exploratory identity `codex-delete-empty-20261005-1309` / player `751`, use the same sequence: application retry first, Keycloak repair second, local-data verification third, and emergency disablement last. Confirm both the Keycloak user and player `751` are absent before recording cleanup complete. Never bypass the marker guard by inserting a replacement player.

## Rollout evidence

Record timestamps, command names, exit statuses, safe HTTP statuses, marker states, and aggregate row/file counts in an operator-only evidence log. Do not record secrets, tokens, raw subjects, emails, upstream bodies, or full filesystem paths.

Run and record:

```bash
npm run verify:account-deletion-config
kubectl apply --dry-run=client --validate=false -f k8s/deployment.yaml
kubectl apply --dry-run=client --validate=false -f k8s/dev/deployment.yaml
curl --fail --silent --show-error https://dicekeeper.net/q/health/ready
```

After enabling the capability, create disposable empty and populated accounts through the public route. Exercise one controlled provider failure, confirm the UI renders only fixed guidance, repair it, retry, and verify Keycloak identity, local rows, and listed files are removed while unrelated data remains. Remove all disposable data and the exploratory identity, then inspect application, Keycloak, ingress, and VPS/Cloudflare logs for regressions and secret or personal-data leakage.
