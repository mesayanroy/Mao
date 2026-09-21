import type { ZodType } from 'zod';

/** Parses `data` against `schema`, throwing a ZodError the error handler turns into a 400. */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
