import assert from "node:assert/strict";
import { after, test } from "node:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const validator = join(scriptDirectory, "validate-password-recovery-theme.mjs");
const sourceTheme = join(repositoryRoot, "keycloak/themes/dicekeeper-email");
const dockerfile = join(repositoryRoot, "keycloak/Dockerfile");
const temporaryRoot = mkdtempSync(join(tmpdir(), "dicekeeper-password-recovery-validator-"));

after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

function fixture(name) {
  const theme = join(temporaryRoot, name, "dicekeeper-email");
  cpSync(sourceTheme, theme, { recursive: true });
  return theme;
}

function run(themeDirectory, dockerfilePath = dockerfile) {
  return spawnSync(
    process.execPath,
    [validator, "--theme-dir", themeDirectory, "--dockerfile", dockerfilePath],
    { encoding: "utf8" },
  );
}

test("accepts the repository theme", () => {
  const result = run(sourceTheme);
  assert.equal(result.status, 0, result.stderr);
});

test("rejects a controlled missing locale key fixture", () => {
  const theme = fixture("missing-key");
  const bundle = join(theme, "email/messages/messages_de.properties");
  const source = readFileSync(bundle, "utf8").replace(
    /^dicekeeperEmailPasswordResetIgnore=.*\n?/mu,
    "",
  );
  writeFileSync(bundle, source);

  const result = run(theme);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /locale key parity|is missing dicekeeperEmailPasswordResetIgnore/u);
});

test("rejects a controlled missing template fixture", () => {
  const theme = fixture("missing-template");
  unlinkSync(join(theme, "email/text/password-reset.ftl"));

  const result = run(theme);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing required theme file: email\/text\/password-reset\.ftl/u);
});

test("rejects ASCII transliterations in the German recovery copy", () => {
  const theme = fixture("german-ascii-transliteration");
  const bundle = join(theme, "email/messages/messages_de.properties");
  const source = readFileSync(bundle, "utf8").replace("zurück", "zurueck");
  writeFileSync(bundle, source);

  const result = run(theme);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /uses ASCII transliteration zurueck instead of native characters/u);
});

test("rejects an email layout incompatible with inherited Keycloak templates", () => {
  const theme = fixture("required-layout-parameters");
  const layout = join(theme, "email/html/template.ftl");
  const source = readFileSync(layout, "utf8").replace(
    /<#macro emailLayout[^>]+>/u,
    "<#macro emailLayout eyebrow title intro panelTitle buttonLabel link expiryText ignoreText footerText>",
  );
  writeFileSync(layout, source);

  const result = run(theme);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must allow Keycloak 26\.8\.1 inherited templates/u);
});

test("rejects a controlled wrong Keycloak version fixture", () => {
  const wrongVersionDockerfile = join(temporaryRoot, "Dockerfile.wrong-version");
  writeFileSync(
    wrongVersionDockerfile,
    "FROM quay.io/keycloak/keycloak:26.5.0\n\nCOPY keycloak/themes/dicekeeper-email /opt/keycloak/themes/dicekeeper-email\n",
  );

  const result = run(sourceTheme, wrongVersionDockerfile);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be pinned exactly to 26\.8\.1/u);
});
