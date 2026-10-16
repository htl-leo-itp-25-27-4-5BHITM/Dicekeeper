#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const expectedKeycloakVersion = "26.8.1";

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1]) throw new Error(`Missing value for ${name}`);
  const value = process.argv[index + 1];
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

const themeDirectory = optionValue(
  "--theme-dir",
  join(repositoryRoot, "keycloak/themes/dicekeeper-email"),
);
const dockerfilePath = optionValue(
  "--dockerfile",
  join(repositoryRoot, "keycloak/Dockerfile"),
);
const errors = [];
const sources = new Map();

function fail(message) {
  errors.push(message);
}

function requireSource(relativePath) {
  const absolutePath = join(themeDirectory, relativePath);
  try {
    const source = readFileSync(absolutePath, "utf8");
    sources.set(relativePath, source);
    return source;
  } catch (error) {
    fail(`missing required theme file: ${relativePath}`);
    return "";
  }
}

function assertIncludes(source, value, label) {
  if (!source.includes(value)) fail(`${label} is missing ${JSON.stringify(value)}`);
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) fail(label);
}

function parseProperties(source, label) {
  const values = new Map();
  for (const [index, rawLine] of source.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const separator = line.search(/[:=]/u);
    if (separator < 1) {
      fail(`${label}:${index + 1} is not a key/value property`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (values.has(key)) fail(`${label} contains duplicate key ${key}`);
    values.set(key, value);
  }
  return values;
}

function validateParity(label, bundles) {
  const allKeys = new Set(bundles.flatMap(({ values }) => [...values.keys()]));
  for (const key of allKeys) {
    for (const { locale, values } of bundles) {
      if (!values.has(key)) fail(`${label} locale key parity: ${locale} is missing ${key}`);
    }
  }
}

function requireBundleKeys(label, bundles, keys) {
  for (const key of keys) {
    for (const { locale, values } of bundles) {
      if (!values.has(key)) fail(`${label} bundle ${locale} is missing ${key}`);
    }
  }
}

function rejectGermanAsciiTransliterations(bundles) {
  const forbidden = /\b(?:Aenderung|Aenderungen|Bestaetige|Boegen|Naechstes|Oberflaeche|Oeffne|Passwortaenderung|Waehle|Zuruecksetzen|bestaetigen|bestaetigt|fuer|gueltig|haelt|naechsten|oeffnen|pruefe|pruefen|schliesse|ueber|unveraendert|vollstaendig|waehlen|zurueck|zuruecksetzen)\b/u;
  for (const { locale, values } of bundles) {
    if (locale !== "de") continue;
    for (const [key, value] of values) {
      const match = value.match(forbidden);
      if (match) {
        fail(`German bundle ${key} uses ASCII transliteration ${match[0]} instead of native characters`);
      }
    }
  }
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function formatMessage(value, ...arguments_) {
  return arguments_.reduce(
    (formatted, argument, index) => formatted.replaceAll(`{${index}}`, argument),
    value,
  );
}

function validateRenderedFixtures(bundles) {
  const fixtureLink =
    "https://auth.dicekeeper.net/realms/dicekeeper/login-actions/action-token?key=FIXTURE";
  const formattedExpiry = "15 minutes";
  const realmName = "Dicekeeper";

  for (const { locale, values } of bundles) {
    const message = (key, ...arguments_) => {
      const value = values.get(key);
      return value === undefined ? `MISSING:${key}` : formatMessage(value, ...arguments_);
    };
    const body = message("dicekeeperEmailPasswordResetBody", realmName);
    const expiry = message("dicekeeperEmailPasswordResetExpiry", formattedExpiry);
    const ignore = message("dicekeeperEmailPasswordResetIgnore");
    const fallback = message("dicekeeperEmailPasswordResetFallback");
    const actionLabel = message("dicekeeperEmailPasswordResetButton");

    const htmlFixture = [
      `<a data-reset-action href="${fixtureLink}">${actionLabel}</a>`,
      `<p>${body}</p>`,
      `<p>${expiry}</p>`,
      `<p>${fallback}</p>`,
      `<a data-reset-fallback href="${fixtureLink}">${fixtureLink}</a>`,
      `<p>${ignore}</p>`,
    ].join("");
    const textFixture = [
      message("dicekeeperEmailPasswordResetTitle"),
      message("dicekeeperEmailPasswordResetIntro"),
      body,
      `${actionLabel}: ${fixtureLink}`,
      expiry,
      fallback,
      fixtureLink,
      ignore,
    ].join("\n\n");

    if (count(htmlFixture, /data-reset-action/gu) !== 1) {
      fail(`rendered HTML fixture ${locale} must contain exactly one reset action`);
    }
    if (count(htmlFixture, new RegExp(escapeRegExp(fixtureLink), "gu")) !== 3) {
      fail(`rendered HTML fixture ${locale} must contain the action and copyable fallback URL`);
    }
    if (!htmlFixture.includes(formattedExpiry) || !textFixture.includes(formattedExpiry)) {
      fail(`rendered fixtures ${locale} are missing the formatted expiry`);
    }
    if (!htmlFixture.includes(ignore) || !textFixture.includes(ignore)) {
      fail(`rendered fixtures ${locale} are missing unexpected-request guidance`);
    }
    if (count(textFixture, new RegExp(escapeRegExp(fixtureLink), "gu")) !== 2) {
      fail(`rendered text fixture ${locale} must contain the action and fallback URL`);
    }
    if (/<\/?[a-z][^>]*>/iu.test(textFixture)) {
      fail(`rendered text fixture ${locale} contains HTML markup`);
    }
    if (htmlFixture.includes("MISSING:") || textFixture.includes("MISSING:")) {
      fail(`rendered fixtures ${locale} contain an unresolved message key`);
    }
  }
}

function validateSupportedResetContext(relativePath, source) {
  const segments = source.match(/<#[\s\S]*?>|<@[\s\S]*?>|\$\{[\s\S]*?\}/gu) ?? [];
  const identifiers = segments
    .join("\n")
    .replaceAll(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/gu, "")
    .match(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu) ?? [];
  const allowed = new Set([
    "as",
    "buttonLabel",
    "emailLayout",
    "eyebrow",
    "expiryText",
    "footerText",
    "ftl",
    "ignoreText",
    "import",
    "intro",
    "layout",
    "link",
    "linkExpiration",
    "linkExpirationFormatter",
    "msg",
    "output_format",
    "panelTitle",
    "plainText",
    "realmName",
    "title",
  ]);
  const unsupported = [...new Set(identifiers.filter((identifier) => !allowed.has(identifier)))];
  if (unsupported.length > 0) {
    fail(`${relativePath} uses unsupported template identifiers: ${unsupported.join(", ")}`);
  }
}

const login = requireSource("login/login.ftl");
const resetRequest = requireSource("login/login-reset-password.ftl");
const updatePassword = requireSource("login/login-update-password.ftl");
const htmlLayout = requireSource("email/html/template.ftl");
const htmlReset = requireSource("email/html/password-reset.ftl");
const textReset = requireSource("email/text/password-reset.ftl");

const loginBundles = [
  ["default", "login/messages/messages.properties"],
  ["en", "login/messages/messages_en.properties"],
  ["de", "login/messages/messages_de.properties"],
].map(([locale, path]) => ({ locale, values: parseProperties(requireSource(path), path) }));
const emailBundles = [
  ["default", "email/messages/messages.properties"],
  ["en", "email/messages/messages_en.properties"],
  ["de", "email/messages/messages_de.properties"],
].map(([locale, path]) => ({ locale, values: parseProperties(requireSource(path), path) }));

assertMatches(
  login,
  /<#if\s+realm\.resetPasswordAllowed>[\s\S]*?id="dk-forgot-password-link"[\s\S]*?url\.loginResetCredentialsUrl[\s\S]*?<\/#if>/u,
  "login reset link must remain guarded by realm.resetPasswordAllowed",
);

for (const selector of [
  'id="kc-reset-password-form"',
  'id="username"',
  'id="reset-password-identifier-hint"',
  'id="input-error-username"',
  'id="kc-reset-password-submit"',
  'id="kc-back-to-login"',
]) {
  assertIncludes(resetRequest, selector, "reset-request template");
}
assertIncludes(resetRequest, "messagesPerField.existsError('username')", "reset-request validation");
assertIncludes(resetRequest, "${url.loginAction}", "reset-request form action");

for (const selector of [
  'id="kc-passwd-update-form"',
  'id="password-new"',
  'id="password-confirm"',
  'id="input-error-password"',
  'id="input-error-password-confirm"',
  'id="kc-password-update-submit"',
]) {
  assertIncludes(updatePassword, selector, "update-password template");
}
assertIncludes(updatePassword, '<@passwordCommons.logoutOtherSessions/>', "non-password session handling");

for (const [relativePath, source] of [
  ["email/html/password-reset.ftl", htmlReset],
  ["email/text/password-reset.ftl", textReset],
]) {
  for (const value of ["link", "linkExpiration", "realmName", "linkExpirationFormatter"]) {
    assertMatches(source, new RegExp(`\\b${value}\\b`, "u"), `${relativePath} is missing ${value}`);
  }
  validateSupportedResetContext(relativePath, source);
}
assertIncludes(htmlReset, '<@layout.emailLayout', "HTML reset email layout");
assertIncludes(htmlReset, 'href="${link}"', "HTML reset fallback URL");
assertIncludes(textReset, '<#ftl output_format="plainText">', "plain-text reset email format");
assertMatches(
  htmlLayout,
  /<#macro\s+emailLayout\s+eyebrow=""\s+title=""\s+intro=""\s+panelTitle=""\s+buttonLabel=""\s+link=""\s+expiryText=""\s+ignoreText=""\s+footerText="">/u,
  "HTML email layout must allow Keycloak 26.8.1 inherited templates to call emailLayout without custom parameters",
);

validateParity("login", loginBundles);
validateParity("email", emailBundles);
rejectGermanAsciiTransliterations([...loginBundles, ...emailBundles]);
requireBundleKeys("login recovery", loginBundles, [
  "dicekeeperResetPasswordTitle",
  "dicekeeperResetPasswordIntro",
  "dicekeeperResetPasswordIdentifierHint",
  "dicekeeperResetPasswordSubmit",
  "dicekeeperUpdatePasswordTitle",
  "dicekeeperUpdatePasswordIntro",
]);
requireBundleKeys("email password reset", emailBundles, [
  "passwordResetSubject",
  "dicekeeperEmailPasswordResetEyebrow",
  "dicekeeperEmailPasswordResetTitle",
  "dicekeeperEmailPasswordResetIntro",
  "dicekeeperEmailPasswordResetPanelTitle",
  "dicekeeperEmailPasswordResetBody",
  "dicekeeperEmailPasswordResetButton",
  "dicekeeperEmailPasswordResetExpiry",
  "dicekeeperEmailPasswordResetFallback",
  "dicekeeperEmailPasswordResetIgnore",
]);
requireBundleKeys("existing email flows", emailBundles, [
  "emailVerificationSubject",
  "executeActionsSubject",
  "dicekeeperEmailVerifyButton",
  "dicekeeperEmailActionsButton",
]);

validateRenderedFixtures(emailBundles);

let dockerfile = "";
try {
  dockerfile = readFileSync(dockerfilePath, "utf8");
} catch (error) {
  fail(`missing Keycloak Dockerfile: ${dockerfilePath}`);
}
assertMatches(
  dockerfile,
  new RegExp(`^FROM\\s+quay\\.io/keycloak/keycloak:${escapeRegExp(expectedKeycloakVersion)}\\s*$`, "mu"),
  `Keycloak image must be pinned exactly to ${expectedKeycloakVersion}`,
);
assertMatches(
  dockerfile,
  /^COPY\s+keycloak\/themes\/dicekeeper-email\s+\/opt\/keycloak\/themes\/dicekeeper-email\s*$/mu,
  "Keycloak Dockerfile must copy the complete theme to /opt/keycloak/themes/dicekeeper-email",
);

const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\b(?:smtp[_-]?password|client[_-]?secret)\s*[:=]\s*[^\s${}]+/iu,
  /https?:\/\/[^\s"']+\/login-actions\/action-token[^\s"']*\bkey=(?!\$\{)[^&\s"']+/iu,
];
for (const [relativePath, source] of sources) {
  if (secretPatterns.some((pattern) => pattern.test(source))) {
    fail(`${relativePath} appears to contain literal secret or reset-link material`);
  }
}

if (errors.length > 0) {
  console.error("Password-recovery theme validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Password-recovery theme validation passed (${sources.size} files, ${loginBundles.length + emailBundles.length} locale bundles).`,
  );
}
