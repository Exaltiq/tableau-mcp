import { GetPromptResult } from '@modelcontextprotocol/server';

import { Config } from '../config.js';
import { WebMcpServer } from '../server.web.js';
import { ShapeOutput, ZodRawShapeCompat } from '../tools/zodShape.js';

export type WebPromptRegistration<Args extends ZodRawShapeCompat = ZodRawShapeCompat> = {
  name: string;
  title?: string;
  description: string;
  argsSchema?: Args;
  // Returns (or resolves to) true if the prompt should be skipped for the current server config.
  disabled: (config: Config) => boolean | Promise<boolean>;
  callback: (args: ShapeOutput<Args>) => GetPromptResult | Promise<GetPromptResult>;
};

export type WebPromptFactory = (server: WebMcpServer) => WebPromptRegistration;
