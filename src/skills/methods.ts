import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { type SkillRegistry } from './registry.js';
import { type SkillsListResult } from './types.js';

/**
 * Registers the skills request handlers on the given server, backed by the registry.
 */
export function registerSkillMethodHandlers(mcp: McpServer, registry: SkillRegistry): void {
  mcp.server.setRequestHandler(
    'skills/list',
    { params: z.object({}).passthrough().optional() },
    async (): Promise<SkillsListResult> => ({
      // resultType is always 'complete' because the full skill catalog is always enumerable
      resultType: 'complete',
      skills: registry.list().skills,
    }),
  );
}
