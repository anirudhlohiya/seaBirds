import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { fail } from "./lib/http";
import { adminRouter } from "./routes/admin";
import { publicRouter } from "./routes/public";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      // `c.env` is untyped inside the cors options factory, so cast it.
      const env = c.env as unknown as Env;
      const allowed = (env.ALLOWED_ORIGIN ?? "").trim() || "*";
      if (allowed === "*") return "*";
      return origin === allowed ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

app.route("/api", publicRouter);
app.route("/api/admin", adminRouter);

app.notFound((c) => fail(c, "not_found", "Route not found.", 404));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return fail(c, "internal_error", "Something went wrong.", 500);
});

export default app;
