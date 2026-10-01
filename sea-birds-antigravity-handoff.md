# HANDOFF PROMPT — Sea Birds Luxury Textiles catalogue site
Copy everything below the line into Antigravity as the prompt.
---
You are taking over a web project from another AI assistant. The human owner is non-technical, works on **Windows 11 with PowerShell**, and has explicitly asked: **don't assume anything — ask when in doubt, and keep them in the loop on everything you do.** Follow that instruction strictly. Diagnose before changing code. Explain what you find in plain language before acting.

## 1. Project overview
**Sea Birds Luxury Textiles** — an enquiry-based catalogue website for a luxury Indian textile business. It has a customer-facing storefront and an admin portal for managing products, categories, settings, and generating catalogue PDFs. There is NO checkout/cart purchase flow — enquiries go through WhatsApp.

## 2. Tech stack (all chosen; do not change without asking the user)
| Layer | Technology | Location in repo |
|---|---|---|
| Website (storefront + admin UI) | Next.js 14 + TypeScript + Tailwind CSS, `output: 'export'` (fully static) | `web/` |
| Backend API | Hono v4 on Cloudflare Workers, TypeScript | `api/src/` |
| Database | Cloudflare D1 (SQLite) | `api/migrations/` (0001_schema.sql, 0002_seed.sql) |
| Image/file storage | Cloudflare R2, bucket `sea-birds-images` | bound as `IMAGES` in `wrangler.toml` |
| Cache/sessions | Cloudflare KV, namespace `CACHE` | bound as `CACHE` in `wrangler.toml` |
| PDF generation | `pdf-lib`, generated **client-side in the browser** (zero server cost) | `web/lib/pdf.ts`, `cataloguePdf.ts`, `enquiryPdf.ts`, `wishlistPdf.ts` |
| CLI tooling | `wrangler` v3 (repo pins `^3.91.0`; v4 exists but DO NOT upgrade mid-setup) | devDependency of `api/` |
| Design source | Stitch export; tokens: primary `#004357`, accent `#0D5C75`, WhatsApp `#25D366`, font Plus Jakarta Sans | `web/app/globals.css`, `web/tailwind.config.js` |

**Architecture:** visitor browser → Cloudflare Pages (static site from `web/out`) → `fetch /api/*` → Worker (`api/src`, Hono) → D1 (data) / R2 (images) / KV (cache, sessions). Enquiries skip the backend entirely (WhatsApp deep link). Wishlist lives in browser localStorage.

**DB tables:** `products`, `categories`, `product_images`, `catalogue_editions`, `store_settings`, `admin_users`, `sessions`.

**Key API routes:** public `GET /api/products`, `/api/categories`, `/api/settings`, `/api/catalogue`; admin `POST /api/admin/login`, then authed `GET /api/admin/dashboard`, `/api/admin/products`, `/api/admin/categories`, `/api/admin/settings`, `POST /api/admin/catalogue/upload` (see `api/src/routes/admin.ts`, `api/src/routes/public.ts`, `api/src/lib/auth.ts`, `api/src/middleware/requireAdmin.ts`).

**Auth design:** admin passwords stored as `pbkdf2$100000$<base64url salt>$<base64url hash>` (PBKDF2-SHA256, 100k iterations). Login verifies the hash, creates a session row, returns a bearer token the frontend stores. Seed script: `api/scripts/hash-password.mjs` (refuses passwords under 12 chars). The seed migration inserts `admin@example.com` with placeholder hash `PENDING_SEED__RUN_SCRIPTS_HASH_PASSWORD` — it MUST be replaced with a real hash before the login works.

## 3. Repo & GitHub
- Repo: `https://github.com/anirudhlohiya/seaBirds`, branch `main`, initial commit `1b32379` ("Initial Sea Birds catalogue scaffold"), 76 files, pushed 2026-10-01. Build verified: `web/ npm run build` exits 0 (16 routes prerendered), `api/ tsc --noEmit` clean.
- **Push gotcha (already solved, for reference):** the GitHub fine-grained PAT only worked for git push via **Basic auth** (`Authorization: Basic base64("x-access-token:<PAT>")`). The `Bearer` header returned 401 on `git-receive-pack`. Do not commit any token anywhere.

## 4. User's confirmed decisions (do not relitigate)
1. **Zero server cost.** Cloudflare free tier only (Pages + Workers + D1 + R2 + KV). A $1 budget alert is being set at Manage Account → Notifications.
2. **Enquiries are WhatsApp-only.** Nothing stored server-side; no enquiry tables/endpoints.
3. **Wishlist is guest-only**, in localStorage. No login/sync.
4. **Catalogue PDFs are auto-generated** client-side in `/admin/catalogue` (scope picker + toggles + recipient personalization) and uploaded to R2 — never manually uploaded files.
5. The user will add their own API details locally, deploy themselves, and **connect the domain themselves**. Don't do the domain step for them; guide only.
6. Code must stay production-quality.

## 5. Current state on the user's machine (2026-10-01)
- Repo cloned to `F:\Anirudh\sea birds\seaBirds`; `npm install` run once at repo root (npm workspaces cover `web/` + `api/`). The "deprecated / vulnerabilities" npm warnings are normal noise — ignore.
- Cloudflare account created; `npx wrangler login` done. Cloudflare account ID (from their terminal output): `ea65fe0e2a5a29d3b15a408241ef4186`.
- `npx wrangler d1 create sea-birds-db` — believed OK (no error reported).
- `npx wrangler kv namespace create CACHE` — believed OK (no error reported).
- `npx wrangler r2 bucket create sea-birds-images` — initially failed with `[code: 10042] Please enable R2 through the Cloudflare Dashboard`. User then enabled R2 in the dashboard and added a credit card (required by Cloudflare to activate R2; free tier is 10 GB storage, usage will be a few hundred MB). **Retry of the bucket-create command may still be pending — verify.**
- `wrangler.toml` (repo root): `PLACEHOLDER_D1_DATABASE_ID` and `PLACEHOLDER_KV_NAMESPACE_ID` may not yet be filled in. `ALLOWED_ORIGIN` is still `https://www.example.com`, `R2_PUBLIC_BASE_URL` is still `https://images.example.com`.
- `web/.env.local` was created from `web/.env.example`; `NEXT_PUBLIC_USE_MOCK` was set to `true` to preview the storefront, then set back to `false` for real-backend testing.
- `npm run dev` in `web/` works — storefront visible at `http://localhost:3000`.
- `npm run dev` in `api/` works — `Ready on http://127.0.0.1:8787`. The `compatibility_date` fallback warning (`2026-09-01` → `2025-07-18`) is harmless; ignore it.

## 6. THE CURRENT PROBLEM — admin login still not working
The user started both dev servers and opened `http://localhost:3000/admin`, but login does not work ("it's still not working" — exact current error message unknown; ask them to reproduce and share the browser console + terminal output).

**What was already ruled out:**
- The React hydration warning about `data-new-gr-c-s-check-loaded` / `data-gr-ext-installed` is caused by the user's **Grammarly browser extension** — harmless, unrelated.
- `GET http://localhost:8787/api/admin/dashboard → ERR_CONNECTION_REFUSED` earlier was just the API not running — now fixed (both servers run).
- `GET / → 404` on port 8787 is expected (the API has no homepage).
- `OPTIONS /api/admin/login → 204` was observed, so the login page IS reaching the API and CORS preflight passes.

**Your diagnostic checklist (in order):**
1. Confirm `wrangler.toml` has the real D1 database ID pasted (needed for `--local` D1 file mapping).
2. Verify migrations actually ran locally:
   `npx wrangler d1 execute sea-birds-db --local --command="SELECT name FROM sqlite_master WHERE type='table'"`
   Expect the 7 tables. If missing/empty, run in order:
   `npx wrangler d1 execute sea-birds-db --local --file=api/migrations/0001_schema.sql`
   `npx wrangler d1 execute sea-birds-db --local --file=api/migrations/0002_seed.sql`
3. Check the admin row:
   `npx wrangler d1 execute sea-birds-db --local --command="SELECT email, substr(password_hash,1,20) FROM admin_users"`
   If the hash is still `PENDING_SEED__RUN_SC` (placeholder), the password was never seeded — that's the bug. Fix:
   `node api/scripts/hash-password.mjs 'a-strong-password-12-plus-chars'` → copy the printed `pbkdf2$...` string →
   `npx wrangler d1 execute sea-birds-db --local --command="UPDATE admin_users SET password_hash='<PASTE>' WHERE email='admin@example.com'"`
   (Run from repo root. PowerShell: single-line commands only — `\` line continuations are bash syntax and will fail.)
4. Confirm the login email being tried matches the row (default `admin@example.com`; the seed migration comment says to change it to the real address — check whether the user already changed it, and use THAT email).
5. Reproduce the login and read the actual response: open browser devtools → Network tab → try login → inspect `POST /api/admin/login` status/body (401 = wrong credentials/hash mismatch; 500 = server error — then read the `wrangler dev` terminal output; network failure = API not reachable).
6. If 401 with a freshly-seeded hash, compare `api/src/lib/auth.ts` `verifyPassword` parsing against the `hash-password.mjs` output format (`pbkdf2$100000$<salt>$<hash>`, base64url). Note `admin.ts` line ~35 falls back to a dummy hash when the stored value is missing — ensure the UPDATE actually committed.

## 7. Remaining work after login is fixed
1. Fill `wrangler.toml` completely (D1 id, KV id, `ALLOWED_ORIGIN` = production Pages URL, `R2_PUBLIC_BASE_URL` = public R2 URL).
2. Run migrations + password seeding against the **production** D1 (same commands **without** `--local`).
3. `npx wrangler deploy` (Worker → `sea-birds-api.<account>.workers.dev`).
4. Deploy `web/` to Cloudflare Pages: connect the GitHub repo in the dashboard; build command `npm run build --workspace=web`; output dir `web/out`; env var `NEXT_PUBLIC_API_URL` = the workers.dev URL. (Or `npx wrangler pages deploy web/out`.)
5. Replace placeholder image URLs (`https://images.example.com/...` in seed + `web/public/images` SVGs) with real product photography in R2; verify the WhatsApp number in `store_settings` seed (`+919820144520` — confirm with the user it's the real business number).
6. User connects their custom domain themselves (guide, don't execute).
7. Known follow-ups (not blockers): admin product image upload currently takes image URLs — direct browser→R2 upload is a future step; admin login has no 2FA yet.

## 8. Definition of done for this handoff
Admin login works locally end-to-end (`/admin` → login → dashboard loads real data from local D1), and the user has a clear, tested command sequence for the production deploy steps above.
