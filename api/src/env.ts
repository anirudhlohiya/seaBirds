import type { D1Database, KVNamespace, R2Bucket } from "@cloudflare/workers-types";

/**
 * Worker environment bindings.
 *
 * NOTE: the root `wrangler.toml` (created by the parent orchestrator)
 * binds exactly these names. Vars are strings; secrets are not used —
 * there are no credentials stored in the repo or in the Worker env.
 */
export interface Env {
  /** D1 database holding catalogue, sessions, and settings. */
  DB: D1Database;
  /** R2 bucket for product / catalogue imagery. */
  IMAGES: R2Bucket;
  /** KV cache namespace for cheap read-through caching (optional). */
  CACHE: KVNamespace;
  /** Single allowed CORS origin, e.g. "https://sea-birds.example.com". */
  ALLOWED_ORIGIN: string;
  /** Session lifetime in hours, e.g. "72". Parsed with Number(). */
  SESSION_TTL_HOURS: string;
  /**
   * Public base URL of the R2 bucket (custom domain or r2.dev URL),
   * e.g. "https://images.sea-birds.example.com". Parent sets this as a
   * PLACEHOLDER var in wrangler.toml. Used to build file_url values for
   * uploaded catalogue PDFs. No trailing slash.
   */
  R2_PUBLIC_BASE_URL: string;
}
