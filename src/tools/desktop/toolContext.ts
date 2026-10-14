/* @mcp-codemod-error Unknown SDK import path: @modelcontextprotocol/sdk/experimental. Manual migration required. */
import { BaseToolCallback } from '@modelcontextprotocol/sdk/experimental';
import { CallToolResult, ServerContext } from '@modelcontextprotocol/server';

import { Config } from '../../config.desktop.js';
import { ToolExecutor } from '../../desktop/toolExecutor/toolExecutor.js';
import { DesktopMcpServer } from '../../server.desktop.js';
import { TableauToolContext } from '../toolContext.js';

// Additional context available to all desktop tool callbacks
export type TableauDesktopToolContext = TableauToolContext<DesktopMcpServer> & {
  config: Config;
  getExecutor: (sessionId: string) => Promise<ToolExecutor>;
};

// An extension of the RequestHandlerExtra type that includes the TableauDesktopToolContext
export type TableauDesktopRequestHandlerExtra = TableauDesktopToolContext & ServerContext;

// An extension of ToolCallback that includes additional context in the extra parameter
export type TableauDesktopToolCallback<
  Args extends undefined | ZodRawShapeCompat | AnySchema = undefined,
> = BaseToolCallback<CallToolResult, TableauDesktopRequestHandlerExtra, Args>;
