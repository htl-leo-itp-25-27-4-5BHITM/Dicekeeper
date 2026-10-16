import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const verifier = join(scriptDirectory, "verify-password-recovery-realm.mjs");
const temporaryRoot = mkdtempSync(join(tmpdir(), "dicekeeper-password-recovery-realm-"));

after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

function validSnapshot(overrides = {}) {
  return {
    keycloakVersion: "26.8.1",
    forgotPasswordAllowed: false,
    loginTheme: "dicekeeper-email",
    emailTheme: "dicekeeper-email",
    userActionTokenLifespan: 300,
    updatePasswordEnabled: true,
    resetFlow: {
      bound: true,
      chooseUserRequirement: "REQUIRED",
      sendEmailRequirement: "REQUIRED",
      resetPasswordRequirement: "REQUIRED",
      forceLoginAfterReset: true,
      otpPreserved: true,
    },
    smtpConfigured: true,
    ...overrides,
  };
}

function run(name, snapshot, extraArguments = []) {
  const snapshotPath = join(temporaryRoot, `${name}.json`);
  writeFileSync(snapshotPath, JSON.stringify(snapshot));
  return spawnSync(process.execPath, [verifier, "--snapshot", snapshotPath, ...extraArguments], {
    encoding: "utf8",
  });
}

test("accepts a complete realm while Forgot password remains disabled", () => {
  const result = run("valid", validSnapshot());
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /verification passed without emitting secret values/u);
});

test("uses Keycloak 26.8.1's exact force-login authenticator key", () => {
  const source = readFileSync(verifier, "utf8");
  assert.match(source, /config\?\.\["force-login"\]/u);
  assert.doesNotMatch(source, /config\?\.forceLogin/u);
});

test("rejects an incomplete realm", () => {
  const result = run(
    "incomplete",
    validSnapshot({
      emailTheme: "base",
      updatePasswordEnabled: false,
      smtpConfigured: false,
      ignoredSecretSentinel: "DO-NOT-EMIT-SMTP-SECRET",
      resetFlow: {
        bound: true,
        chooseUserRequirement: "REQUIRED",
        sendEmailRequirement: "REQUIRED",
        resetPasswordRequirement: "REQUIRED",
        forceLoginAfterReset: false,
        otpPreserved: false,
      },
    }),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /FAIL: Dicekeeper email theme selected/u);
  assert.match(result.stdout, /FAIL: SMTP settings present/u);
  assert.doesNotMatch(result.stdout + result.stderr, /DO-NOT-EMIT-SMTP-SECRET/u);
});

test("rejects vulnerable Keycloak 26.5.0", () => {
  const result = run("wrong-version", validSnapshot({ keycloakVersion: "26.5.0" }));
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /FAIL: exact fixed Keycloak version/u);
});

test("supports the post-gate enabled-state check", () => {
  const result = run(
    "enabled",
    validSnapshot({ forgotPasswordAllowed: true }),
    ["--expect-forgot-password", "enabled"],
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
