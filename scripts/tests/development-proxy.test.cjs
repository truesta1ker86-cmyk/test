const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProxy, createServerProxy, localRequest } = require('../development-proxy.cjs');

const access = {
  mode: 'isolated-copy',
  origin: 'https://dev.trycloudflare.com',
  username: 'frontend-dev',
  apiKey: 'only-a-unit-test-fixture-'.repeat(3),
};
const request = {
  headers: {
    host: '127.0.0.1:4200',
    origin: 'http://127.0.0.1:4200',
    'sec-fetch-site': 'same-origin',
    cookie: 'main_session=private; o1c_sandbox_session=copy',
  },
};

test('default Angular proxy targets only the isolated copy, preserving /v2/api', () => {
  const proxy = createProxy()['^/v2/api(?:/|$)'];
  assert.equal(proxy.target, 'http://127.0.0.1:55349');
  assert.equal(proxy.changeOrigin, true);
  assert.equal(proxy.rewrite, undefined);
});

test('foreign origins cannot cause the local dev server to add remote credentials', () => {
  const proxy = createProxy(access)['^/v2/api(?:/|$)'];
  assert.equal(proxy.bypass(request), undefined);
  for (const headers of [
    { host: 'evil.example' },
    { host: 'user@localhost:4200' },
    { host: 'localhost:4200', origin: 'https://evil.example' },
    { host: 'localhost:4200', 'sec-fetch-site': 'cross-site' },
  ]) {
    assert.equal(localRequest({ headers }), false);
    assert.equal(proxy.bypass({ headers }), false);
  }
});

test('remote key is injected server-side and only the sandbox cookie is forwarded', () => {
  const callbacks = {},
    headers = {};
  createProxy(access)['^/v2/api(?:/|$)'].configure({
    on(name, handler) {
      callbacks[name] = handler;
    },
  });
  callbacks.proxyReq(
    {
      setHeader(name, value) {
        headers[name] = value;
      },
      removeHeader(name) {
        delete headers[name];
      },
    },
    request,
  );
  assert.equal(
    headers.Authorization,
    'Basic ' + Buffer.from(access.username + ':' + access.apiKey).toString('base64'),
  );
  assert.equal(headers.Cookie, 'o1c_sandbox_session=copy');
  assert.equal(headers.Origin, access.origin);
});

test('loopback frontend keeps HttpOnly and SameSite while public Secure cookies stay server-side', () => {
  const callbacks = {};
  createProxy(access)['^/v2/api(?:/|$)'].configure({
    on(name, handler) {
      callbacks[name] = handler;
    },
  });
  const response = {
    headers: {
      'set-cookie': [
        'o1c_sandbox_session=copy; Path=/v2; HttpOnly; SameSite=strict; Secure; Domain=dev.trycloudflare.com',
      ],
    },
  };
  callbacks.proxyRes(response, request);
  assert.equal(
    response.headers['set-cookie'][0],
    'o1c_sandbox_session=copy; Path=/v2; HttpOnly; SameSite=strict',
  );
});

test('an unsafe URL or missing key is refused instead of starting an unauthenticated proxy', () => {
  for (const changes of [
    { origin: 'http://dev.example' },
    { origin: 'https://u:p@dev.example' },
    { origin: 'https://dev.example/v2/api' },
    { apiKey: undefined },
    { apiKey: 'short' },
  ]) {
    assert.throws(() => createProxy({ ...access, ...changes }));
  }
});

test('deployed v2 uses HTTPS and forwards only its own session, without owner credentials', () => {
  const proxy = createServerProxy()['^/v2/api(?:/|$)'];
  assert.equal(proxy.target, 'https://ozon1c.91.218.141.143.sslip.io');
  assert.equal(proxy.secure, true);
  assert.equal(proxy.rewrite, undefined);
  const callbacks = {};
  const headers = {
    Authorization: 'discard',
    'X-Tenant-Token': 'discard',
    'X-Admin-Token': 'discard',
  };
  proxy.configure({ on: (name, handler) => (callbacks[name] = handler) });
  callbacks.proxyReq(
    {
      setHeader: (name, value) => (headers[name] = value),
      removeHeader: (name) => delete headers[name],
    },
    {
      headers: {
        ...request.headers,
        cookie: 'o1_seller_session=owner; o1c_sandbox_session=local; o1c_v2_session=developer',
      },
    },
  );
  assert.equal(headers.Cookie, 'o1c_v2_session=developer');
  assert.equal(headers.Origin, proxy.target);
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers['X-Tenant-Token'], undefined);
  assert.equal(headers['X-Admin-Token'], undefined);
});

test('deployed v2 cookie stays HttpOnly and cannot install a primary-service cookie locally', () => {
  const callbacks = {};
  createServerProxy()['^/v2/api(?:/|$)'].configure({
    on: (name, handler) => (callbacks[name] = handler),
  });
  const response = {
    headers: {
      'set-cookie': [
        'o1c_v2_session=developer; Path=/v2; HttpOnly; SameSite=strict; Secure',
        'o1_seller_session=owner; Path=/; HttpOnly; Secure',
      ],
    },
  };
  callbacks.proxyRes(response, request);
  assert.deepEqual(response.headers['set-cookie'], [
    'o1c_v2_session=developer; Path=/v2; HttpOnly; SameSite=strict',
  ]);
});

test('server mode exposes v2 and legal documents without mounting the primary API', () => {
  const patterns = Object.keys(createServerProxy()).map((pattern) => new RegExp(pattern));
  for (const path of ['/v2/api/auth/options', '/legal/terms', '/legal/consent', '/legal/privacy'])
    assert.equal(
      patterns.some((pattern) => pattern.test(path)),
      true,
    );
  for (const path of ['/api/auth/session', '/api/admin', '/admin', '/v2/apievil'])
    assert.equal(
      patterns.some((pattern) => pattern.test(path)),
      false,
    );
});
