import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { JSONRPCMessage } from '@modelcontextprotocol/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { registerSkillMethodHandlers } from './methods.js';
import { type SkillRegistry } from './registry.js';
import { type SkillEntry } from './types.js';

const SKILL: SkillEntry = {
  uri: 'skill://test-skill/SKILL.md',
  frontmatter: { name: 'test-skill', description: 'A test skill.' },
  resources: [
    { uri: 'skill://test-skill/SKILL.md', digest: `sha256:${'a'.repeat(64)}`, size: 12 },
    {
      uri: 'skill://test-skill/references/example.md',
      digest: `sha256:${'b'.repeat(64)}`,
      size: 34,
    },
  ],
};

function makeRegistry(skills: SkillEntry[]): SkillRegistry {
  return {
    list: () => ({ skills }),
    get: (uri) => skills.find((s) => s.uri === uri),
    files: () => [],
  };
}

// We need to create a real mcpServer rather than testSetup's mock mcpServer in order to test
// skills/list custom routing
async function listSkills(
  registry: SkillRegistry,
  params?: Record<string, unknown>,
): Promise<JSONRPCMessage[]> {
  const { McpServer } = await vi.importActual<typeof import('@modelcontextprotocol/server')>(
    '@modelcontextprotocol/server',
  );
  const mcpServer = new McpServer({ name: 'test', version: '0.0.0' });
  registerSkillMethodHandlers(mcpServer, registry);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const wire: JSONRPCMessage[] = [];
  const send = serverTransport.send.bind(serverTransport);
  serverTransport.send = (message, options) => {
    wire.push(message);
    return send(message, options);
  };
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);
  // v2 clients lift `resultType` off the decoded result. The JSON-RPC body still carries it.
  await client.request(
    { method: 'skills/list', params },
    z.object({ skills: z.array(z.unknown()) }),
  );
  await client.close();

  return wire;
}

describe('skills/list', () => {
  it('returns every skill entry with resultType complete', async () => {
    const wire = await listSkills(makeRegistry([SKILL]), {});

    expect(wire.at(-1)).toMatchObject({
      result: { resultType: 'complete', skills: [SKILL] },
    });
  });

  it('accepts a request with no params', async () => {
    const wire = await listSkills(makeRegistry([SKILL]));

    expect(wire.at(-1)).toMatchObject({
      result: { resultType: 'complete', skills: [SKILL] },
    });
  });

  it('returns an empty list when there are no skills', async () => {
    const wire = await listSkills(makeRegistry([]), {});

    expect(wire.at(-1)).toMatchObject({
      result: { resultType: 'complete', skills: [] },
    });
  });
});
