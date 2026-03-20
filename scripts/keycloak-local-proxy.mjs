import http from 'node:http';
import https from 'node:https';

const localHost = process.env.LOCAL_KEYCLOAK_PROXY_HOST || '127.0.0.1';
const localPort = Number.parseInt(process.env.LOCAL_KEYCLOAK_PROXY_PORT || '8000', 10);
const upstreamOrigin = process.env.LOCAL_KEYCLOAK_UPSTREAM || 'https://auth.dicekeeper.net';
const upstreamUrl = new URL(upstreamOrigin);
const localOrigin = `http://localhost:${localPort}`;

const rewriteUpstreamRequestValue = (value) => {
  if (!value) {
    return value;
  }
  return value
    .replaceAll(localOrigin, upstreamOrigin)
    .replaceAll(`localhost:${localPort}`, upstreamUrl.host);
};

const rewriteText = (value) => value
  .replaceAll(upstreamOrigin, localOrigin)
  .replaceAll(upstreamUrl.host, `localhost:${localPort}`)
  .replaceAll(upstreamUrl.hostname, 'localhost')
  .replaceAll('https://localhost:', 'http://localhost:')
  .replaceAll('https://127.0.0.1:', 'http://127.0.0.1:')
  .replaceAll('https:\\/\\/localhost:', 'http:\\/\\/localhost:')
  .replaceAll('https:\\/\\/127.0.0.1:', 'http:\\/\\/127.0.0.1:')
  .replaceAll('https%3A%2F%2Flocalhost%3A', 'http%3A%2F%2Flocalhost%3A')
  .replaceAll('https%3A%2F%2F127.0.0.1%3A', 'http%3A%2F%2F127.0.0.1%3A');

const rewriteLocation = (value) => {
  if (!value) {
    return value;
  }
  return rewriteText(value);
};

const rewriteCookie = (cookie) => cookie
  .replace(/;\s*Domain=[^;]+/gi, '')
  .replace(/;\s*Secure/gi, '')
  .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');

const shouldRewriteBody = (contentType) => {
  if (!contentType) {
    return false;
  }
  const normalized = contentType.toLowerCase();
  return normalized.includes('text/')
    || normalized.includes('application/json')
    || normalized.includes('application/javascript')
    || normalized.includes('application/x-javascript')
    || normalized.includes('application/xml')
    || normalized.includes('image/svg+xml');
};

const buildUpstreamHeaders = (headers) => {
  const nextHeaders = {
    ...headers,
    host: upstreamUrl.host,
    'accept-encoding': 'identity',
    'x-forwarded-proto': 'https',
    'x-forwarded-host': upstreamUrl.host,
  };

  if (headers.origin) {
    nextHeaders.origin = rewriteUpstreamRequestValue(headers.origin);
  } else {
    delete nextHeaders.origin;
  }

  if (headers.referer) {
    nextHeaders.referer = rewriteUpstreamRequestValue(headers.referer);
  } else {
    delete nextHeaders.referer;
  }

  return nextHeaders;
};

const server = http.createServer((req, res) => {
  const upstreamReq = https.request({
    protocol: upstreamUrl.protocol,
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || 443,
    method: req.method,
    path: req.url,
    headers: buildUpstreamHeaders(req.headers),
  }, (upstreamRes) => {
    const responseHeaders = { ...upstreamRes.headers };
    delete responseHeaders['content-length'];
    delete responseHeaders['strict-transport-security'];
    delete responseHeaders['content-security-policy-report-only'];
    delete responseHeaders['report-to'];
    delete responseHeaders['nel'];
    delete responseHeaders['alt-svc'];

    if (typeof responseHeaders.location === 'string') {
      responseHeaders.location = rewriteLocation(responseHeaders.location);
    }

    if (Array.isArray(responseHeaders['set-cookie'])) {
      responseHeaders['set-cookie'] = responseHeaders['set-cookie'].map(rewriteCookie);
    }

    const contentType = Array.isArray(responseHeaders['content-type'])
      ? responseHeaders['content-type'][0]
      : responseHeaders['content-type'];

    if (!shouldRewriteBody(contentType)) {
      res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
      upstreamRes.pipe(res);
      return;
    }

    const chunks = [];
    upstreamRes.on('data', (chunk) => chunks.push(chunk));
    upstreamRes.on('end', () => {
      const original = Buffer.concat(chunks).toString('utf8');
      const rewritten = Buffer.from(rewriteText(original), 'utf8');
      responseHeaders['content-length'] = String(rewritten.length);
      res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
      res.end(rewritten);
    });
  });

  upstreamReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Local Keycloak proxy failed: ${error.message}`);
  });

  req.pipe(upstreamReq);
});

server.listen(localPort, localHost, () => {
  console.log(`[keycloak-proxy] forwarding ${localOrigin} -> ${upstreamOrigin}`);
});
