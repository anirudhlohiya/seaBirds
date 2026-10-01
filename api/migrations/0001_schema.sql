-- Sea Birds Luxury Textiles — 0001 initial schema (D1 / SQLite)
--
-- Deliberate omissions (user-confirmed 2026-10-01):
--   * No `enquiries` / `enquiry_items` tables — enquiries are WhatsApp-only
--     (the storefront builds a wa.me link; nothing is stored server-side).
--   * No `wishlist_items` table — the wishlist is guest-only and lives in
--     browser localStorage; no login, no sync, no server state.
--
-- Prices are INTEGER rupees (no paise handling needed for this catalogue).

CREATE TABLE categories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  image_url      TEXT,
  position       INTEGER NOT NULL DEFAULT 0,
  visible_in_menu INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  sku                 TEXT UNIQUE,
  category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  fabric_composition  TEXT,
  weave_detail        TEXT,
  dimensions          TEXT,
  care                TEXT,
  certifications      TEXT, -- JSON array stored as TEXT
  price               INTEGER NOT NULL DEFAULT 0, -- rupees
  mrp                 INTEGER,                    -- rupees, optional compare-at price
  unit                TEXT NOT NULL DEFAULT 'pieces' CHECK (unit IN ('pieces', 'meters')),
  stock_qty           INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_new              INTEGER NOT NULL DEFAULT 0,
  is_bestseller       INTEGER NOT NULL DEFAULT 0,
  whatsapp_enabled    INTEGER NOT NULL DEFAULT 1,
  is_visible          INTEGER NOT NULL DEFAULT 1,
  tagline             TEXT NOT NULL DEFAULT '',
  origin              TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  artisan_name        TEXT NOT NULL DEFAULT '',
  artisan_place       TEXT NOT NULL DEFAULT '',
  artisan_quote       TEXT NOT NULL DEFAULT '',
  made_to_order       INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  thumb_url  TEXT,
  alt        TEXT,
  position   INTEGER NOT NULL DEFAULT 0,
  is_cover   INTEGER NOT NULL DEFAULT 0
);

-- Single-row table (id always 1).
CREATE TABLE store_settings (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  business_name   TEXT,
  tagline         TEXT,
  logo_url        TEXT,
  whatsapp_number TEXT,
  advisor_name    TEXT,
  greeting        TEXT,
  ateliers        TEXT -- JSON array of atelier/showroom objects
);

-- Metadata for catalogue PDFs. The PDFs themselves are generated client-side
-- in the admin browser and uploaded to R2 via POST /api/admin/catalogue/upload
-- (upserted by scope); only metadata lives here.
CREATE TABLE catalogue_editions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  volume       TEXT,
  scope        TEXT NOT NULL UNIQUE, -- 'master' | 'category' | 'new-arrivals'
  file_url     TEXT,
  file_size_mb REAL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- pbkdf2$100000$<b64url salt>$<b64url hash>
  role          TEXT NOT NULL DEFAULT 'admin'
);

CREATE TABLE sessions (
  token         TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at    TEXT NOT NULL, -- UTC "YYYY-MM-DD HH:MM:SS"
  created_at    TEXT NOT NULL
);

CREATE INDEX idx_products_slug          ON products(slug);
CREATE INDEX idx_products_category      ON products(category_id);
CREATE INDEX idx_products_is_visible    ON products(is_visible);
CREATE INDEX idx_categories_position    ON categories(position);
CREATE INDEX idx_product_images_product  ON product_images(product_id);
CREATE INDEX idx_sessions_expires_at     ON sessions(expires_at);
