const { readFileSync } = require('node:fs');

function localRequest(request) {
  try {
    const host = new URL('http://' + request.headers.host);
    if (
      !['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) ||
      host.username ||
      host.password
    )
      return false;
    if (request.headers['sec-fetch-site'] === 'cross-site') return false;
    return !request.headers.origin || request.headers.origin === host.origin;
  } catch {
    return false;
  }
}

function createProxy(access) {
  let target = 'http://127.0.0.1:55349';
  let authorization;
  if (access) {
    const url = new URL(access.origin);
    if (
      access.mode !== 'isolated-copy' ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      typeof access.username !== 'string' ||
      !access.username ||
      typeof access.apiKey !== 'string' ||
      access.apiKey.length < 32
    )
      throw new Error('Use the generated dev-api-access.json from the isolated copy');
    target = url.origin;
    authorization =
      'Basic ' + Buffer.from(access.username + ':' + access.apiKey).toString('base64');
  }
  return proxyConfig(target, 'o1c_sandbox_session', authorization);
}

function createServerProxy() {
  const config = proxyConfig('https://ozon1c.91.218.141.143.sslip.io', 'o1c_v2_session');
  config['^/legal/(?:terms|privacy|consent)$'] = { ...config['^/v2/api(?:/|$)'] };
  return config;
}

function proxyConfig(target, cookieName, authorization) {
  return {
    '^/v2/api(?:/|$)': {
      target,
      secure: true,
      changeOrigin: true,
      // Vite refuses false before forwarding a request or adding server credentials.
      bypass(request) {
        return localRequest(request) ? undefined : false;
      },
      configure(proxy) {
        proxy.on('proxyReq', (outgoing, request) => {
          outgoing.setHeader('Origin', target);
          outgoing.setHeader('Sec-Fetch-Site', 'same-origin');
          outgoing.removeHeader('Authorization');
          outgoing.removeHeader('X-Tenant-Token');
          outgoing.removeHeader('X-Admin-Token');
          if (authorization) outgoing.setHeader('Authorization', authorization);
          const cookie = (request.headers.cookie || '')
            .split(';')
            .map((value) => value.trim())
            .find((value) => value.startsWith(cookieName + '='));
          outgoing.removeHeader('Cookie');
          if (cookie) outgoing.setHeader('Cookie', cookie);
        });
        proxy.on('proxyRes', (response, request) => {
          if (!localRequest(request)) return;
          // These are cookies for the developer's loopback HTTP frontend only;
          // the public gateway always issues Secure cookies over HTTPS.
          if (response.headers['set-cookie'])
            response.headers['set-cookie'] = response.headers['set-cookie']
              .filter((value) => value.startsWith(cookieName + '='))
              .map((value) =>
                value.replace(/;\s*Secure(?=;|$)/gi, '').replace(/;\s*Domain=[^;]*/gi, ''),
              );
        });
      },
    },
  };
}

function remoteProxy() {
  const access = JSON.parse(
    readFileSync(process.env.O1C_DEV_API_ACCESS || 'dev-api-access.json', 'utf8'),
  );
  return createProxy(access);
}

module.exports = { createProxy, createServerProxy, remoteProxy, localRequest };
