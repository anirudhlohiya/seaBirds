import { Hono } from "hono";
import type { Env } from "../env";
import { queryAll, queryOne, run } from "../lib/db";
import { createSession, hashPassword, invalidateSession, verifyPassword } from "../lib/auth";
import { asEnum, asInt, asNonEmptyString, fail, ok, reqJson } from "../lib/http";
import { requireAdmin } from "../middleware/requireAdmin";

export const adminRouter = new Hono<{ Bindings: Env }>();

const nowSqlite = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const PRODUCT_SORTS = ["newest", "price_asc", "price_desc", "bestselling"] as const;
const CATALOGUE_SCOPES = ["master", "category", "new-arrivals"] as const;
const MAX_PDF_BYTES = 40 * 1024 * 1024; // 40 MB

// ================================================================ auth

adminRouter.post("/login", async (c) => {
  const { data, error } = await reqJson<{ email?: unknown; password?: unknown }>(c);
  if (error) return error;
  const email = asNonEmptyString(data?.email)?.toLowerCase();
  const password = typeof data?.password === "string" ? data.password : "";
  if (!email || !password) {
    return fail(c, "invalid_body", "email and password are required.", 400);
  }
  const user = await queryOne<{ id: number; password_hash: string }>(
    c.env.DB,
    "SELECT id, password_hash FROM admin_users WHERE email = ?",
    email
  );
  // Always run verify (against a dummy hash when the user is missing) so
  // timing doesn't reveal whether the email exists.
  const okCreds = await verifyPassword(
    password,
    user?.password_hash ?? "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  );
  if (!user || !okCreds) {
    return fail(c, "invalid_credentials", "Invalid email or password.", 401);
  }
  const ttl = Number(c.env.SESSION_TTL_HOURS);
  const session = await createSession(c.env.DB, user.id, Number.isFinite(ttl) && ttl > 0 ? ttl : 72);
  return ok(c, session);
});

// Everything below requires a valid admin session.
adminRouter.use("*", requireAdmin);

adminRouter.post("/logout", async (c) => {
  await invalidateSession(c.env.DB, c.get("sessionToken"));
  return ok(c, { logged_out: true });
});

// ================================================================ dashboard

adminRouter.get("/dashboard", async (c) => {
  const db = c.env.DB;
  const count = async (sql: string): Promise<number> =>
    (await queryOne<{ n: number }>(db, sql))?.n ?? 0;
  const low_stock = await queryAll(
    db,
    `SELECT id, name, sku, stock_qty, low_stock_threshold
       FROM products
      WHERE stock_qty <= low_stock_threshold
      ORDER BY stock_qty ASC
      LIMIT 20`
  );
  return ok(c, {
    products_total: await count("SELECT COUNT(*) AS n FROM products"),
    categories_total: await count("SELECT COUNT(*) AS n FROM categories"),
    new_arrivals: await count("SELECT COUNT(*) AS n FROM products WHERE is_new = 1"),
    bestsellers: await count("SELECT COUNT(*) AS n FROM products WHERE is_bestseller = 1"),
    low_stock,
  });
});

// ================================================================ products

const PRODUCT_ADMIN_SELECT = `
  p.id, p.slug, p.name, p.sku, p.category_id,
  p.fabric_composition, p.weave_detail, p.dimensions, p.care,
  p.certifications, p.price, p.mrp, p.unit, p.stock_qty,
  p.low_stock_threshold, p.is_new, p.is_bestseller,
  p.whatsapp_enabled, p.is_visible, p.tagline, p.origin,
  p.description, p.artisan_name, p.artisan_place, p.artisan_quote,
  p.made_to_order, p.created_at, p.updated_at,
  c.name AS category_name, c.slug AS category_slug
`;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toFlag(v: unknown, def = 0): number {
  if (v === undefined || v === null) return def;
  if (v === true || v === 1 || v === "1") return 1;
  if (v === false || v === 0 || v === "0") return 0;
  return def;
}

interface ProductValidation {
  /** Validated column values (only the supplied fields for updates). */
  fields: Record<string, number | string | null>;
  /** Set when validation failed; the caller turns it into a 400. */
  errorMessage: string | null;
}

/**
 * Validate product create/update input. For updates only the supplied
 * fields are returned in `fields`.
 */
async function validateProductFields(
  db: Env["DB"],
  data: Record<string, unknown>,
  opts: { forCreate: boolean; exceptId?: number }
): Promise<ProductValidation> {
  const fields: Record<string, number | string | null> = {};
  const bad = (errorMessage: string): ProductValidation => ({ fields, errorMessage });

  const get = (k: string): unknown => data[k];
  const present = (k: string): boolean => get(k) !== undefined;

  // name
  if (opts.forCreate || present("name")) {
    const name = asNonEmptyString(get("name"));
    if (!name) return bad("name is required and must be a non-empty string.");
    fields.name = name;
  }
  // slug
  if (opts.forCreate || present("slug")) {
    const slug = asNonEmptyString(get("slug"));
    if (!slug) return bad("slug is required and must be a non-empty string.");
    if (!SLUG_RE.test(slug)) {
      return bad("slug must be lowercase alphanumeric with single dashes (e.g. banarasi-silk-saree).");
    }
    const taken = await queryOne<{ id: number }>(db, "SELECT id FROM products WHERE slug = ?", slug);
    if (taken && taken.id !== opts.exceptId) return bad(`slug '${slug}' is already in use.`);
    fields.slug = slug;
  }
  // sku (optional, unique when set)
  if (present("sku")) {
    const raw = get("sku");
    if (raw === null || raw === "") {
      fields.sku = null;
    } else {
      const sku = asNonEmptyString(raw);
      if (!sku) return bad("sku must be a non-empty string or null.");
      const taken = await queryOne<{ id: number }>(db, "SELECT id FROM products WHERE sku = ?", sku);
      if (taken && taken.id !== opts.exceptId) return bad(`sku '${sku}' is already in use.`);
      fields.sku = sku;
    }
  }
  // category_id
  if (present("category_id")) {
    const raw = get("category_id");
    if (raw === null || raw === "") {
      fields.category_id = null;
    } else {
      const category_id = asInt(raw);
      if (category_id === null || category_id < 1) {
        return bad("category_id must be a positive integer or null.");
      }
      const cat = await queryOne(db, "SELECT id FROM categories WHERE id = ?", category_id);
      if (!cat) return bad(`category_id ${category_id} does not exist.`);
      fields.category_id = category_id;
    }
  }
  // free-text fields (nullable in the schema)
  for (const k of ["fabric_composition", "weave_detail", "dimensions", "care"] as const) {
    if (present(k)) {
      const raw = get(k);
      if (raw !== null && typeof raw !== "string") return bad(`${k} must be a string or null.`);
      fields[k] = raw === null ? null : String(raw ?? "").trim() || null;
    }
  }
  // editorial free-text fields (NOT NULL in the schema — null coerces to '')
  for (const k of ["tagline", "origin", "description", "artisan_name", "artisan_place", "artisan_quote"] as const) {
    if (present(k)) {
      const raw = get(k);
      if (raw !== null && typeof raw !== "string") return bad(`${k} must be a string or null.`);
      fields[k] = raw === null ? "" : String(raw).trim();
    }
  }
  // certifications: array/object -> JSON text
  if (present("certifications")) {
    const raw = get("certifications");
    if (raw === null || raw === "") {
      fields.certifications = null;
    } else if (typeof raw === "string") {
      fields.certifications = raw;
    } else if (typeof raw === "object") {
      fields.certifications = JSON.stringify(raw);
    } else {
      return bad("certifications must be an array/object, JSON string, or null.");
    }
  }
  // price / mrp (rupees, integers)
  if (opts.forCreate || present("price")) {
    const price = asInt(get("price"));
    if (price === null || price < 0) return bad("price is required and must be a non-negative integer (rupees).");
    fields.price = price;
  }
  if (present("mrp")) {
    const raw = get("mrp");
    if (raw === null || raw === "") {
      fields.mrp = null;
    } else {
      const mrp = asInt(raw);
      if (mrp === null || mrp < 0) return bad("mrp must be a non-negative integer (rupees) or null.");
      fields.mrp = mrp;
    }
  }
  // unit
  if (present("unit")) {
    const unit = asNonEmptyString(get("unit"));
    if (unit !== "pieces" && unit !== "meters") {
      return bad("unit must be 'pieces' or 'meters'.");
    }
    fields.unit = unit;
  }
  // stock numbers
  for (const k of ["stock_qty", "low_stock_threshold"] as const) {
    if (present(k)) {
      const n = asInt(get(k));
      if (n === null || n < 0) return bad(`${k} must be a non-negative integer.`);
      fields[k] = n;
    }
  }
  // flags
  for (const k of ["is_new", "is_bestseller", "whatsapp_enabled", "is_visible", "made_to_order"] as const) {
    if (present(k)) fields[k] = toFlag(get(k), k === "whatsapp_enabled" || k === "is_visible" ? 1 : 0);
  }

  return { fields, errorMessage: null };
}

adminRouter.get("/products", async (c) => {
  const q = c.req.query();
  const where: string[] = [];
  const params: unknown[] = [];
  const search = asNonEmptyString(q.search);
  if (search) {
    where.push("(p.name LIKE ? OR p.sku LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like);
  }
  const sortParam = asEnum(q.sort, PRODUCT_SORTS);
  if (sortParam.invalid) {
    return fail(c, "invalid_query", `sort must be one of: ${PRODUCT_SORTS.join(", ")}.`, 400);
  }
  const sort = sortParam.value ?? "newest";
  const orderBy =
    sort === "price_asc"
      ? "p.price ASC, p.id ASC"
      : sort === "price_desc"
        ? "p.price DESC, p.id ASC"
        : sort === "bestselling"
          ? "p.is_bestseller DESC, p.id DESC"
          : "p.id DESC";

  let page = asInt(q.page) ?? 1;
  let limit = asInt(q.limit) ?? 24;
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const from = `FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`;
  const totalRow = await queryOne<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n ${from}`, ...params);
  const items = await queryAll(
    c.env.DB,
    `SELECT ${PRODUCT_ADMIN_SELECT} ${from} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset
  );
  return ok(c, { items, total: totalRow?.n ?? 0, page, limit });
});

adminRouter.post("/products", async (c) => {
  const { data, error } = await reqJson<Record<string, unknown>>(c);
  if (error) return error;
  const v = await validateProductFields(c.env.DB, data ?? {}, { forCreate: true });
  if (v.errorMessage) return fail(c, "invalid_body", v.errorMessage, 400);
  const f = v.fields;
  const ts = nowSqlite();
  const res = await run(
    c.env.DB,
    `INSERT INTO products
       (slug, name, sku, category_id, fabric_composition, weave_detail, dimensions, care,
        certifications, price, mrp, unit, stock_qty, low_stock_threshold,
        is_new, is_bestseller, whatsapp_enabled, is_visible,
        tagline, origin, description, artisan_name, artisan_place, artisan_quote, made_to_order,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    f.slug, f.name, f.sku ?? null, f.category_id ?? null,
    f.fabric_composition ?? null, f.weave_detail ?? null, f.dimensions ?? null, f.care ?? null,
    f.certifications ?? null, f.price, f.mrp ?? null, f.unit ?? "pieces",
    f.stock_qty ?? 0, f.low_stock_threshold ?? 5,
    f.is_new ?? 0, f.is_bestseller ?? 0, f.whatsapp_enabled ?? 1, f.is_visible ?? 1,
    f.tagline ?? "", f.origin ?? "", f.description ?? "", f.artisan_name ?? "",
    f.artisan_place ?? "", f.artisan_quote ?? "", f.made_to_order ?? 0,
    ts, ts
  );
  const created = await queryOne(
    c.env.DB,
    `SELECT ${PRODUCT_ADMIN_SELECT} FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    res.lastRowId
  );
  return ok(c, created, 201);
});

adminRouter.get("/products/:id", async (c) => {
  const id = asInt(c.req.param("id"));
  if (id === null) return fail(c, "invalid_param", "id must be an integer.", 400);
  const product = await queryOne<Record<string, unknown>>(
    c.env.DB,
    `SELECT ${PRODUCT_ADMIN_SELECT} FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    id
  );
  if (!product) return fail(c, "not_found", "Product not found.", 404);
  const images = await queryAll(
    c.env.DB,
    "SELECT id, url, thumb_url, alt, position, is_cover FROM product_images WHERE product_id = ? ORDER BY is_cover DESC, position ASC, id ASC",
    id
  );
  return ok(c, { ...product, images });
});

adminRouter.put("/products/:id", async (c) => {
  const id = asInt(c.req.param("id"));
  if (id === null) return fail(c, "invalid_param", "id must be an integer.", 400);
  const existing = await queryOne(c.env.DB, "SELECT id FROM products WHERE id = ?", id);
  if (!existing) return fail(c, "not_found", "Product not found.", 404);
  const { data, error } = await reqJson<Record<string, unknown>>(c);
  if (error) return error;
  const v = await validateProductFields(c.env.DB, data ?? {}, { forCreate: false, exceptId: id });
  if (v.errorMessage) return fail(c, "invalid_body", v.errorMessage, 400);
  const entries = Object.entries(v.fields);
  if (entries.length === 0) return fail(c, "invalid_body", "No updatable fields provided.", 400);
  const setSql = entries.map(([k]) => `${k} = ?`).join(", ");
  await run(
    c.env.DB,
    `UPDATE products SET ${setSql}, updated_at = ? WHERE id = ?`,
    ...entries.map(([, val]) => val),
    nowSqlite(),
    id
  );
  const updated = await queryOne(
    c.env.DB,
    `SELECT ${PRODUCT_ADMIN_SELECT} FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    id
  );
  return ok(c, updated);
});

adminRouter.delete("/products/:id", async (c) => {
  const id = asInt(c.req.param("id"));
  if (id === null) return fail(c, "invalid_param", "id must be an integer.", 400);
  const existing = await queryOne(c.env.DB, "SELECT id FROM products WHERE id = ?", id);
  if (!existing) return fail(c, "not_found", "Product not found.", 404);
  // FK is ON DELETE CASCADE; explicit delete keeps intent obvious.
  await run(c.env.DB, "DELETE FROM product_images WHERE product_id = ?", id);
  await run(c.env.DB, "DELETE FROM products WHERE id = ?", id);
  return ok(c, { deleted: true });
});

// ------------------------------------------------- product images

adminRouter.post("/products/:id/images", async (c) => {
  const id = asInt(c.req.param("id"));
  if (id === null) return fail(c, "invalid_param", "id must be an integer.", 400);
  const product = await queryOne(c.env.DB, "SELECT id FROM products WHERE id = ?", id);
  if (!product) return fail(c, "not_found", "Product not found.", 404);
  const { data, error } = await reqJson<Record<string, unknown>>(c);
  if (error) return error;
  const url = asNonEmptyString(data?.url);
  if (!url) return fail(c, "invalid_body", "url is required.", 400);
  const thumb_url = typeof data?.thumb_url === "string" && data.thumb_url.trim() !== "" ? data.thumb_url.trim() : null;
  const alt = typeof data?.alt === "string" ? data.alt.trim() || null : null;
  const position = asInt(data?.position) ?? 0;
  const is_cover = toFlag(data?.is_cover, 0);
  if (is_cover === 1) {
    await run(c.env.DB, "UPDATE product_images SET is_cover = 0 WHERE product_id = ?", id);
  }
  const res = await run(
    c.env.DB,
    "INSERT INTO product_images (product_id, url, thumb_url, alt, position, is_cover) VALUES (?, ?, ?, ?, ?, ?)",
    id, url, thumb_url, alt, position, is_cover
  );
  const created = await queryOne(c.env.DB, "SELECT id, url, thumb_url, alt, position, is_cover FROM product_images WHERE id = ?", res.lastRowId);
  return ok(c, created, 201);
});

adminRouter.delete("/products/:id/images/:imageId", async (c) => {
  const id = asInt(c.req.param("id"));
  const imageId = asInt(c.req.param("imageId"));
  if (id === null || imageId === null) {
    return fail(c, "invalid_param", "id and imageId must be integers.", 400);
  }
  const image = await queryOne(
    c.env.DB,
    "SELECT id FROM product_images WHERE id = ? AND product_id = ?",
    imageId, id
  );
  if (!image) return fail(c, "not_found", "Image not found for this product.", 404);
  await run(c.env.DB, "DELETE FROM product_images WHERE id = ?", imageId);
  return ok(c, { deleted: true });
});

// ================================================================ categories

adminRouter.get("/categories", async (c) => {
  const rows = await queryAll(
    c.env.DB,
    `SELECT cat.id, cat.name, cat.slug, cat.image_url, cat.position, cat.visible_in_menu,
            COUNT(p.id) AS product_count
       FROM categories cat
       LEFT JOIN products p ON p.category_id = cat.id
      GROUP BY cat.id
      ORDER BY cat.position ASC, cat.id ASC`
  );
  return ok(c, rows);
});

adminRouter.post("/categories", async (c) => {
  const { data, error } = await reqJson<Record<string, unknown>>(c);
  if (error) return error;
  const name = asNonEmptyString(data?.name);
  const slug = asNonEmptyString(data?.slug);
  if (!name) return fail(c, "invalid_body", "name is required.", 400);
  if (!slug) return fail(c, "invalid_body", "slug is required.", 400);
  if (!SLUG_RE.test(slug)) {
    return fail(c, "invalid_body", "slug must be lowercase alphanumeric with single dashes.", 400);
  }
  const taken = await queryOne(c.env.DB, "SELECT id FROM categories WHERE slug = ?", slug);
  if (taken) return fail(c, "conflict", `slug '${slug}' is already in use.`, 409);
  const image_url = typeof data?.image_url === "string" && data.image_url.trim() !== "" ? data.image_url.trim() : null;
  const positionRow = await queryOne<{ m: number | null }>(c.env.DB, "SELECT MAX(position) AS m FROM categories");
  const position = asInt(data?.position) ?? (positionRow?.m ?? -1) + 1;
  const visible_in_menu = toFlag(data?.visible_in_menu, 1);
  const res = await run(
    c.env.DB,
    "INSERT INTO categories (name, slug, image_url, position, visible_in_menu) VALUES (?, ?, ?, ?, ?)",
    name, slug, image_url, position, visible_in_menu
  );
  const created = await queryOne(c.env.DB, "SELECT id, name, slug, image_url, position, visible_in_menu FROM categories WHERE id = ?", res.lastRowId);
  return ok(c, created, 201);
});

// NOTE: register /reorder before /:id so the static segment wins.
adminRouter.put("/categories/reorder", async (c) => {
  const { data, error } = await reqJson<{ ordered_ids?: unknown }>(c);
  if (error) return error;
  if (!Array.isArray(data?.ordered_ids) || data.ordered_ids.length === 0) {
    return fail(c, "invalid_body", "ordered_ids must be a non-empty array of category ids.", 400);
  }
  const ids: number[] = [];
  for (const raw of data.ordered_ids) {
    const n = asInt(raw);
    if (n === null || n < 1) {
      return fail(c, "invalid_body", "ordered_ids must contain only positive integers.", 400);
    }
    ids.push(n);
  }
  const existing = await queryAll<{ id: number }>(
    c.env.DB,
    `SELECT id FROM categories WHERE id IN (${ids.map(() => "?").join(",")})`,
    ...ids
  );
  if (existing.length !== ids.length) {
    return fail(c, "invalid_body", "ordered_ids contains an unknown category id.", 400);
  }
  for (const [index, catId] of ids.entries()) {
    await run(c.env.DB, "UPDATE categories SET position = ? WHERE id = ?", index, catId);
  }
  return ok(c, { updated: ids.length });
});

adminRouter.put("/categories/:id", async (c) => {
  const id = asInt(c.req.param("id"));
  if (id === null) return fail(c, "invalid_param", "id must be an integer.", 400);
  const existing = await queryOne(c.env.DB, "SELECT id FROM categories WHERE id = ?", id);
  if (!existing) return fail(c, "not_found", "Category not found.", 404);
  const { data, error } = await reqJson<Record<string, unknown>>(c);
  if (error) return error;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data?.name !== undefined) {
    const name = asNonEmptyString(data.name);
    if (!name) return fail(c, "invalid_body", "name must be a non-empty string.", 400);
    sets.push("name = ?");
    params.push(name);
  }
  if (data?.slug !== undefined) {
    const slug = asNonEmptyString(data.slug);
    if (!slug || !SLUG_RE.test(slug)) {
      return fail(c, "invalid_body", "slug must be lowercase alphanumeric with single dashes.", 400);
    }
    const taken = await queryOne<{ id: number }>(c.env.DB, "SELECT id FROM categories WHERE slug = ?", slug);
    if (taken && taken.id !== id) return fail(c, "conflict", `slug '${slug}' is already in use.`, 409);
    sets.push("slug = ?");
    params.push(slug);
  }
  if (data?.image_url !== undefined) {
    const v = data.image_url;
    sets.push("image_url = ?");
    params.push(typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  }
  if (data?.position !== undefined) {
    const position = asInt(data.position);
    if (position === null) return fail(c, "invalid_body", "position must be an integer.", 400);
    sets.push("position = ?");
    params.push(position);
  }
  if (data?.visible_in_menu !== undefined) {
    sets.push("visible_in_menu = ?");
    params.push(toFlag(data.visible_in_menu, 1));
  }
  if (sets.length === 0) return fail(c, "invalid_body", "No updatable fields provided.", 400);
  await run(c.env.DB, `UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, ...params, id);
  const updated = await queryOne(c.env.DB, "SELECT id, name, slug, image_url, position, visible_in_menu FROM categories WHERE id = ?", id);
  return ok(c, updated);
});

adminRouter.delete("/categories/:id", async (c) => {
  const id = asInt(c.req.param("id"));
  if (id === null) return fail(c, "invalid_param", "id must be an integer.", 400);
  const existing = await queryOne(c.env.DB, "SELECT id FROM categories WHERE id = ?", id);
  if (!existing) return fail(c, "not_found", "Category not found.", 404);
  const linked = await queryOne<{ n: number }>(
    c.env.DB,
    "SELECT COUNT(*) AS n FROM products WHERE category_id = ?",
    id
  );
  if ((linked?.n ?? 0) > 0) {
    return fail(c, "category_in_use", "Category has linked products; move or delete them first.", 409);
  }
  await run(c.env.DB, "DELETE FROM categories WHERE id = ?", id);
  return ok(c, { deleted: true });
});

// ================================================================ settings

adminRouter.put("/settings", async (c) => {
  const { data, error } = await reqJson<Record<string, unknown>>(c);
  if (error) return error;
  const strOrNull = (v: unknown): string | null => {
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  };
  let ateliers: string | null = null;
  const rawAteliers = data?.ateliers;
  if (rawAteliers !== undefined && rawAteliers !== null && rawAteliers !== "") {
    if (typeof rawAteliers === "string") {
      ateliers = rawAteliers;
    } else if (typeof rawAteliers === "object") {
      ateliers = JSON.stringify(rawAteliers);
    } else {
      return fail(c, "invalid_body", "ateliers must be an array/object or JSON string.", 400);
    }
  }
  const vals = {
    business_name: strOrNull(data?.business_name),
    tagline: strOrNull(data?.tagline),
    logo_url: strOrNull(data?.logo_url),
    whatsapp_number: strOrNull(data?.whatsapp_number),
    advisor_name: strOrNull(data?.advisor_name),
    greeting: strOrNull(data?.greeting),
    ateliers,
  };
  await run(
    c.env.DB,
    `INSERT INTO store_settings (id, business_name, tagline, logo_url, whatsapp_number, advisor_name, greeting, ateliers)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       business_name = excluded.business_name,
       tagline = excluded.tagline,
       logo_url = excluded.logo_url,
       whatsapp_number = excluded.whatsapp_number,
       advisor_name = excluded.advisor_name,
       greeting = excluded.greeting,
       ateliers = excluded.ateliers`,
    vals.business_name, vals.tagline, vals.logo_url, vals.whatsapp_number,
    vals.advisor_name, vals.greeting, vals.ateliers
  );
  const updated = await queryOne(c.env.DB, "SELECT * FROM store_settings WHERE id = 1");
  return ok(c, updated);
});

// ================================================================ password

adminRouter.put("/password", async (c) => {
  const { data, error } = await reqJson<{ current_password?: unknown; new_password?: unknown }>(c);
  if (error) return error;
  const current = typeof data?.current_password === "string" ? data.current_password : "";
  const next = typeof data?.new_password === "string" ? data.new_password : "";
  if (!current || !next) {
    return fail(c, "invalid_body", "current_password and new_password are required.", 400);
  }
  if (next.length < 12) {
    return fail(c, "invalid_body", "new_password must be at least 12 characters.", 400);
  }
  const admin = c.get("adminUser");
  const matches = await verifyPassword(current, admin.password_hash);
  if (!matches) return fail(c, "invalid_credentials", "Current password is incorrect.", 401);
  const newHash = await hashPassword(next);
  await run(c.env.DB, "UPDATE admin_users SET password_hash = ? WHERE id = ?", newHash, admin.id);
  return ok(c, { updated: true });
});

// ================================================================ catalogue PDFs
// PDFs are generated client-side in the admin browser and uploaded here as
// raw bytes; R2 stores the file, catalogue_editions stores the metadata.

function r2KeyFromFileUrl(fileUrl: string | null, publicBase: string): string | null {
  if (!fileUrl) return null;
  const base = (publicBase ?? "").replace(/\/+$/, "");
  if (base && fileUrl.startsWith(base + "/")) {
    return fileUrl.slice(base.length + 1);
  }
  return null;
}

adminRouter.post("/catalogue/upload", async (c) => {
  const q = c.req.query();
  const title = asNonEmptyString(q.title);
  const scopeParam = asEnum(q.scope, CATALOGUE_SCOPES);
  const volume = asNonEmptyString(q.volume);

  if (!title) return fail(c, "invalid_query", "title query param is required.", 400);
  if (scopeParam.invalid || !scopeParam.value) {
    return fail(c, "invalid_query", `scope query param is required and must be one of: ${CATALOGUE_SCOPES.join(", ")}.`, 400);
  }
  const scope = scopeParam.value;

  const contentType = (c.req.header("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (contentType !== "application/pdf") {
    return fail(c, "unsupported_media_type", "Content-Type must be application/pdf.", 415);
  }
  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength === 0) {
    return fail(c, "invalid_body", "Upload body is empty.", 400);
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    return fail(c, "payload_too_large", "PDF must be 40MB or smaller.", 413);
  }

  const slugifiedScope = scope
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const key = `catalogues/${slugifiedScope}-${Date.now()}.pdf`;
  await c.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: "application/pdf" } });

  const base = (c.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  const file_url = `${base}/${key}`;
  const file_size_mb = Math.round((bytes.byteLength / (1024 * 1024)) * 10) / 10;
  const updated_at = nowSqlite();

  const existing = await queryOne<{ id: number }>(
    c.env.DB,
    "SELECT id FROM catalogue_editions WHERE scope = ?",
    scope
  );
  let id: number;
  if (existing) {
    await run(
      c.env.DB,
      "UPDATE catalogue_editions SET title = ?, volume = ?, file_url = ?, file_size_mb = ?, updated_at = ? WHERE id = ?",
      title, volume, file_url, file_size_mb, updated_at, existing.id
    );
    id = existing.id;
  } else {
    const res = await run(
      c.env.DB,
      "INSERT INTO catalogue_editions (title, volume, scope, file_url, file_size_mb, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      title, volume, scope, file_url, file_size_mb, updated_at
    );
    id = res.lastRowId;
  }
  return ok(c, { id, file_url, file_size_mb }, 201);
});

adminRouter.delete("/catalogue-editions/:id", async (c) => {
  const id = asInt(c.req.param("id"));
  if (id === null) return fail(c, "invalid_param", "id must be an integer.", 400);
  const row = await queryOne<{ file_url: string | null }>(
    c.env.DB,
    "SELECT file_url FROM catalogue_editions WHERE id = ?",
    id
  );
  if (!row) return fail(c, "not_found", "Catalogue edition not found.", 404);
  const key = r2KeyFromFileUrl(row.file_url, c.env.R2_PUBLIC_BASE_URL);
  if (key) {
    try {
      await c.env.IMAGES.delete(key);
    } catch {
      // Best effort: still remove the DB row so the edition disappears.
    }
  }
  await run(c.env.DB, "DELETE FROM catalogue_editions WHERE id = ?", id);
  return ok(c, { deleted: true });
});
