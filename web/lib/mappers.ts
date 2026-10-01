import type {
  CatalogueEdition,
  Category,
  DashboardStats,
  PriceUnit,
  Product,
  ProductImage,
  StockStatus,
  StoreSettings,
} from './types';

/**
 * Maps between the Workers API's D1-backed shapes (snake_case, INTEGER flags)
 * and the web app's domain types. All API<->web translation lives here —
 * pages and components only ever see domain types.
 */

// ---------------------------------------------------------------------------
// Raw API row shapes (as returned inside the {ok:true, data} envelope)
// ---------------------------------------------------------------------------

export interface ApiProductImage {
  id: number;
  product_id: number;
  url: string;
  thumb_url: string | null;
  alt: string | null;
  position: number;
  is_cover: number;
}

export interface ApiProduct {
  id: number;
  slug: string;
  name: string;
  sku: string | null;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  fabric_composition: string | null;
  weave_detail: string | null;
  dimensions: string | null;
  care: string | null;
  certifications: string | null;
  price: number;
  mrp: number | null;
  unit: 'pieces' | 'meters';
  stock_qty: number;
  low_stock_threshold: number;
  is_new: number;
  is_bestseller: number;
  whatsapp_enabled: number;
  is_visible: number;
  tagline: string | null;
  origin: string | null;
  description: string | null;
  artisan_name: string | null;
  artisan_place: string | null;
  artisan_quote: string | null;
  made_to_order: number;
  images?: ApiProductImage[];
  created_at: string;
  updated_at: string;
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  position: number;
  visible_in_menu: number;
  product_count: number;
}

export interface ApiAtelier {
  name?: string;
  city?: string;
  location?: string;
  note?: string;
}

export interface ApiSettings {
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  whatsapp_number: string;
  advisor_name: string | null;
  greeting: string | null;
  ateliers: ApiAtelier[] | string | null;
}

export interface ApiCatalogueEdition {
  id: number;
  title: string;
  volume: string | null;
  scope: string;
  file_url: string;
  file_size_mb: number;
  updated_at: string;
}

export interface ApiDashboard {
  products_total: number;
  categories_total: number;
  new_arrivals: number;
  bestsellers: number;
}

// ---------------------------------------------------------------------------
// API -> web
// ---------------------------------------------------------------------------

function toStockStatus(p: ApiProduct): StockStatus {
  if (p.made_to_order === 1) return 'made_to_order';
  if ((p.stock_qty ?? 0) <= 0) return 'out_of_stock';
  if ((p.stock_qty ?? 0) <= (p.low_stock_threshold ?? 5)) return 'low';
  return 'in_stock';
}

function parseCertifications(raw: string | null): string {
  if (!raw) return '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string').join(', ');
    }
  } catch {
    // not JSON — treat as a plain string
  }
  return raw;
}

export function toProductImage(img: ApiProductImage): ProductImage {
  return {
    id: String(img.id),
    url: img.url,
    alt_text: img.alt ?? 'Product image',
    position: img.position ?? 0,
  };
}

export function toProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    slug: p.slug,
    sku: p.sku ?? '',
    name: p.name,
    tagline: p.tagline ?? '',
    category_id: p.category_id != null ? String(p.category_id) : '',
    category_slug: p.category_slug ?? '',
    category_name: p.category_name ?? '',
    price: p.price ?? 0,
    mrp: p.mrp ?? p.price ?? 0,
    unit: (p.unit === 'meters' ? 'meter' : 'piece') as PriceUnit,
    stock_qty: p.stock_qty ?? 0,
    stock_status: toStockStatus(p),
    is_new: p.is_new === 1,
    is_bestseller: p.is_bestseller === 1,
    is_visible: p.is_visible === 1,
    whatsapp_enabled: p.whatsapp_enabled === 1,
    images: (p.images ?? []).map(toProductImage),
    yarn_label: p.fabric_composition ?? '',
    fabric_composition: p.fabric_composition ?? '',
    weave: p.weave_detail ?? '',
    dimensions: p.dimensions ?? '',
    care: p.care ?? '',
    certifications: parseCertifications(p.certifications),
    origin: p.origin ?? '',
    artisan_quote: p.artisan_quote ?? '',
    artisan_name: p.artisan_name ?? '',
    artisan_place: p.artisan_place ?? '',
    description: p.description ?? '',
  };
}

export function toCategory(c: ApiCategory): Category {
  return {
    id: String(c.id),
    slug: c.slug,
    name: c.name,
    description: '',
    image_url: c.image_url ?? '',
    position: c.position ?? 0,
    is_visible: c.visible_in_menu === 1,
    product_count: c.product_count ?? 0,
  };
}

function parseAteliers(raw: ApiSettings['ateliers']): ApiAtelier[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ApiAtelier[];
    } catch {
      // fall through
    }
  }
  return [];
}

export function toSettings(s: ApiSettings): StoreSettings {
  return {
    business_name: s.business_name,
    tagline: s.tagline ?? '',
    address: '',
    phone: '',
    email: '',
    whatsapp_number: s.whatsapp_number,
    advisor_name: s.advisor_name ?? '',
    whatsapp_default_message: s.greeting ?? '',
    ateliers: parseAteliers(s.ateliers).map((a, i) => ({
      id: String(i),
      name: a.name ?? '',
      location: a.city ?? a.location ?? '',
    })),
  };
}

export function toCatalogueEdition(e: ApiCatalogueEdition): CatalogueEdition {
  return {
    id: String(e.id),
    title: e.title,
    volume: e.volume ?? '',
    description: '',
    scope: e.scope,
    file_url: e.file_url,
    file_size_mb: e.file_size_mb ?? 0,
    cover_image_url: '',
    created_at: e.updated_at,
  };
}

export function toDashboard(d: ApiDashboard): DashboardStats {
  return {
    total_products: d.products_total ?? 0,
    total_categories: d.categories_total ?? 0,
    new_arrivals: d.new_arrivals ?? 0,
    bestsellers: d.bestsellers ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Web -> API (admin writes)
// ---------------------------------------------------------------------------

function toFlag(v: boolean | undefined): number | undefined {
  return v === undefined ? undefined : v ? 1 : 0;
}

/** Converts a web-shaped product patch into the API's D1 column vocabulary. */
export function toApiProductInput(p: Partial<Product>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown): void => {
    if (v !== undefined) out[k] = v;
  };
  set('slug', p.slug);
  set('name', p.name);
  set('sku', p.sku === undefined ? undefined : p.sku || null);
  set('category_id', p.category_id === undefined ? undefined : p.category_id ? Number(p.category_id) : null);
  set('fabric_composition', p.fabric_composition === undefined && p.yarn_label === undefined
    ? undefined
    : p.fabric_composition || p.yarn_label || null);
  set('weave_detail', p.weave === undefined ? undefined : p.weave || null);
  set('dimensions', p.dimensions === undefined ? undefined : p.dimensions || null);
  set('care', p.care === undefined ? undefined : p.care || null);
  set('certifications', p.certifications === undefined ? undefined : p.certifications || null);
  set('price', p.price);
  set('mrp', p.mrp);
  if (p.unit !== undefined) set('unit', p.unit === 'meter' ? 'meters' : 'pieces');
  set('stock_qty', p.stock_qty);
  set('is_new', toFlag(p.is_new));
  set('is_bestseller', toFlag(p.is_bestseller));
  set('is_visible', toFlag(p.is_visible));
  set('whatsapp_enabled', toFlag(p.whatsapp_enabled));
  set('tagline', p.tagline);
  set('origin', p.origin);
  set('description', p.description);
  set('artisan_name', p.artisan_name);
  set('artisan_place', p.artisan_place);
  set('artisan_quote', p.artisan_quote);
  if (p.stock_status !== undefined) set('made_to_order', p.stock_status === 'made_to_order' ? 1 : 0);
  return out;
}

export function toApiCategoryInput(c: Partial<Category>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.name !== undefined) out.name = c.name;
  if (c.slug !== undefined) out.slug = c.slug;
  if (c.image_url !== undefined) out.image_url = c.image_url || null;
  if (c.is_visible !== undefined) out.visible_in_menu = c.is_visible ? 1 : 0;
  return out;
}

export function toApiSettingsInput(s: Partial<StoreSettings>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (s.business_name !== undefined) out.business_name = s.business_name;
  if (s.tagline !== undefined) out.tagline = s.tagline;
  if (s.whatsapp_number !== undefined) out.whatsapp_number = s.whatsapp_number;
  if (s.advisor_name !== undefined) out.advisor_name = s.advisor_name;
  if (s.whatsapp_default_message !== undefined) out.greeting = s.whatsapp_default_message;
  if (s.ateliers !== undefined) {
    out.ateliers = JSON.stringify(
      s.ateliers.map((a) => ({ name: a.name, city: a.location })),
    );
  }
  return out;
}
