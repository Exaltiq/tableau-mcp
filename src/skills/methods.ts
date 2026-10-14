import type { McpServer } from '@modelcontextprotocol/server';

import { type SkillRegistry } from './registry.js';
import { SkillsListRequestSchema, type SkillsListResult } from './types.js';

/**
 * Registers the skills request handlers on the given server, backed by the registry.
 */
export function registerSkillMethodHandlers(mcp: McpServer, registry: SkillRegistry): void {
  /* @mcp-codemod-error Custom method handler: setRequestHandler(SkillsListRequestSchema, ...). In v2, use the 3-arg form: setRequestHandler('method/name', { params, result? }, handler). See docs/migration/upgrade-to-v2.md for details. */
  mcp.server.setRequestHandler(
    SkillsListRequestSchema,
    async (): Promise<SkillsListResult> => ({
      // resultType is always 'complete' because the full skill catalog is always enumerable
      resultType: 'complete',
      skills: registry.list().skills,
    }),
  );
}
