#!/usr/bin/env node

import { randomBytes, createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const expectedKeycloakVersion = "26.8.1";
const image = process.env.KEYCLOAK_SMOKE_IMAGE ?? "dicekeeper-keycloak-theme:smoke";
const skipBuild = process.argv.includes("--skip-build");
const suffix = randomBytes(6).toString("hex");
const container = `dicekeeper-keycloak-smoke-${suffix}`;
const realmName = `dicekeeper-smoke-${suffix}`;
const clientId = "dicekeeper-smoke-client";
const username = `smoke-${suffix}`;
const password = randomBytes(24).toString("base64url");
const adminUsername = `smoke-admin-${suffix}`;
const adminPassword = randomBytes(24).toString("base64url");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "dicekeeper-keycloak-smoke-"));
const realmFile = join(temporaryDirectory, "realm.json");
let containerStarted = false;

function command(commandName, arguments_, options = {}) {
  const result = spawnSync(commandName, arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${commandName} failed${details ? `:\n${details}` : ""}`);
  }
  return (result.stdout ?? "").trim();
}

function assertPage(html, marker, pageName) {
  if (!html.includes(marker)) {
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/giu)]
      .map((match) => match[1])
      .filter((id) => id.startsWith("kc-") || id.startsWith("dk-"));
    throw new Error(
      `${pageName} did not render marker ${marker}; rendered ids: ${[...new Set(ids)].join(", ")}`,
    );
  }
}

function decodeAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attributeForId(html, id, attribute) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const tag = html.match(new RegExp(`<[^>]+\\bid=["']${escapedId}["'][^>]*>`, "iu"))?.[0];
  if (!tag) throw new Error(`Could not find element #${id}`);
  const match = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "iu"));
  if (!match) throw new Error(`Element #${id} has no ${attribute} attribute`);
  return decodeAttribute(match[1]);
}

class BrowserSession {
  #cookies = new Map();

  async request(url, options = {}) {
    let currentUrl = url;
    let method = options.method ?? "GET";
    let body = options.body;
    for (let redirect = 0; redirect < 10; redirect += 1) {
      const headers = new Headers(options.headers ?? {});
      if (this.#cookies.size > 0) {
        headers.set(
          "cookie",
          [...this.#cookies].map(([name, value]) => `${name}=${value}`).join("; "),
        );
      }
      const response = await fetch(currentUrl, {
        method,
        body,
        headers,
        redirect: "manual",
      });
      for (const header of response.headers.getSetCookie()) {
        const [cookie] = header.split(";", 1);
        const separator = cookie.indexOf("=");
        if (separator > 0) this.#cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error(`Redirect from ${currentUrl} did not include a location`);
        currentUrl = new URL(location, currentUrl).href;
        if ([301, 302, 303].includes(response.status)) {
          method = "GET";
          body = undefined;
        }
        continue;
      }
      return { html: await response.text(), status: response.status, url: currentUrl };
    }
    throw new Error(`Too many redirects from ${url}`);
  }
}

function pkceChallenge() {
  const verifier = randomBytes(48).toString("base64url");
  return createHash("sha256").update(verifier).digest("base64url");
}

async function startDiscardingSmtpServer() {
  const actionLinks = [];
  const waiters = [];
  let messageCount = 0;
  const offerActionLink = (link) => {
    const waiter = waiters.shift();
    if (waiter) waiter(link);
    else actionLinks.push(link);
  };
  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 dicekeeper-smoke ESMTP\r\n");
    let buffer = "";
    let receivingData = false;
    let messageBuffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const lineEnd = buffer.indexOf("\r\n");
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);
        if (receivingData) {
          if (line === ".") {
            receivingData = false;
            messageCount += 1;
            const decodedMessage = messageBuffer
              .replaceAll(/=\r?\n/gu, "")
              .replaceAll(/=([0-9A-F]{2})/giu, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
              .replaceAll("&amp;", "&");
            for (const match of decodedMessage.matchAll(/https?:\/\/[^\s<>"']+/giu)) {
              if (match[0].includes("/login-actions/action-token")) offerActionLink(match[0]);
            }
            messageBuffer = "";
            socket.write("250 2.0.0 discarded\r\n");
          } else {
            messageBuffer += `${line}\n`;
          }
          continue;
        }
        const commandName = line.split(" ", 1)[0].toUpperCase();
        if (commandName === "EHLO" || commandName === "HELO") {
          socket.write("250-dicekeeper-smoke\r\n250 SIZE 10485760\r\n");
        } else if (commandName === "MAIL" || commandName === "RCPT" || commandName === "RSET") {
          socket.write("250 2.1.0 accepted\r\n");
        } else if (commandName === "DATA") {
          receivingData = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (commandName === "QUIT") {
          socket.end("221 2.0.0 bye\r\n");
        } else {
          socket.write("250 2.0.0 ok\r\n");
        }
      }
    });
  });
  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "0.0.0.0", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start SMTP smoke sink");
  return {
    server,
    port: address.port,
    clearActionLinks() {
      actionLinks.length = 0;
    },
    receivedMessageCount() {
      return messageCount;
    },
    async nextActionLink() {
      if (actionLinks.length > 0) return actionLinks.shift();
      return await new Promise((resolvePromise, rejectPromise) => {
        const timeout = setTimeout(
          () => rejectPromise(new Error("SMTP smoke sink did not receive an action link")),
          10_000,
        );
        waiters.push((link) => {
          clearTimeout(timeout);
          resolvePromise(link);
        });
      });
    },
  };
}

function authorizationUrl(baseUrl, locale = "en", redirectUri = "http://127.0.0.1/callback") {
  const url = new URL(`${baseUrl}/realms/${realmName}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid",
    state: randomBytes(12).toString("hex"),
    nonce: randomBytes(12).toString("hex"),
    code_challenge: pkceChallenge(),
    code_challenge_method: "S256",
    ui_locales: locale,
  }).toString();
  return url.href;
}

async function waitForKeycloak(baseUrl) {
  const deadline = Date.now() + 120_000;
  const endpoint = `${baseUrl}/realms/${realmName}/.well-known/openid-configuration`;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
    } catch (error) {
      // Keycloak is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  throw new Error("Keycloak did not become ready within 120 seconds");
}

const smtpSink = await startDiscardingSmtpServer();
const realm = {
  realm: realmName,
  enabled: true,
  displayName: "Dicekeeper",
  registrationAllowed: true,
  registrationEmailAsUsername: false,
  loginWithEmailAllowed: true,
  duplicateEmailsAllowed: false,
  // Recovery stays disabled until the live SMTP, flow, force-login, OTP, and lifetime gates pass.
  resetPasswordAllowed: false,
  verifyEmail: false,
  internationalizationEnabled: true,
  supportedLocales: ["en", "de"],
  defaultLocale: "en",
  loginTheme: "dicekeeper-email",
  emailTheme: "dicekeeper-email",
  smtpServer: {
    host: "host.docker.internal",
    port: String(smtpSink.port),
    from: `no-reply-${suffix}@example.invalid`,
    auth: "false",
    starttls: "false",
    ssl: "false",
  },
  clients: [
    {
      clientId,
      name: "Dicekeeper theme smoke client",
      enabled: true,
      publicClient: true,
      standardFlowEnabled: true,
      redirectUris: ["http://127.0.0.1/callback"],
      webOrigins: ["http://127.0.0.1"],
      attributes: { "pkce.code.challenge.method": "S256" },
    },
  ],
  users: [
    {
      username,
      enabled: true,
      emailVerified: false,
      email: `${username}@example.invalid`,
      requiredActions: ["VERIFY_EMAIL"],
      credentials: [{ type: "password", value: password, temporary: false }],
    },
  ],
};

writeFileSync(realmFile, JSON.stringify(realm));

try {
  if (!skipBuild) {
    console.log(`Building ${image} from the pinned Keycloak Dockerfile...`);
    command("docker", ["build", "--file", "keycloak/Dockerfile", "--tag", image, "."], {
      stdio: "inherit",
    });
  }

  command("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    container,
    "--add-host",
    "host.docker.internal:host-gateway",
    "--publish",
    "127.0.0.1::8080",
    "--mount",
    `type=bind,source=${realmFile},target=/opt/keycloak/data/import/realm.json,readonly`,
    "--env",
    "KC_BOOTSTRAP_ADMIN_USERNAME",
    "--env",
    "KC_BOOTSTRAP_ADMIN_PASSWORD",
    image,
    "start-dev",
    "--import-realm",
  ], {
    env: {
      ...process.env,
      KC_BOOTSTRAP_ADMIN_USERNAME: adminUsername,
      KC_BOOTSTRAP_ADMIN_PASSWORD: adminPassword,
    },
  });
  containerStarted = true;

  const portOutput = command("docker", ["port", container, "8080/tcp"]);
  const port = portOutput.match(/:(\d+)$/u)?.[1];
  if (!port) throw new Error(`Could not determine mapped Keycloak port from ${portOutput}`);
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForKeycloak(baseUrl);

  const versionOutput = command("docker", [
    "exec",
    container,
    "/opt/keycloak/bin/kc.sh",
    "--version",
  ]);
  if (!new RegExp(`\\b${expectedKeycloakVersion.replaceAll(".", "\\.")}\\b`, "u").test(versionOutput)) {
    throw new Error(
      `Keycloak smoke image must run exactly ${expectedKeycloakVersion}; reported ${versionOutput}`,
    );
  }

  const tokenResponse = await fetch(`${baseUrl}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: adminUsername,
      password: adminPassword,
    }),
  });
  if (!tokenResponse.ok) throw new Error(`Smoke administrator login failed with HTTP ${tokenResponse.status}`);
  const adminToken = (await tokenResponse.json()).access_token;
  if (!adminToken) throw new Error("Smoke administrator login returned no access token");
  const adminHeaders = {
    accept: "application/json",
    authorization: `Bearer ${adminToken}`,
  };
  const adminUsersResponse = await fetch(
    `${baseUrl}/admin/realms/master/users?username=${encodeURIComponent(adminUsername)}&exact=true`,
    { headers: adminHeaders },
  );
  if (!adminUsersResponse.ok) {
    throw new Error(`Smoke administrator lookup failed with HTTP ${adminUsersResponse.status}`);
  }
  const adminUsers = await adminUsersResponse.json();
  if (!Array.isArray(adminUsers) || adminUsers.length !== 1) {
    throw new Error("Smoke administrator lookup did not return exactly one user");
  }
  const adminUpdateResponse = await fetch(
    `${baseUrl}/admin/realms/master/users/${encodeURIComponent(adminUsers[0].id)}`,
    {
      method: "PUT",
      headers: { ...adminHeaders, "content-type": "application/json" },
      body: JSON.stringify({
        ...adminUsers[0],
        email: `smtp-test-${suffix}@example.invalid`,
        emailVerified: true,
      }),
    },
  );
  if (!adminUpdateResponse.ok) {
    throw new Error(`Smoke administrator update failed with HTTP ${adminUpdateResponse.status}`);
  }
  const smtpTestResponse = await fetch(
    `${baseUrl}/admin/realms/${encodeURIComponent(realmName)}/testSMTPConnection`,
    {
      method: "POST",
      headers: { ...adminHeaders, "content-type": "application/json" },
      body: JSON.stringify(realm.smtpServer),
    },
  );
  if (!smtpTestResponse.ok) {
    throw new Error(`SMTP template smoke test failed with HTTP ${smtpTestResponse.status}`);
  }
  if (smtpSink.receivedMessageCount() !== 1) {
    throw new Error("SMTP template smoke test did not reach the disposable SMTP sink");
  }

  const englishSession = new BrowserSession();
  const englishLogin = await englishSession.request(authorizationUrl(baseUrl, "en"));
  assertPage(englishLogin.html, 'id="kc-form-login"', "English login page");
  assertPage(englishLogin.html, "Welcome back.", "English login page");
  if (englishLogin.html.includes('id="dk-forgot-password-link"')) {
    throw new Error("Forgot password must remain hidden while recovery gates are pending");
  }

  const germanLogin = await new BrowserSession().request(authorizationUrl(baseUrl, "de"));
  assertPage(germanLogin.html, 'lang="de"', "German login page");
  assertPage(germanLogin.html, "Willkommen zurück.", "German login page");

  const registrationUrl = new URL(
    attributeForId(englishLogin.html, "dk-register-link", "href"),
    englishLogin.url,
  ).href;
  const registration = await englishSession.request(registrationUrl);
  assertPage(registration.html, 'id="kc-register-form"', "registration page");

  const verificationSession = new BrowserSession();
  const verificationLogin = await verificationSession.request(authorizationUrl(baseUrl, "en"));
  const loginAction = new URL(
    attributeForId(verificationLogin.html, "kc-form-login", "action"),
    verificationLogin.url,
  ).href;
  const verificationPage = await verificationSession.request(loginAction, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password, credentialId: "" }),
  });
  assertPage(verificationPage.html, "Check your inbox.", "verification-email page");
  assertPage(verificationPage.html, "dk-auth-copy", "verification-email page");
  const verificationLink = await smtpSink.nextActionLink();
  const verificationOutcome = await new BrowserSession().request(verificationLink);
  assertPage(verificationOutcome.html, "dk-auth-copy", "verification info page");

  const errorPage = await new BrowserSession().request(
    authorizationUrl(baseUrl, "en", "https://invalid.example/callback"),
  );
  assertPage(errorPage.html, "dk-auth-alert-error", "error page");

  const logs = command("docker", ["logs", container]);
  if (/FreeMarkerException|Failed to process template|Can't find resource for bundle|Missing message/iu.test(logs)) {
    throw new Error("Keycloak logs contain a FreeMarker or missing-message failure");
  }

  console.log(
    `Keycloak ${expectedKeycloakVersion} theme smoke test passed (Forgot password disabled; SMTP-test email, login en/de, registration, verification-email, info, error).`,
  );
} finally {
  if (containerStarted) {
    spawnSync("docker", ["stop", "--time", "5", container], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
  }
  await new Promise((resolvePromise) => smtpSink.server.close(resolvePromise));
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
