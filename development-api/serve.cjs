const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');

const files = {
  '/': [join(__dirname, 'index.html'), 'text/html; charset=utf-8'],
  '/swagger-init.js': [join(__dirname, 'swagger-init.js'), 'application/javascript'],
  '/openapi-server-v2.json': [join(__dirname, 'openapi-server-v2.json'), 'application/json'],
  '/openapi-main.json': [join(__dirname, 'openapi-main.json'), 'application/json'],
  '/swagger-ui.css': [require.resolve('swagger-ui-dist/swagger-ui.css'), 'text/css'],
  '/swagger-ui-bundle.js': [
    require.resolve('swagger-ui-dist/swagger-ui-bundle.js'),
    'application/javascript',
  ],
  '/swagger-ui-standalone-preset.js': [
    require.resolve('swagger-ui-dist/swagger-ui-standalone-preset.js'),
    'application/javascript',
  ],
};

createServer(async (request, response) => {
  const path = request.url.split('?')[0];
  const file = Object.hasOwn(files, path) ? files[path] : undefined;
  if (!file || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(file[0]);
    response.writeHead(200, {
      'Content-Type': file[1],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(503).end('API documentation unavailable');
  }
}).listen(55354, '127.0.0.1', () => {
  console.log('API documentation: http://127.0.0.1:55354/');
});
