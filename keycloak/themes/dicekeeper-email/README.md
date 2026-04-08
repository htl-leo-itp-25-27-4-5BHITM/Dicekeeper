# Dicekeeper Keycloak Email + Login Theme

This theme styles the Keycloak email flow and login screens to match the Dicekeeper landing page:

- dark emerald background
- bright green CTA
- compact glass-card layout
- Dicekeeper `D20` brand badge

## Files

- `login/theme.properties`
- `login/template.ftl`
- `login/login.ftl`
- `login/register.ftl`
- `login/register-user-profile.ftl`
- `login/login-reset-password.ftl`
- `login/login-update-password.ftl`
- `login/login-verify-email.ftl`
- `login/info.ftl`
- `login/error.ftl`
- `login/resources/css/dicekeeper-login.css`
- `login/messages/messages.properties`
- `login/messages/messages_en.properties`
- `login/messages/messages_de.properties`
- `email/theme.properties`
- `email/html/email-verification.ftl`
- `email/html/executeActions.ftl`
- `email/text/email-verification.ftl`
- `email/text/executeActions.ftl`
- `email/messages/messages.properties`
- `email/messages/messages_de.properties`

## Install

Copy the `dicekeeper-email` folder into Keycloak's themes directory:

```bash
/opt/keycloak/themes/dicekeeper-email
```

Then select it in Keycloak:

- `Realm Settings` -> `Themes`
- `Login Theme` -> `dicekeeper-email`
- `Email Theme` -> `dicekeeper-email`

## Kubernetes

If your Keycloak runs in Kubernetes, either:

- mount this folder into `/opt/keycloak/themes/dicekeeper-email`, or
- bake it into your Keycloak image

After that, restart the Keycloak pod and send a new verification email.

## Persistent setup (recommended)

The reliable way is a custom Keycloak image that already contains the theme.

Use the Dockerfile at:

- `keycloak/Dockerfile`

Build it from the repository root.
If you build locally on Apple Silicon, publish an `amd64` image explicitly:

```bash
docker buildx build --platform linux/amd64 \
  -f keycloak/Dockerfile \
  -t ghcr.io/<your-org>/keycloak-dicekeeper:latest \
  --push .
```

Then point the deployment at that image:

```bash
kubectl -n student-it200233 set image deployment/keycloak \
  keycloak=ghcr.io/<your-org>/keycloak-dicekeeper:latest

kubectl -n student-it200233 rollout status deployment/keycloak
```

Once the new pod is up, select:

- `Realm Settings` -> `Themes` -> `Login Theme` -> `dicekeeper-email`
- `Realm Settings` -> `Themes` -> `Email Theme` -> `dicekeeper-email`

This survives pod restarts because the theme is part of the image, not copied into a running container.
