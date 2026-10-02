/**
 * Sea Birds Luxury Textiles — API client.
 *
 * Talks to the Cloudflare Workers API (Hono + D1 + R2 + KV). When
 * NEXT_PUBLIC_USE_MOCK=true (or the API is unreachable), public storefront
 * calls fall back to the bundled mock data so the site always renders.
 *
 * All API payloads are translated through lib/mappers — pages and components
 * only ever see the domain types from lib/types.
 */
import { MOCK_CATEGORIES, MOCK_EDITIONS, MOCK_PRODUCTS, MOCK_SETTINGS } from './mock';
import {
  toApiCategoryInput,
  toApiProductInput,
  toApiSettingsInput,
  toCatalogueEdition,
  toCategory,
  toDashboard,
  toProduct,
  toSettings,
  type ApiCatalogueEdition,
  type ApiCategory,
  type ApiDashboard,
  type ApiProduct,
  type ApiSettings,
} from './mappers';
import type {
  CatalogueEdition,
  Category,
  DashboardStats,
  Product,
  ProductQuery,
  StoreSettings,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const TOKEN_KEY = 'sb_admin_token';

// ---------------------------------------------------------------------------
// Envelope handling
// ---------------------------------------------------------------------------

/** The Workers API wraps every successful response as {ok:true, data}. */
interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as ApiEnvelope<T>).data;
  }
  return json as T;
}

function apiErrorMessage(text: string, fallback: string): string {
  if (text) {
    try {
      const body = JSON.parse(text) as ApiErrorBody;
      if (body?.error?.message) return body.error.message;
    } catch {
      // not JSON — use the raw text
      if (text.length < 300) return text;
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Mock fallback (public storefront only)
// ---------------------------------------------------------------------------

function filterMockProducts(query: ProductQuery): Product[] {
  return MOCK_PRODUCTS.filter((p) => {
    if (query.category && p.category_slug !== query.category) return false;
    if (query.tag === 'new' && !p.is_new) return false;
    if (query.tag === 'bestseller' && !p.is_bestseller) return false;
    if (query.stock) {
      const status = p.stock_status;
      const map: Record<NonNullable<ProductQuery['stock']>, Product['stock_status'][]> = {
        in_stock: ['in_stock'],
        low: ['low'],
        made_to_order: ['made_to_order'],
        out_of_stock: ['out_of_stock'],
      };
      if (!map[query.stock].includes(status)) return false;
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      const haystack =
        `${p.name} ${p.sku} ${p.tagline} ${p.yarn_label} ${p.origin} ${p.artisan_name}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

async function publicGet<TApi, T>(
  path: string,
  fallback: () => T,
  map: (data: TApi) => T,
): Promise<T> {
  if (USE_MOCK) return fallback();
  try {
    let fetchUrl = `${API_BASE}${path}`;
    if (typeof window === 'undefined') {
      // Only bust cache during the Next.js static build, keep it super fast for real customers!
      const joiner = path.includes('?') ? '&' : '?';
      fetchUrl += `${joiner}_t=${Date.now()}`;
    }
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return map(unwrap<TApi>(await res.json()));
  } catch (err) {
    console.warn(`[api] ${path} unavailable, using local mock data:`, err);
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// Public storefront reads
// ---------------------------------------------------------------------------

export function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (query.search) params.set('search', query.search);
  if (query.tag) params.set('tag', query.tag);
  if (query.stock) params.set('stock', query.stock);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return publicGet<{ items: ApiProduct[] }, Product[]>(
    `/api/products${suffix}`,
    () => filterMockProducts(query),
    (d) => (d?.items ?? []).map(toProduct),
  );
}

export function getProduct(slug: string): Promise<Product | null> {
  return publicGet<ApiProduct, Product | null>(
    `/api/products/${encodeURIComponent(slug)}`,
    () => MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null,
    (d) => (d ? toProduct(d) : null),
  );
}

export function getCategories(): Promise<Category[]> {
  return publicGet<ApiCategory[], Category[]>(
    '/api/categories',
    () => MOCK_CATEGORIES,
    (list) => (list ?? []).map(toCategory),
  );
}

export function getCatalogueEditions(): Promise<CatalogueEdition[]> {
  return publicGet<ApiCatalogueEdition[], CatalogueEdition[]>(
    '/api/catalogue',
    () => MOCK_EDITIONS,
    (list) => (list ?? []).map(toCatalogueEdition),
  );
}

export function getSettings(): Promise<StoreSettings> {
  return publicGet<ApiSettings, StoreSettings>(
    '/api/settings',
    () => MOCK_SETTINGS,
    (d) => toSettings(d),
  );
}

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getAdminToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
  return getAdminToken() !== null;
}
/** Backwards-compatible alias used by AdminShell. */
export const isAdminAuthed: () => boolean = isAdminAuthenticated;

/** Logs in and stores the session token. Resolves void — the login page ignores the result. */
export async function adminLogin(email: string, password: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(`Could not reach the API at ${API_BASE}. Is the worker running?`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(apiErrorMessage(text, 'Invalid email or password.'));
  }
  const data = unwrap<{ token?: string }>(await res.json());
  if (!data?.token) throw new Error('Login failed: no session token returned.');
  localStorage.setItem(TOKEN_KEY, data.token);
}

export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // best-effort — the token is dropped below regardless
    }
  }
  if (isBrowser()) localStorage.removeItem(TOKEN_KEY);
}

/** Authenticated request helper: unwraps the {ok,data} envelope and surfaces {error.message}. */
async function adminFetch<TApi, T>(
  path: string,
  init: RequestInit,
  map: (data: TApi) => T,
): Promise<T>;
async function adminFetch<T>(path: string, init?: RequestInit): Promise<T>;
async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  map?: (data: unknown) => T,
): Promise<T> {
  const token = getAdminToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new Error(`Could not reach the API at ${API_BASE}. Is the worker running?`);
  }
  if (res.status === 401) {
    await adminLogout();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(apiErrorMessage(text, `Request failed with status ${res.status}.`));
  }
  if (res.status === 204) return undefined as T;
  const data = unwrap(await res.json());
  return map ? map(data) : (data as T);
}

// ---------------------------------------------------------------------------
// Admin: dashboard
// ---------------------------------------------------------------------------

export function getDashboard(): Promise<DashboardStats> {
  return adminFetch<ApiDashboard, DashboardStats>('/api/admin/dashboard', {}, toDashboard);
}

// ---------------------------------------------------------------------------
// Admin: products (incl. image sync — the form keeps images in local state)
// ---------------------------------------------------------------------------

export function adminListProducts(): Promise<Product[]> {
  return adminFetch<{ items: ApiProduct[] }, Product[]>('/api/admin/products', {}, (d) =>
    (d?.items ?? []).map(toProduct),
  );
}

export function adminGetProduct(id: string): Promise<Product> {
  return adminFetch<ApiProduct, Product>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    {},
    toProduct,
  );
}

export function adminAddProductImage(
  productId: string,
  input: { url: string; alt?: string; position?: number; is_cover?: number },
): Promise<unknown> {
  return adminFetch(
    `/api/admin/products/${encodeURIComponent(productId)}/images`,
    {
      method: 'POST',
      body: JSON.stringify({
        url: input.url,
        alt: input.alt ?? '',
        position: input.position ?? 0,
        is_cover: input.is_cover ?? 0,
      }),
    },
  );
}

export function adminDeleteProductImage(productId: string, imageId: string): Promise<void> {
  return adminFetch<void>(
    `/api/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
    { method: 'DELETE' },
  );
}

export interface UploadedProductImage {
  url: string;
  key: string;
  preview_url: string;
}

/**
 * Uploads a product photo to R2 via the Worker. Sends multipart/form-data
 * (no JSON content-type — the browser sets the multipart boundary itself).
 */
export async function uploadProductImage(file: File): Promise<UploadedProductImage> {
  const token = getAdminToken();
  const form = new FormData();
  form.append('file', file);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/admin/images/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new Error(`Could not reach the API at ${API_BASE}. Is the worker running?`);
  }
  if (res.status === 401) {
    await adminLogout();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(apiErrorMessage(text, `Upload failed with status ${res.status}.`));
  }
  const data = unwrap<UploadedProductImage>(await res.json());
  if (!data?.url) throw new Error('Upload failed: no URL returned.');
  return data;
}

/**
 * Replaces the product's image set with the form's list.
 * Delete-all + re-add keeps ordering deterministic (the API has no reorder).
 */
async function syncProductImages(
  productId: string,
  images: Product['images'],
): Promise<void> {
  const clean = images
    .filter((i) => i.url.trim() !== '')
    .map((i, position) => ({ url: i.url.trim(), alt_text: i.alt_text, position }));
  const current = await adminGetProduct(productId);
  await Promise.all(current.images.map((img) => adminDeleteProductImage(productId, img.id)));
  for (let position = 0; position < clean.length; position += 1) {
    const image = clean[position];
    await adminAddProductImage(productId, {
      url: image.url,
      alt: image.alt_text,
      position,
      is_cover: position === 0 ? 1 : 0,
    });
  }
}

export async function adminCreateProduct(input: Partial<Product>): Promise<Product> {
  const created = await adminFetch<ApiProduct, Product>(
    '/api/admin/products',
    { method: 'POST', body: JSON.stringify(toApiProductInput(input)) },
    toProduct,
  );
  if (input.images && input.images.length > 0) {
    await syncProductImages(created.id, input.images);
    return adminGetProduct(created.id);
  }
  return created;
}

export async function adminUpdateProduct(
  id: string,
  input: Partial<Product>,
): Promise<Product> {
  const { images, ...rest } = input;
  const updated = await adminFetch<ApiProduct, Product>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(toApiProductInput(rest)) },
    toProduct,
  );
  if (images !== undefined) {
    await syncProductImages(id, images);
    return adminGetProduct(id);
  }
  return updated;
}

export function adminPatchProduct(id: string, patch: Partial<Product>): Promise<Product> {
  return adminUpdateProduct(id, patch);
}

export function adminDeleteProduct(id: string): Promise<void> {
  return adminFetch<void>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Admin: categories
// ---------------------------------------------------------------------------

export function adminListCategories(): Promise<Category[]> {
  return adminFetch<ApiCategory[], Category[]>('/api/admin/categories', {}, (list) =>
    (list ?? []).map(toCategory),
  );
}

export function adminCreateCategory(input: Partial<Category>): Promise<Category> {
  return adminFetch<ApiCategory, Category>(
    '/api/admin/categories',
    { method: 'POST', body: JSON.stringify(toApiCategoryInput(input)) },
    toCategory,
  );
}

export function adminUpdateCategory(id: string, input: Partial<Category>): Promise<Category> {
  return adminFetch<ApiCategory, Category>(
    `/api/admin/categories/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(toApiCategoryInput(input)) },
    toCategory,
  );
}

export function adminDeleteCategory(id: string): Promise<void> {
  return adminFetch<void>(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/** Persists a new menu order; takes the category ids in display order. */
export function adminReorderCategories(orderedIds: string[]): Promise<void> {
  return adminFetch<void>('/api/admin/categories/reorder', {
    method: 'PUT',
    body: JSON.stringify({ ordered_ids: orderedIds.map(Number) }),
  });
}

// ---------------------------------------------------------------------------
// Admin: settings & password
// ---------------------------------------------------------------------------

export function adminGetSettings(): Promise<StoreSettings> {
  return adminFetch<ApiSettings, StoreSettings>('/api/admin/settings', {}, toSettings);
}

export function adminUpdateSettings(input: Partial<StoreSettings>): Promise<StoreSettings> {
  return adminFetch<ApiSettings, StoreSettings>(
    '/api/admin/settings',
    { method: 'PUT', body: JSON.stringify(toApiSettingsInput(input)) },
    toSettings,
  );
}

export function adminChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return adminFetch<void>('/api/admin/password', {
    method: 'PUT',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// ---------------------------------------------------------------------------
// Catalogue PDFs (auto-generated client-side, uploaded to R2 via the API)
// ---------------------------------------------------------------------------

export function adminGetCatalogueEditions(): Promise<CatalogueEdition[]> {
  return adminFetch<ApiCatalogueEdition[], CatalogueEdition[]>('/api/catalogue', {}, (list) =>
    (list ?? []).map(toCatalogueEdition),
  );
}

export function adminDeleteCatalogueEdition(id: string): Promise<void> {
  return adminFetch<void>(`/api/admin/catalogue-editions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export interface CatalogueUploadResult {
  file_url: string;
  file_size_mb: number;
  edition_id?: string;
}

export async function adminUploadCataloguePdf(
  bytes: Uint8Array,
  meta: { title: string; scope: string },
): Promise<CatalogueUploadResult> {
  const token = getAdminToken();
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/admin/catalogue/upload?title=${encodeURIComponent(meta.title)}&scope=${encodeURIComponent(meta.scope)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: bytes as BodyInit,
      },
    );
  } catch {
    throw new Error(`Could not reach the API at ${API_BASE}. Is the worker running?`);
  }
  if (res.status === 401) {
    await adminLogout();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(apiErrorMessage(text, `Upload failed with status ${res.status}.`));
  }
  const data = unwrap<{ file_url: string; file_size_mb: number; id?: number }>(
    await res.json(),
  );
  return {
    file_url: data.file_url,
    file_size_mb: data.file_size_mb,
    edition_id: data.id != null ? String(data.id) : undefined,
  };
}
