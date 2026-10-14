import { z } from 'zod';

/**
 * Raw `{ field: z.string() }` map still accepted by `registerTool` (auto-wrapped
 * with `z.object()`). Values stay classic `ZodType` so `.safeParse` remains visible
 * after Zod 4 widened the SDK's raw-shape value to `$ZodType`.
 */
export type ZodRawShapeCompat = Record<string, z.ZodType>;

/** A constructed Zod schema, as opposed to a raw shape. */
export type AnySchema = z.ZodType;

export type SchemaOutput<S extends z.ZodType> = z.output<S>;

/**
 * Output of a raw shape, with Zod optional fields staying optional keys.
 * A wide `Record<string, ZodType>` (prompt factories) has no known keys; its
 * output stays an open string map, matching Zod 3's `objectOutputType`.
 */
export type ShapeOutput<Shape extends ZodRawShapeCompat> = string extends keyof Shape
  ? Record<string, any>
  : {
      [K in keyof Shape as undefined extends z.output<Shape[K]> ? never : K]: z.output<Shape[K]>;
    } & {
      [K in keyof Shape as undefined extends z.output<Shape[K]> ? K : never]?: z.output<Shape[K]>;
    };

export function objectFromShape(shape: ZodRawShapeCompat): z.ZodType {
  return z.object(shape);
}
