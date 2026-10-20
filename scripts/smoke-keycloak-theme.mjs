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
const runExpiryTest = process.argv.includes("--expiry-test");
const suffix = randomBytes(6).toString("hex");
const container = `dicekeeper-keycloak-smoke-${suffix}`;
const realmName = `dicekeeper-smoke-${suffix}`;
const clientId = "dicekeeper-smoke-client";
const username = `smoke-${suffix}`;
const password = randomBytes(24).toString("base64url");
const expiryUsername = `expiry-${suffix}`;
const expiryPassword = randomBytes(24).toString("base64url");
const otpUsername = `otp-${suffix}`;
const otpPassword = randomBytes(24).toString("base64url");
const otpNewPassword = randomBytes(24).toString("base64url");
const otpSecret = [...randomBytes(32)]
  .map((byte) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[byte & 31])
  .join("");
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
        if (!location) throw new Error("Redirect did not include a location");
        const nextUrl = new URL(location, currentUrl);
        if (options.stopAtCallback && nextUrl.hostname === "127.0.0.1" && nextUrl.pathname === "/callback") {
          return { html: "", status: response.status, url: currentUrl, redirectUrl: nextUrl.href };
        }
        currentUrl = nextUrl.href;
        if ([301, 302, 303].includes(response.status)) {
          method = "GET";
          body = undefined;
        }
        continue;
      }
      return { html: await response.text(), status: response.status, url: currentUrl };
    }
    throw new Error("Too many redirects");
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
            const parser = [
              "import email, html, json, re, sys",
              "from email import policy",
              "message = email.message_from_bytes(sys.stdin.buffer.read(), policy=policy.default)",
              "links = []",
              "for part in message.walk():",
              "    if part.get_content_type() not in ('text/plain', 'text/html'): continue",
              "    content = html.unescape(part.get_content())",
              "    links += [m.group(0).rstrip('.,;)') for m in re.finditer(r'''https?://[^\\s<>\\\"']+''', content)]",
              "print(json.dumps(links))",
            ].join("\n");
            const parsed = spawnSync("python3", ["-c", parser], {
              input: messageBuffer,
              encoding: "utf8",
            });
            const links = parsed.status === 0
              ? JSON.parse(parsed.stdout).filter((link) => link.includes("/login-actions/action-token"))
              : [];
            for (const link of links) offerActionLink(link);
            messageBuffer = "";
            socket.write("250 2.0.0 discarded\r\n");
          } else {
            messageBuffer += `${line.startsWith("..") ? line.slice(1) : line}\n`;
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
  actionTokenGeneratedByUserLifespan: 300,
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
    {
      username: expiryUsername,
      enabled: true,
      emailVerified: true,
      email: `${expiryUsername}@example.invalid`,
      firstName: "Expiry",
      lastName: "Smoke",
      credentials: [{ type: "password", value: expiryPassword, temporary: false }],
    },
    {
      username: otpUsername,
      enabled: true,
      emailVerified: true,
      email: `${otpUsername}@example.invalid`,
      firstName: "Otp",
      lastName: "Smoke",
      credentials: [
        { type: "password", value: otpPassword, temporary: false },
        {
          type: "otp",
          secretData: JSON.stringify({ value: otpSecret }),
          credentialData: JSON.stringify({
            subType: "totp",
            digits: 6,
            counter: 0,
            period: 30,
            algorithm: "HmacSHA1",
            secretEncoding: "BASE32",
          }),
        },
      ],
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

  if (runExpiryTest) {
    const { chromium } = await import("@playwright/test");
    const localBrowser = await chromium.launch({ channel: "chrome", headless: true });
    const localContext = await localBrowser.newContext();
    const openAuthorizationPage = async (page) => {
      try {
        await page.goto(authorizationUrl(baseUrl, "en"), {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
      } catch {
        throw new Error("Local authorization navigation failed");
      }
    };
    const openActionLink = async (page, link, label) => {
      try {
        await page.goto(link, { waitUntil: "domcontentloaded", timeout: 20_000 });
      } catch {
        throw new Error(`${label} navigation failed`);
      }
    };
    const realmAdminUrl = `${baseUrl}/admin/realms/${encodeURIComponent(realmName)}`;
    const updateRealm = async (settings) => {
      const response = await fetch(realmAdminUrl, {
        method: "PUT",
        headers: { ...adminHeaders, "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error(`Local expiry realm update failed with HTTP ${response.status}`);
    };
    const fetchAdminJson = async (path) => {
      const response = await fetch(`${realmAdminUrl}${path}`, { headers: adminHeaders });
      if (!response.ok) throw new Error(`Local Admin API read failed with HTTP ${response.status}`);
      return await response.json();
    };
    const otpUsers = await fetchAdminJson(`/users?username=${encodeURIComponent(otpUsername)}&exact=true`);
    if (!Array.isArray(otpUsers) || otpUsers.length !== 1) throw new Error("Local OTP test user missing");
    const otpUserId = otpUsers[0].id;
    const getOtpCredentials = async () => {
      const credentials = await fetchAdminJson(`/users/${encodeURIComponent(otpUserId)}/credentials`);
      if (!Array.isArray(credentials)) throw new Error("Local OTP credentials were not readable");
      return credentials;
    };
    const otpBefore = (await getOtpCredentials()).filter((credential) => credential.type === "otp");
    if (otpBefore.length !== 1) throw new Error("Local OTP credential was not imported");
    const authenticateExpiryUser = async () => {
      const session = new BrowserSession();
      const loginPage = await session.request(authorizationUrl(baseUrl, "en"));
      const action = new URL(attributeForId(loginPage.html, "kc-form-login", "action"), loginPage.url).href;
      const result = await session.request(action, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: expiryUsername, password: expiryPassword, credentialId: "" }),
        stopAtCallback: true,
      });
      if (result.redirectUrl && new URL(result.redirectUrl).searchParams.has("code")) return true;
      const ids = [...result.html.matchAll(/\bid=["']([^"']+)["']/giu)]
        .map((match) => match[1])
        .filter((id) => id.startsWith("kc-") || id.startsWith("dk-"));
      console.log("Local login state:", `HTTP ${result.status}`, `path=${new URL(result.url).pathname}`, `ids=${[...new Set(ids)].join(",")}`);
      return false;
    };

    try {
      if (!await authenticateExpiryUser()) throw new Error("Original credential failed before the expiry test");
      await updateRealm({ resetPasswordAllowed: true, actionTokenGeneratedByUserLifespan: 2 });
      const expirySession = new BrowserSession();
      const expiryLogin = await expirySession.request(authorizationUrl(baseUrl, "en"));
      const forgotUrl = new URL(
        attributeForId(expiryLogin.html, "dk-forgot-password-link", "href"),
        expiryLogin.url,
      ).href;
      const requestPage = await expirySession.request(forgotUrl);
      assertPage(requestPage.html, 'id="kc-reset-password-form"', "local expiry request form");
      const requestAction = new URL(
        attributeForId(requestPage.html, "kc-reset-password-form", "action"),
        requestPage.url,
      ).href;
      smtpSink.clearActionLinks();
      await expirySession.request(requestAction, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: expiryUsername }),
      });
      const expiredActionLink = await smtpSink.nextActionLink();
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 3500));
      let expiredAt;
      try {
        const actionKey = new URL(expiredActionLink).searchParams.get("key") ?? "";
        expiredAt = JSON.parse(Buffer.from(actionKey.split(".")[1], "base64url").toString("utf8")).exp;
      } catch {
        throw new Error("Local expiry action token was malformed");
      }
      if (!Number.isInteger(expiredAt) || expiredAt > Math.floor(Date.now() / 1000)) {
        throw new Error("Local expiry action token was not yet expired");
      }
      const expiredPage = await expirySession.request(expiredActionLink);
      if (expiredPage.html.includes('id="kc-passwd-update-form"')) {
        throw new Error("Expired link exposed the password-update form");
      }
      if (!/dk-auth-alert-error|kc-error-message|expired|abgelaufen/iu.test(expiredPage.html)) {
        throw new Error("Expired link did not render a recognizable safe error state");
      }
      assertPage(expiredPage.html, 'class="dk-auth-actions"', "local expired-link restart path");

      if (!await authenticateExpiryUser()) throw new Error("Original credential failed after opening an expired link");

      const realmConfig = await fetchAdminJson("");
      const flowAlias = realmConfig.resetCredentialsFlow;
      if (!flowAlias) throw new Error("Local Reset Credentials flow is unbound");
      const flowPath = `/authentication/flows/${encodeURIComponent(flowAlias)}/executions`;
      const flowExecutions = await fetchAdminJson(flowPath);
      const resetOtpIndex = flowExecutions.findIndex((execution) => execution.providerId === "reset-otp");
      const resetOtp = flowExecutions[resetOtpIndex];
      const otpParent = resetOtp
        ? flowExecutions.slice(0, resetOtpIndex).reverse().find(
            (execution) => Number(execution.level ?? 0) < Number(resetOtp.level ?? 0),
          )
        : null;
      if (resetOtp && !otpParent) throw new Error("Local OTP reset sub-flow was not found");
      if (otpParent && otpParent.requirement !== "DISABLED") {
        const disableOtpResponse = await fetch(`${realmAdminUrl}${flowPath}`, {
          method: "PUT",
          headers: { ...adminHeaders, "content-type": "application/json" },
          body: JSON.stringify({ id: otpParent.id, requirement: "DISABLED" }),
        });
        if (!disableOtpResponse.ok) throw new Error(`Local OTP-reset disable failed with HTTP ${disableOtpResponse.status}`);
      }
      const afterFlow = await fetchAdminJson(flowPath);
      if (otpParent && afterFlow.find((execution) => execution.id === otpParent.id)?.requirement !== "DISABLED") {
        throw new Error("Local OTP-reset sub-flow remains enabled");
      }

      await updateRealm({
        resetPasswordAllowed: true,
        actionTokenGeneratedByUserLifespan: 300,
        passwordPolicy: "length(12)",
      });
      const otpRealmConfig = await fetchAdminJson("");
      if (otpRealmConfig.actionTokenGeneratedByUserLifespan !== 300 || otpRealmConfig.passwordPolicy !== "length(12)") {
        throw new Error("Local policy test did not apply the intended settings");
      }
      const freshControlPage = await localContext.newPage();
      await openAuthorizationPage(freshControlPage);
      await freshControlPage.locator("#dk-forgot-password-link").click();
      await freshControlPage.locator("#kc-reset-password-form").waitFor();
      smtpSink.clearActionLinks();
      await freshControlPage.locator("#username").fill(expiryUsername);
      await freshControlPage.locator("#kc-reset-password-submit").click();
      const freshControlLink = await smtpSink.nextActionLink();
      const freshControlAction = await localContext.newPage();
      await openActionLink(freshControlAction, freshControlLink, "Fresh local control link");
      if (await freshControlAction.locator("#kc-passwd-update-form").count() !== 1) {
        throw new Error("Fresh local control link did not open the update form");
      }
      await freshControlAction.locator("#password-new").fill("short");
      await freshControlAction.locator("#password-confirm").fill("short");
      await freshControlAction.locator("#kc-password-update-submit").click();
      if (await freshControlAction.locator("#kc-passwd-update-form").count() !== 1 ||
          await freshControlAction.locator("#input-error-password, .dk-auth-alert-error").count() === 0) {
        throw new Error("Local policy-invalid replacement was not rejected with a usable link");
      }
      const otpRequestPage = await localContext.newPage();
      await openAuthorizationPage(otpRequestPage);
      await otpRequestPage.locator("#dk-forgot-password-link").click();
      await otpRequestPage.locator("#kc-reset-password-form").waitFor();
      smtpSink.clearActionLinks();
      await otpRequestPage.locator("#username").fill(otpUsername);
      await otpRequestPage.locator("#kc-reset-password-submit").click();
      const otpResetLink = await smtpSink.nextActionLink();
      const otpActionPage = await localContext.newPage();
      await openActionLink(otpActionPage, otpResetLink, "Local OTP reset link");
      const otpUpdateForm = otpActionPage.locator("#kc-passwd-update-form");
      if (await otpUpdateForm.count() !== 1) throw new Error("Local OTP-preserving update form did not render");
      await otpActionPage.locator("#password-new").fill(otpNewPassword);
      await otpActionPage.locator("#password-confirm").fill(otpNewPassword);
      await otpActionPage.locator("#kc-password-update-submit").click();
      const otpAfter = (await getOtpCredentials()).filter((credential) => credential.type === "otp");
      if (otpAfter.length !== 1 || otpAfter[0].id !== otpBefore[0].id) {
        throw new Error("Non-password OTP credential changed during local recovery");
      }
    } finally {
      await localBrowser.close();
      await updateRealm({ resetPasswordAllowed: false, actionTokenGeneratedByUserLifespan: 300, passwordPolicy: "" });
      const restoredResponse = await fetch(realmAdminUrl, { headers: adminHeaders });
      if (!restoredResponse.ok) throw new Error("Could not read restored local realm lifetime");
      const restoredRealm = await restoredResponse.json();
      if (restoredRealm.actionTokenGeneratedByUserLifespan !== 300 || restoredRealm.resetPasswordAllowed || restoredRealm.passwordPolicy) {
        throw new Error("Local expiry-test realm settings were not restored");
      }
    }
    console.log("Controlled recovery test passed (expired link refused; old password valid; invalid policy rejected; OTP preserved; settings restored).");
  }

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
