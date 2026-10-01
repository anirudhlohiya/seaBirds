# Sea Birds Luxury Textiles — Catalogue Site

Enquiry-based catalogue site for a luxury textile business. Storefront + admin portal,
API on Cloudflare Workers, data in D1, images in R2, cache in KV. **Target cost: $0/month.**

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │            Cloudflare Edge                │
                    │                                         │
  Visitor ─────────►│  Pages (web/out — static Next.js)       │
                    │     │                                   │
                    │     │  fetch /api/*                     │
                    │     ▼                                   │
                    │  Worker (api/src — Hono)                │
                    │     │      │         │                  │
                    │     ▼      ▼         ▼                  │
                    │    D1     R2        KV                  │
                    │  (data) (images)  (cache)               │
                    └─────────────────────────────────────────┘

  Admin ──► /admin/* (static pages, client-side session token)
              │  Authorization: Bearer <session>
              ▼
           Worker /api/admin/* ──► D1 (products, categories,
                                      settings, catalogue_editions)
                                       │
  Admin generates catalogue PDF ───────┘
  in browser (pdf-lib) → POST /api/admin/catalogue/upload
                       → Worker streams PDF → R2 /catalogues/...

Notes:
- Enquiries are WhatsApp-only: the /enquiry page builds a wa.me deep link with
  the full order text; nothing is stored server-side (no enquiry tables/endpoints).
- Wishlist is guest-only in browser localStorage (no backend).
- Catalogue PDFs are auto-generated client-side in /admin/catalogue (pdf-lib),
  uploaded to R2 via the authed upload endpoint, and listed publicly via
  GET /api/catalogue.
```

- `web/` — Next.js 14 + TypeScript + Tailwind, `output: 'export'` (fully static).
  Deploys to **Cloudflare Pages**. Public catalogue pages are pre-rendered;
  interactive parts (filters, wishlist, enquiry basket) run client-side and call
  the API, falling back to bundled mock data if the API is unreachable.
- `api/` — Hono router on **Cloudflare Workers**. Public read endpoints
  (`/api/products`, `/api/categories`, `/api/settings`, …) plus session-auth
  admin endpoints (`/api/admin/*`). Passwords hashed with PBKDF2-SHA256
  (WebCrypto); sessions stored in D1.
- `api/migrations/` — versioned D1 schema + seed data.

## Repo layout

```
sea-birds-catalogue/
├── web/                    # Next.js storefront + admin portal
│   ├── app/                # routes: /, /products, /products/[slug], /wishlist,
│   │                       #   /enquiry, /catalogue, /admin/...
│   ├── components/         # ProductCard, BottomNav, AdminShell, UiButton, ...
│   ├── lib/                # api.ts (typed client), mock.ts, store.ts, types.ts
│   └── public/images/      # local SVG placeholders (replaced by R2 images)
├── api/
│   ├── src/                # Hono app: index, routes, middleware, lib/auth, lib/db
│   ├── migrations/         # 0001_schema.sql, 0002_seed.sql
│   └── scripts/            # hash-password.mjs (local admin-password seeding)
├── wrangler.toml           # Worker config — fill in PLACEHOLDER ids
└── README.md
```

## Local development

Prereqs: Node 20+, `npm`, and `wrangler` (installed as a devDependency of `api/`).

```bash
# 1. install everything (npm workspaces)
npm install

# 2. API: create local D1 + apply migrations
cd api
npx wrangler d1 create sea-birds-db            # copy the id into wrangler.toml (local only)
npx wrangler d1 execute sea-birds-db --local --file=migrations/0001_schema.sql
npx wrangler d1 execute sea-birds-db --local --file=migrations/0002_seed.sql

# 3. seed the admin password (never commit the output)
node scripts/hash-password.mjs 'choose-a-strong-password'
# → paste the printed pbkdf2$... string:
npx wrangler d1 execute sea-birds-db --local \
  --command="UPDATE admin_users SET password_hash='<PASTE>' WHERE email='admin@example.com'"

# 4. run the API
npm run dev        # → http://localhost:8787

# 5. run the web app (separate terminal, repo root)
cd web && cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8787
npm run dev        # → http://localhost:3000
```

With `NEXT_PUBLIC_USE_MOCK=true` the storefront renders fully from `web/lib/mock.ts`
without any backend — useful for UI work.

## Environment setup

| File | Purpose |
|---|---|
| `web/.env.example` → `web/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_USE_MOCK` |
| `api/.env.example` | deploy-time notes (Cloudflare API token, account id) |
| `wrangler.toml` | Worker bindings — replace `PLACEHOLDER_D1_DATABASE_ID` / `PLACEHOLDER_KV_NAMESPACE_ID`, set `ALLOWED_ORIGIN` to your Pages domain and `R2_PUBLIC_BASE_URL` to your public R2 URL |

No secrets are committed. Admin credentials exist only in your D1 database.

## Deploy (all free tier)

```bash
# 1. API — create prod resources once
wrangler d1 create sea-birds-db
wrangler r2 bucket create sea-birds-images
wrangler kv namespace create CACHE
# → put the returned ids into wrangler.toml, set ALLOWED_ORIGIN to your Pages URL
#   and R2_PUBLIC_BASE_URL to the public URL of the sea-birds-images bucket
wrangler d1 execute sea-birds-db --file=api/migrations/0001_schema.sql
wrangler d1 execute sea-birds-db --file=api/migrations/0002_seed.sql
# → set the admin password hash as in step 3 above (without --local)
wrangler deploy

# 2. Web — Cloudflare Pages
#    Connect this repo in the Cloudflare dashboard:
#    Framework preset: Next.js (Static HTML Export)
#    Build command:  npm run build --workspace=web
#    Build output:   web/out
#    Env var:        NEXT_PUBLIC_API_URL = https://sea-birds-api.<you>.workers.dev
#    (or `npx wrangler pages deploy web/out --project-name=sea-birds`)

# 3. Custom domain — Pages → Custom domains → add yours (free SSL included).
#    Point the Worker behind the same domain via Pages Functions or a
#    workers.dev subdomain; simplest: keep api on workers.dev and set it as
#    NEXT_PUBLIC_API_URL.
```

Rebuilding Pages after catalogue edits re-renders product pages (500 builds/month free).

## Cost — $0/month

| Resource | Free tier allowance | This site's usage |
|---|---|---|
| Pages | unlimited bandwidth + 500 builds/mo | static site, a few builds/mo |
| Workers | 100k req/day | API reads, mostly edge-cached |
| D1 | 5 GB, 5M row reads/day | catalogue rows, tiny |
| R2 | 10 GB, **zero egress fees** | product photos — the expensive part, free |
| KV | 100k reads/day | cache + sessions |

## Caching strategy (why it stays free)

1. **Edge cache** — public `GET /api/*` sends `Cache-Control: public, max-age=60, s-maxage=300`;
   Cloudflare caches at the edge, so D1 is rarely hit.
2. **Static pre-render** — product/category pages are HTML at build time on Pages.
3. **Image variants** — admin uploads generate thumb/card/full sizes in the browser
   before upload to R2 (no paid image-resizing product); R2 serves with long cache headers.
4. **Client** — filter state + wishlist/enquiry basket in localStorage; no redundant fetches.

## TODOs / known simplifications

- Admin product image upload currently takes image URLs; direct browser→R2 upload
  (presigned via Worker) is the next step — R2 binding and bucket already wired.
- Enquiry / wishlist / catalogue PDFs are generated client-side with pdf-lib
  (zero deps on the server, zero Worker cost). Catalogue generation embeds product
  images by fetching their URLs at generate time; very large catalogues (100+
  products) can take a minute in the browser — progress is shown during generation.
- Admin login has no 2FA yet; consider WebAuthn/TOTP as a follow-up.
- Full-text search uses `LIKE`; move to D1 FTS5 if the catalogue grows past ~10k SKUs.

## Git

This repo is initialized with git and an initial commit. The GitHub repo
`anirudhlohiya/seaBirds` exists and is empty, ready for the first push:

```bash
git remote add origin https://github.com/anirudhlohiya/seaBirds.git
git branch -M main
git push -u origin main
```
