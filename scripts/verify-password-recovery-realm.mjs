#!/usr/bin/env node

import { readFileSync } from "node:fs";

const expectedKeycloakVersion = "26.8.1";
const expectedTheme = "dicekeeper-email";
const defaultMaximumUserActionLifespan = 900;

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/u, "");
}

function isEnabledRequirement(value) {
  return value !== undefined && value !== null && value !== "DISABLED";
}

function executionByProvider(executions, providerId) {
  return executions.find((execution) => execution.providerId === providerId);
}

function otpResetIsDisabled(executions) {
  const resetOtpIndex = executions.findIndex((execution) => execution.providerId === "reset-otp");
  if (resetOtpIndex === -1) return true;
  const resetOtp = executions[resetOtpIndex];
  if (!isEnabledRequirement(resetOtp.requirement)) return true;

  const resetOtpLevel = Number(resetOtp.level ?? 0);
  for (let index = resetOtpIndex - 1; index >= 0; index -= 1) {
    const possibleParent = executions[index];
    if (Number(possibleParent.level ?? 0) < resetOtpLevel) {
      return !isEnabledRequirement(possibleParent.requirement);
    }
  }
  return false;
}

function smtpIsConfigured(smtpServer) {
  if (!smtpServer || typeof smtpServer !== "object") return false;
  const baseSettingsPresent = ["host", "port", "from"].every(
    (key) => typeof smtpServer[key] === "string" && smtpServer[key].trim().length > 0,
  );
  if (!baseSettingsPresent) return false;
  if (String(smtpServer.auth).toLowerCase() !== "true") return true;
  return ["user", "password"].every(
    (key) => typeof smtpServer[key] === "string" && smtpServer[key].trim().length > 0,
  );
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Keycloak Admin API request failed with HTTP ${response.status}`);
  }
  return await response.json();
}

async function liveSnapshot(baseUrl, realmName, token) {
  const encodedRealm = encodeURIComponent(realmName);
  const [serverInfo, realm, requiredActions] = await Promise.all([
    fetchJson(`${baseUrl}/admin/serverinfo`, token),
    fetchJson(`${baseUrl}/admin/realms/${encodedRealm}`, token),
    fetchJson(`${baseUrl}/admin/realms/${encodedRealm}/authentication/required-actions`, token),
  ]);
  const flowAlias = realm.resetCredentialsFlow;
  const executions = flowAlias
    ? await fetchJson(
        `${baseUrl}/admin/realms/${encodedRealm}/authentication/flows/${encodeURIComponent(flowAlias)}/executions`,
        token,
      )
    : [];
  const chooseUser = executionByProvider(executions, "reset-credentials-choose-user");
  const sendEmail = executionByProvider(executions, "reset-credential-email");
  const resetPassword = executionByProvider(executions, "reset-password");
  const emailConfig = sendEmail?.authenticationConfig
    ? await fetchJson(
        `${baseUrl}/admin/realms/${encodedRealm}/authentication/config/${encodeURIComponent(sendEmail.authenticationConfig)}`,
        token,
      )
    : null;

  return {
    keycloakVersion: serverInfo.systemInfo?.version,
    forgotPasswordAllowed: realm.resetPasswordAllowed === true,
    loginTheme: realm.loginTheme,
    emailTheme: realm.emailTheme,
    userActionTokenLifespan: realm.actionTokenGeneratedByUserLifespan,
    updatePasswordEnabled:
      requiredActions.some(
        (action) => action.alias === "UPDATE_PASSWORD" && action.enabled === true,
      ),
    resetFlow: {
      bound: typeof flowAlias === "string" && flowAlias.length > 0,
      chooseUserRequirement: chooseUser?.requirement,
      sendEmailRequirement: sendEmail?.requirement,
      resetPasswordRequirement: resetPassword?.requirement,
      // Keycloak 26.8.1's ResetCredentialEmail provider persists this exact
      // hyphenated key (ResetCredentialEmail.FORCE_LOGIN).
      forceLoginAfterReset: emailConfig?.config?.["force-login"] === "true",
      otpPreserved: otpResetIsDisabled(executions),
    },
    smtpConfigured: smtpIsConfigured(realm.smtpServer),
  };
}

function snapshotFromFile(path) {
  const source = path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
  return JSON.parse(source);
}

function required(value) {
  return value === "REQUIRED";
}

const snapshotPath = option("--snapshot", null);
const expectedForgotPassword = option("--expect-forgot-password", "disabled");
const maximumUserActionLifespan = Number(
  option("--max-user-action-lifespan", String(defaultMaximumUserActionLifespan)),
);
if (!["disabled", "enabled"].includes(expectedForgotPassword)) {
  throw new Error("--expect-forgot-password must be disabled or enabled");
}
if (!Number.isInteger(maximumUserActionLifespan) || maximumUserActionLifespan <= 0) {
  throw new Error("--max-user-action-lifespan must be a positive integer");
}

let snapshot;
if (snapshotPath) {
  snapshot = snapshotFromFile(snapshotPath);
} else {
  const baseUrl = option("--base-url", null);
  const realmName = option("--realm", null);
  const token = process.env.KEYCLOAK_ADMIN_TOKEN;
  if (!baseUrl || !realmName || !token) {
    throw new Error(
      "Live verification requires --base-url, --realm, and KEYCLOAK_ADMIN_TOKEN; use --snapshot for offline verification",
    );
  }
  snapshot = await liveSnapshot(normalizeBaseUrl(baseUrl), realmName, token);
}

const checks = [
  ["exact fixed Keycloak version", snapshot.keycloakVersion === expectedKeycloakVersion],
  [
    `Forgot password is ${expectedForgotPassword}`,
    snapshot.forgotPasswordAllowed === (expectedForgotPassword === "enabled"),
  ],
  ["Dicekeeper login theme selected", snapshot.loginTheme === expectedTheme],
  ["Dicekeeper email theme selected", snapshot.emailTheme === expectedTheme],
  [
    "bounded user-action token lifetime",
    Number.isInteger(snapshot.userActionTokenLifespan) &&
      snapshot.userActionTokenLifespan > 0 &&
      snapshot.userActionTokenLifespan <= maximumUserActionLifespan,
  ],
  ["Update Password required action enabled", snapshot.updatePasswordEnabled === true],
  ["Reset Credentials flow bound", snapshot.resetFlow?.bound === true],
  ["Choose User execution required", required(snapshot.resetFlow?.chooseUserRequirement)],
  ["Send Reset Email execution required", required(snapshot.resetFlow?.sendEmailRequirement)],
  ["Reset Password execution required", required(snapshot.resetFlow?.resetPasswordRequirement)],
  ["fresh login forced after reset", snapshot.resetFlow?.forceLoginAfterReset === true],
  ["OTP reset disabled to preserve OTP", snapshot.resetFlow?.otpPreserved === true],
  ["SMTP settings present", snapshot.smtpConfigured === true],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
}

if (checks.some(([, passed]) => !passed)) {
  process.exitCode = 1;
} else {
  console.log("Password-recovery realm verification passed without emitting secret values.");
}
