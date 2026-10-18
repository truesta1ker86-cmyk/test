"""Serve the test Angular build, proxying only explicitly enabled copy actions."""
import http.client
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1] / 'dist/ozon1c-v2/browser'
ORIGIN = 'http://127.0.0.1:55350'
POSTS = {'/v2/api/pricing/column-values', '/v2/api/pricing/editor/selection',
         '/v2/api/pricing/views/save', '/v2/api/pricing/views/delete'}
RESPONSE_HEADERS = {'content-type', 'set-cookie', 'cache-control', 'x-tenant-id',
                    'x-tenant-context-mismatch', 'x-sandbox-mode'}


class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Angular rebuilds change hashed chunks. Never reuse an older SPA entry
        # point while navigating between sections of this development preview.
        if not self.path.startswith('/v2/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def proxy(self, method, body=None):
        if (self.headers.get('Origin') not in (None, ORIGIN)
                or self.headers.get('Sec-Fetch-Site') == 'cross-site'):
            self.send_error(403)
            return
        headers = {name: self.headers[name] for name in
                   ('Cookie', 'X-Expected-Tenant-Id', 'Accept', 'Accept-Language', 'Content-Type', 'Sec-Fetch-Site')
                   if self.headers.get(name)}
        headers.update(Host='127.0.0.1:55349', Origin='http://127.0.0.1:55349')
        connection = http.client.HTTPConnection('127.0.0.1', 55349, timeout=90)
        try:
            connection.request(method, self.path, body=body, headers=headers)
            response = connection.getresponse()
            data = response.read()
            self.send_response(response.status)
            for name, value in response.getheaders():
                if name.lower() in RESPONSE_HEADERS:
                    self.send_header(name, value)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        finally:
            connection.close()

    def do_GET(self):
        if self.path.startswith('/v2/api/'):
            self.proxy('GET')
            return
        relative = urlsplit(self.path).path.removeprefix('/v2/').lstrip('/')
        candidate = (ROOT / relative).resolve()
        if not candidate.is_relative_to(ROOT.resolve()):
            self.send_error(403)
            return
        self.path = '/' + relative if candidate.is_file() else '/index.html'
        if self.path == '/index.html':
            for header in ('If-Modified-Since', 'If-None-Match'):
                if header in self.headers:
                    del self.headers[header]
        super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path not in POSTS:
            self.send_error(405, 'This action is disabled in the test preview')
            return
        length = int(self.headers.get('Content-Length', '0'))
        if not 0 <= length <= 256000:
            self.send_error(413)
            return
        self.proxy('POST', self.rfile.read(length))

    def do_PATCH(self):
        self.send_error(405)

    def do_DELETE(self):
        self.send_error(405)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print('Test frontend: http://127.0.0.1:55350/v2/pricing?page_size=25', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 55350), Preview).serve_forever()
