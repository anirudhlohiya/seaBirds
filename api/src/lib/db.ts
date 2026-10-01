import type { D1Database, D1Result } from "@cloudflare/workers-types";

/** Result of a write query. */
export interface RunResult {
  /** Row id of the inserted row (or 0 for UPDATE/DELETE). */
  lastRowId: number;
  /** Number of rows affected. */
  changes: number;
}

/** All rows of a SELECT. */
export async function queryAll<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const res: D1Result<T> = await db
    .prepare(sql)
    .bind(...params)
    .all();
  return res.results ?? [];
}

/** First row of a SELECT, or null when nothing matches. */
export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const res: D1Result<T> = await db
    .prepare(sql)
    .bind(...params)
    .all();
  const row = res.results?.[0];
  return row ?? null;
}

/** INSERT / UPDATE / DELETE. */
export async function run(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<RunResult> {
  const res: D1Result = await db
    .prepare(sql)
    .bind(...params)
    .run();
  return {
    lastRowId: Number(res.meta.last_row_id ?? 0),
    changes: Number(res.meta.changes ?? 0),
  };
}
