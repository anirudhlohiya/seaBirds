import type { MiddlewareHandler } from "hono";
import type { Env } from "../env";
import type { AdminUser } from "../lib/auth";
import { validateSession } from "../lib/auth";
import { fail } from "../lib/http";

declare module "hono" {
  interface ContextVariableMap {
    /** Admin user attached after Bearer session validation. */
    adminUser: AdminUser;
    /** The raw Bearer token (used for logout). */
    sessionToken: string;
  }
}

/**
 * Require a valid admin session.
 *
 * Reads `Authorization: Bearer <token>`, validates it against the
 * `sessions` table (expiry checked), 401 on any failure, and sets
 * `c.get("adminUser")` / `c.get("sessionToken")` on success.
 */
export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim() ?? "";
  if (!token) {
    return fail(c, "unauthorized", "Missing Authorization Bearer token.", 401);
  }
  const user = await validateSession(c.env.DB, token);
  if (!user) {
    return fail(c, "unauthorized", "Invalid or expired session token.", 401);
  }
  c.set("adminUser", user);
  c.set("sessionToken", token);
  await next();
};
