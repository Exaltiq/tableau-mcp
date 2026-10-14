import { McpServer, ServerContext, ToolCallback } from '@modelcontextprotocol/server';

import pkg from '../package.json';
import { getDesktopConfig } from './config.desktop.js';
import { SessionManager } from './desktop/sessionManager.js';
import { ClientInfo, Server } from './server.js';
import { registerSkills } from './skills/index.js';
import { DesktopTool } from './tools/desktop/tool.js';
import { TableauDesktopRequestHandlerExtra } from './tools/desktop/toolContext.js';
import { desktopToolFactories } from './tools/desktop/tools.js';
import { Provider } from './utils/provider.js';

const serverName = 'tableau-desktop-mcp';
const serverVersion = pkg.version;

export class DesktopMcpServer extends Server {
  private readonly sessionManager = new SessionManager();

  constructor({ mcpServer, clientInfo }: { mcpServer?: McpServer; clientInfo?: ClientInfo } = {}) {
    super({ mcpServer, clientInfo, serverName, serverVersion });
  }

  registerTools = async (): Promise<void> => {
    const config = getDesktopConfig();

    for (const {
      name,
      title,
      description,
      paramsSchema,
      annotations,
      callback,
    } of await this._getToolsToRegister()) {
      const toolCallback: ToolCallback<typeof paramsSchema> = async (
        args: typeof paramsSchema,
        extra: ServerContext,
      ) => {
        const tableauToolCallback = await Provider.from(callback);
        const tableauRequestHandlerExtra: TableauDesktopRequestHandlerExtra = {
          ...extra,
          requestId: extra.mcpReq.id,
          signal: extra.mcpReq.signal,
          authInfo: extra.http?.authInfo,
          config,
          getExecutor: async (sessionId: string) => {
            return await this.sessionManager.getExecutor(sessionId);
          },
          server: this,
        };

        return tableauToolCallback(args, tableauRequestHandlerExtra);
      };

      /* @mcp-codemod-error Could not verify `inputSchema` is a schema object. Raw shapes are deprecated in v2 — pass a Standard Schema object (e.g. z.object({ … })); no change is needed if it already is one. */
      this.mcpServer.registerTool(
        name,
        {
          title: await Provider.from(title),
          description: await Provider.from(description),
          inputSchema: await Provider.from(paramsSchema),
          annotations: await Provider.from(annotations),
        },
        toolCallback,
      );
    }

    await this.enableSkillsCapability();
    await registerSkills(this);
  };

  protected _getToolsToRegister = async (): Promise<Array<DesktopTool<any>>> => {
    const allTools = desktopToolFactories.map((toolFactory) => toolFactory(this));
    return allTools;
  };
}
