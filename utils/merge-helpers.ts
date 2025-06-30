/*
 * Utility helpers for safe object merging.
 * mergeDefined: merges only keys whose values are not undefined/null.
 */
import { ZodSchema } from 'zod';

export function mergeDefined<T>(target: T, patch: Partial<T>): T {
  const result: any = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && value !== null) {
      result[key as keyof T] = value as any;
    }
  }
  return result as T;
}

/**
 * Merge base and patch then validate against a Zod schema.
 * Guarantees returned object conforms to type T at runtime.
 */
export function safeMerge<T>(base: T, patch: Partial<T>, schema: ZodSchema<T>): T {
  return schema.parse({ ...base, ...patch });
}

