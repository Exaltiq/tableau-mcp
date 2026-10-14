import { AuthInfo, CallToolResult, RequestId, ServerContext } from '@modelcontextprotocol/server';

import { Server } from '../server.js';
import { AnySchema, SchemaOutput, ShapeOutput, ZodRawShapeCompat } from './zodShape.js';

// Additional context available to all tool callbacks
export type TableauToolContext<TServer extends Server> = {
  server: TServer;
};

/**
 * v1 handler fields that v2 nested under `mcpReq` / `http`. Tool callbacks and
 * `useRestApi` still read the flat names; the HTTP/stdio wrappers copy them here.
 */
export type HandlerCompatFields = {
  requestId: RequestId;
  signal: AbortSignal;
  authInfo?: AuthInfo;
};

// An extension of the RequestHandlerExtra type that includes the TableauToolContext
export type TableauRequestHandlerExtra<TServer extends Server> = TableauToolContext<TServer> &
  ServerContext &
  HandlerCompatFields;

// v2's BaseToolCallback only accepts a Standard Schema. Tools still register raw Zod shapes,
// so the callback type is defined here.
export type TableauToolCallback<
  TServer extends Server,
  TExtra extends TableauRequestHandlerExtra<TServer>,
  Args extends undefined | ZodRawShapeCompat | AnySchema = undefined,
> = Args extends ZodRawShapeCompat
  ? (args: ShapeOutput<Args>, extra: TExtra) => CallToolResult | Promise<CallToolResult>
  : Args extends AnySchema
    ? (args: SchemaOutput<Args>, extra: TExtra) => CallToolResult | Promise<CallToolResult>
    : (extra: TExtra) => CallToolResult | Promise<CallToolResult>;
