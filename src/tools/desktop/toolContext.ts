import { ServerContext } from '@modelcontextprotocol/server';

import { Config } from '../../config.desktop.js';
import { ToolExecutor } from '../../desktop/toolExecutor/toolExecutor.js';
import { DesktopMcpServer } from '../../server.desktop.js';
import { HandlerCompatFields, TableauToolCallback, TableauToolContext } from '../toolContext.js';
import { AnySchema, ZodRawShapeCompat } from '../zodShape.js';

// Additional context available to all desktop tool callbacks
export type TableauDesktopToolContext = TableauToolContext<DesktopMcpServer> & {
  config: Config;
  getExecutor: (sessionId: string) => Promise<ToolExecutor>;
};

// An extension of the RequestHandlerExtra type that includes the TableauDesktopToolContext
export type TableauDesktopRequestHandlerExtra = TableauDesktopToolContext &
  ServerContext &
  HandlerCompatFields;

// An extension of ToolCallback that includes additional context in the extra parameter
export type TableauDesktopToolCallback<
  Args extends undefined | ZodRawShapeCompat | AnySchema = undefined,
> = TableauToolCallback<DesktopMcpServer, TableauDesktopRequestHandlerExtra, Args>;
