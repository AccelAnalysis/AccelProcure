import http from 'http';

class TestRequest {
  constructor(app, method, path) {
    this.app = app;
    this.method = method;
    this.path = path;
    this.body = undefined;
  }

  send(payload = {}) {
    this.body = payload;
    return this;
  }

  async expect(statusCode) {
    const response = await this.performRequest();
    if (response.status !== statusCode) {
      throw new Error(`Expected status ${statusCode} but received ${response.status}`);
    }
    return response;
  }

  performRequest() {
    return new Promise((resolve, reject) => {
      const server = http.createServer(this.app);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        const bodyString = this.body !== undefined ? JSON.stringify(this.body) : null;
        const headers = {
          'Content-Type': 'application/json',
        };
        if (bodyString) {
          headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const requestOptions = {
          method: this.method,
          path: this.path,
          port,
          hostname: '127.0.0.1',
          headers,
        };

        const req = http.request(requestOptions, (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            server.close();
            const rawBody = Buffer.concat(chunks).toString();
            let parsed = rawBody;
            try {
              parsed = rawBody ? JSON.parse(rawBody) : null;
            } catch (error) {
              parsed = rawBody;
            }
            resolve({ status: res.statusCode, body: parsed, headers: res.headers });
          });
        });

        req.on('error', (error) => {
          server.close();
          reject(error);
        });

        if (bodyString) {
          req.write(bodyString);
        }
        req.end();
      });
    });
  }
}

const request = (app) => ({
  get: (path) => new TestRequest(app, 'GET', path),
  post: (path) => new TestRequest(app, 'POST', path),
});

export default request;
