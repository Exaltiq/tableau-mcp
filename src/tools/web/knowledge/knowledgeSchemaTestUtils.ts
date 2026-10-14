import { z } from 'zod';

import { objectFromShape, ZodRawShapeCompat } from '../../zodShape.js';

/**
 * Reproduces the JSON Schema a raw tool params shape is advertised as.
 * v2 converts registered shapes with Zod 4 (`z.toJSONSchema`).
 */
export function advertisedInputSchema(paramsShape: ZodRawShapeCompat): Record<string, unknown> {
  return z.toJSONSchema(z.object(paramsShape), {
    io: 'input',
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
}

export { objectFromShape };
