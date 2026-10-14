import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer, SdkError, SdkErrorCode } from '@modelcontextprotocol/server';
import express from 'express';
import http from 'http';
import request from 'supertest';
import { z } from 'zod';

import { getConfig } from '../config.js';
import { startExpressServer } from './express.js';

const MCP_ACCEPT = 'application/json, text/event-stream';

const initializeBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'sdk-v2-trap-test', version: '1.0.0' },
  },
};

/**
 * Same construction as the stateless branch in express.ts: a new server and a
 * new transport for every POST. SDK v2 2.3.0+ throws ALREADY_CONNECTED if one
 * server instance is connected twice.
 */
async function handleStateless(
  realServer: typeof McpServer,
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const server = new realServer({ name: 'tableau-mcp-test', version: '1.0.0' });
  server.registerTool('known-tool', { inputSchema: z.object({}) }, async () => ({
    content: [{ type: 'text', text: 'ok' }],
  }));
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

describe('SDK v2 trap behaviors', () => {
  describe('OAuth failures stay HTTP 401', () => {
    let server: http.Server;

    beforeAll(async () => {
      vi.stubEnv('TRANSPORT', 'http');
      vi.stubEnv('AUTH', 'pat');
      vi.stubEnv('OAUTH_ISSUER', 'https://issuer.example');
      vi.stubEnv('OAUTH_EMBEDDED_AUTHZ_SERVER', 'false');
      vi.stubEnv('PORT', '47821');

      ({ server } = await startExpressServer({
        basePath: 'tableau-mcp',
        config: getConfig(),
        logLevel: 'error',
      }));
    });

    afterAll(async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      vi.unstubAllEnvs();
    });

    it('returns 401 unauthorized when the bearer token is missing', async () => {
      const response = await request(server)
        .post('/tableau-mcp')
        .set('Accept', MCP_ACCEPT)
        .send(initializeBody);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: 'unauthorized' });
      expect(response.body.error_description).toContain('Authorization required');
      expect(response.body.error_description).toContain(
        'A 401 is an authentication problem, not a missing feature.',
      );
      expect(response.headers['www-authenticate']).toContain('Bearer realm="MCP"');
    });

    it('returns 401 invalid_token for a malformed bearer token', async () => {
      const response = await request(server)
        .post('/tableau-mcp')
        .set('Accept', MCP_ACCEPT)
        .set('Authorization', 'Bearer not-a-jwt')
        .send(initializeBody);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: 'invalid_token' });
      expect(response.body.error_description).toContain('Invalid or expired access token');
    });
  });

  describe('stateless Streamable HTTP', () => {
    let realServer: typeof McpServer;
    let app: express.Express;

    beforeAll(async () => {
      ({ McpServer: realServer } = await vi.importActual<
        typeof import('@modelcontextprotocol/server')
      >('@modelcontextprotocol/server'));

      app = express();
      app.use(express.json());
      app.post('/tableau-mcp', (req, res, next) => {
        handleStateless(realServer, req, res).catch(next);
      });
    });

    it('serves two sequential requests on fresh server instances', async () => {
      const first = await request(app)
        .post('/tableau-mcp')
        .set('Accept', MCP_ACCEPT)
        .send(initializeBody);
      const second = await request(app)
        .post('/tableau-mcp')
        .set('Accept', MCP_ACCEPT)
        .send(initializeBody);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.text).toContain('"protocolVersion":"2025-06-18"');
      expect(second.text).toContain('"protocolVersion":"2025-06-18"');
    });

    it('keeps the unknown-tool JSON-RPC code at -32602', async () => {
      const response = await request(app)
        .post('/tableau-mcp')
        .set('Accept', MCP_ACCEPT)
        .send({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'missing-tool', arguments: {} },
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('"code":-32602');
      expect(response.text).toContain('Tool missing-tool not found');
    });

    it('throws ALREADY_CONNECTED when one server is connected twice', async () => {
      const server = new realServer({ name: 'tableau-mcp-test', version: '1.0.0' });
      const first = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(first);

      const second = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await expect(server.connect(second)).rejects.toBeInstanceOf(SdkError);
      await expect(server.connect(second)).rejects.toMatchObject({
        code: SdkErrorCode.AlreadyConnected,
      });
    });
  });
});
