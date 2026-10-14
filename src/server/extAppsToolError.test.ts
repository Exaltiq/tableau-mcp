import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { JSONRPCMessage } from '@modelcontextprotocol/server';
import { z } from 'zod';

/**
 * ext-apps still imports MCP SDK v1, whose `McpError` is a different class from
 * v2 `ProtocolError`. The server only rethrows a tool failure as a JSON-RPC
 * error when `error instanceof ProtocolError`. A v1 `McpError` with the same
 * code is swallowed into an `isError` tool result, so this test fails if that
 * check starts using the v1 class.
 */
describe('ext-apps app-tool errors', () => {
  it('returns JSON-RPC -32042 when the app-tool callback throws ProtocolError', async () => {
    const { McpServer, ProtocolError, ProtocolErrorCode } = await vi.importActual<
      typeof import('@modelcontextprotocol/server')
    >('@modelcontextprotocol/server');

    const mcpServer = new McpServer({ name: 'tableau-mcp-test', version: '1.0.0' });
    registerAppTool(
      // ext-apps types this argument against MCP SDK v1.
      // @ts-expect-error -- v2 McpServer.registerTool is not the v1 signature ext-apps expects
      mcpServer,
      'app-tool',
      {
        description: 'App tool used to pin error propagation across the two SDK copies.',
        inputSchema: z.object({}),
        _meta: { ui: { resourceUri: 'ui://test/app.html' } },
      },
      async () => {
        throw new ProtocolError(ProtocolErrorCode.UrlElicitationRequired, 'need url', {
          elicitations: [],
        });
      },
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const wire: JSONRPCMessage[] = [];
    const send = serverTransport.send.bind(serverTransport);
    serverTransport.send = (message, options) => {
      wire.push(message);
      return send(message, options);
    };

    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);

    await expect(client.callTool({ name: 'app-tool', arguments: {} })).rejects.toMatchObject({
      code: -32042,
      message: 'need url',
      data: { elicitations: [] },
    });

    expect(wire.at(-1)).toMatchObject({
      jsonrpc: '2.0',
      error: {
        code: -32042,
        message: 'need url',
        data: { elicitations: [] },
      },
    });
    expect(wire.at(-1)).not.toHaveProperty('result');

    await client.close();
  });
});
