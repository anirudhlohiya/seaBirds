import type { Context } from "hono";

/** Success envelope: `{ok:true, data}` or `{ok:true}`. */
export function ok<T>(c: Context, data?: T, status: number = 200) {
  return c.json({ ok: true, data }, status as 200);
}

/** Error envelope: `{error:{code, message}}`. */
export function fail(c: Context, code: string, message: string, status: number) {
  return c.json({ error: { code, message } }, status as 400);
}

/** Parse a JSON body; 400 when missing or malformed. */
export async function reqJson<T = Record<string, unknown>>(
  c: Context
): Promise<{ data: T | null; error: Response | null }> {
  try {
    const data = (await c.req.json()) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: fail(c, "invalid_json", "Request body must be valid JSON.", 400) };
  }
}

/**
 * Parse a query / body value as an integer.
 * Returns null when absent (caller picks the default) or non-integer.
 */
export function asInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  return n;
}

/**
 * Clamp a query / body value to one of the allowed enum values.
 * `value: null, invalid: false` when absent; `invalid: true` when
 * present but not one of the allowed values.
 */
export function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): { value: T | null; invalid: boolean } {
  if (value === undefined || value === null || value === "") {
    return { value: null, invalid: false };
  }
  const s = String(value);
  if ((allowed as readonly string[]).includes(s)) {
    return { value: s as T, invalid: false };
  }
  return { value: null, invalid: true };
}

/** Trimmed non-empty string, or null. */
export function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}

/** Today's UTC date as "YYYY-MM-DD" (for per-day counters). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
