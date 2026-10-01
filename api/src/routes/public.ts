import { Hono } from "hono";
import type { Env } from "../env";
import { queryAll, queryOne } from "../lib/db";
import { asEnum, asInt, asNonEmptyString, fail, ok } from "../lib/http";

export const publicRouter = new Hono<{ Bindings: Env }>();

/** Cheap cache headers for public GET responses. */
function cached(c: { header: (n: string, v: string) => void }) {
  c.header("Cache-Control", "public, max-age=60, s-maxage=300");
}

/** SELECT list shared by product listing + detail (joined with categories). */
const PRODUCT_SELECT = `
  p.id, p.slug, p.name, p.sku, p.category_id,
  p.fabric_composition, p.weave_detail, p.dimensions, p.care,
  p.certifications, p.price, p.mrp, p.unit, p.stock_qty,
  p.low_stock_threshold, p.is_new, p.is_bestseller,
  p.whatsapp_enabled, p.is_visible, p.tagline, p.origin,
  p.description, p.artisan_name, p.artisan_place, p.artisan_quote,
  p.made_to_order, p.created_at, p.updated_at,
  c.name AS category_name, c.slug AS category_slug
`;

async function attachImages(db: Env["DB"], productIds: number[]) {
  if (productIds.length === 0) return new Map<number, unknown[]>();
  const placeholders = productIds.map(() => "?").join(",");
  const images = await queryAll<Record<string, unknown>>(
    db,
    `SELECT product_id, url, thumb_url, alt, position, is_cover
       FROM product_images
      WHERE product_id IN (${placeholders})
      ORDER BY is_cover DESC, position ASC, id ASC`,
    ...productIds
  );
  const byProduct = new Map<number, unknown[]>();
  for (const img of images) {
    const pid = img.product_id as number;
    const list = byProduct.get(pid) ?? [];
    list.push({
      url: img.url,
      thumb_url: img.thumb_url,
      alt: img.alt,
      position: img.position,
      is_cover: img.is_cover,
    });
    byProduct.set(pid, list);
  }
  return byProduct;
}

// ---------------------------------------------------------------- health

publicRouter.get("/health", (c) => {
  cached(c);
  return ok(c, { time: new Date().toISOString() });
});

// ---------------------------------------------------------------- products

const SORTS = ["newest", "price_asc", "price_desc", "bestselling"] as const;

publicRouter.get("/products", async (c) => {
  const q = c.req.query();
  const where: string[] = ["p.is_visible = 1"];
  const params: unknown[] = [];

  const category = asNonEmptyString(q.category);
  if (category) {
    where.push("c.slug = ?");
    params.push(category);
  }
  const search = asNonEmptyString(q.search);
  if (search) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.fabric_composition LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (q.inStock !== undefined && q.inStock !== "") {
    if (q.inStock !== "0" && q.inStock !== "1") {
      return fail(c, "invalid_query", "inStock must be 0 or 1.", 400);
    }
    where.push(q.inStock === "1" ? "p.stock_qty > 0" : "p.stock_qty <= 0");
  }
  const fabric = asNonEmptyString(q.fabric);
  if (fabric) {
    where.push("p.fabric_composition LIKE ?");
    params.push(`%${fabric}%`);
  }
  const maxPrice = asInt(q.maxPrice);
  if (q.maxPrice !== undefined && q.maxPrice !== "" && maxPrice === null) {
    return fail(c, "invalid_query", "maxPrice must be an integer (rupees).", 400);
  }
  if (maxPrice !== null) {
    where.push("p.price <= ?");
    params.push(maxPrice);
  }
  // tag=new|bestseller and stock=in_stock|low|made_to_order|out_of_stock
  // mirror the storefront's filter vocabulary exactly.
  const tagParam = asEnum(q.tag, ["new", "bestseller"] as const);
  if (tagParam.invalid) {
    return fail(c, "invalid_query", "tag must be one of: new, bestseller.", 400);
  }
  if (tagParam.value === "new") where.push("p.is_new = 1");
  if (tagParam.value === "bestseller") where.push("p.is_bestseller = 1");
  const stockParam = asEnum(q.stock, ["in_stock", "low", "made_to_order", "out_of_stock"] as const);
  if (stockParam.invalid) {
    return fail(c, "invalid_query", "stock must be one of: in_stock, low, made_to_order, out_of_stock.", 400);
  }
  if (stockParam.value === "in_stock") where.push("p.stock_qty > 0 AND p.made_to_order = 0");
  if (stockParam.value === "low")
    where.push("p.stock_qty > 0 AND p.stock_qty <= p.low_stock_threshold");
  if (stockParam.value === "made_to_order") where.push("p.made_to_order = 1");
  if (stockParam.value === "out_of_stock")
    where.push("p.stock_qty <= 0 AND p.made_to_order = 0");

  const sortParam = asEnum(q.sort, SORTS);
  if (sortParam.invalid) {
    return fail(c, "invalid_query", `sort must be one of: ${SORTS.join(", ")}.`, 400);
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

  const from = `FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where.join(" AND ")}`;
  const totalRow = await queryOne<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n ${from}`, ...params);
  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT ${PRODUCT_SELECT} ${from} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset
  );
  const images = await attachImages(
    c.env.DB,
    rows.map((r) => r.id as number)
  );
  const items = rows.map((r) => ({ ...r, images: images.get(r.id as number) ?? [] }));

  cached(c);
  return ok(c, { items, total: totalRow?.n ?? 0, page, limit });
});

publicRouter.get("/products/:slug", async (c) => {
  const slug = c.req.param("slug");
  const row = await queryOne<Record<string, unknown>>(
    c.env.DB,
    `SELECT ${PRODUCT_SELECT}
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.is_visible = 1`,
    slug
  );
  if (!row) return fail(c, "not_found", "Product not found.", 404);
  const images = await attachImages(c.env.DB, [row.id as number]);
  cached(c);
  return ok(c, { ...row, images: images.get(row.id as number) ?? [] });
});

// ---------------------------------------------------------------- categories

publicRouter.get("/categories", async (c) => {
  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT cat.id, cat.name, cat.slug, cat.image_url, cat.position,
            COUNT(p.id) AS product_count
       FROM categories cat
       LEFT JOIN products p ON p.category_id = cat.id AND p.is_visible = 1
      WHERE cat.visible_in_menu = 1
      GROUP BY cat.id
      ORDER BY cat.position ASC, cat.id ASC`
  );
  cached(c);
  return ok(c, rows);
});

// ---------------------------------------------------------------- settings

publicRouter.get("/settings", async (c) => {
  const row = await queryOne<Record<string, unknown>>(
    c.env.DB,
    "SELECT business_name, tagline, logo_url, whatsapp_number, advisor_name, greeting, ateliers FROM store_settings WHERE id = 1"
  );
  if (!row) return fail(c, "not_found", "Store settings not configured.", 404);
  let ateliers: unknown = [];
  if (row.ateliers) {
    try {
      ateliers = JSON.parse(String(row.ateliers));
    } catch {
      ateliers = [];
    }
  }
  cached(c);
  return ok(c, { ...row, ateliers });
});

// ---------------------------------------------------------------- catalogue editions
// Public listing of the auto-generated catalogue PDFs. The PDFs themselves
// are generated client-side in the admin browser and uploaded to R2 via
// POST /api/admin/catalogue/upload; this table only holds their metadata.

publicRouter.get("/catalogue", async (c) => {
  const rows = await queryAll(
    c.env.DB,
    "SELECT id, title, volume, scope, file_url, file_size_mb, updated_at FROM catalogue_editions ORDER BY updated_at DESC"
  );
  cached(c);
  return ok(c, rows);
});

// NOTE: enquiries are WhatsApp-only by user decision — nothing is stored
// server-side, so there is intentionally no POST /api/enquiries endpoint.
// The storefront builds a wa.me link with the enquiry details instead.
