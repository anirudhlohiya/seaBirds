'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { Toggle } from '../../../components/Toggle';
import { UiButton } from '../../../components/UiButton';
import { uploadProductImage } from '../../../lib/api';
import type { Category, PriceUnit, Product, StockStatus } from '../../../lib/types';

export type ProductFormValue = Omit<Partial<Product>, 'images'> & {
  images: { id: string; url: string; alt_text: string; position: number; previewUrl?: string }[];
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {hint && <span className="ml-2 text-[12px] font-normal text-faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash';
const areaCls =
  'w-full rounded-xl border border-hairline bg-white p-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash';

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'made_to_order', label: 'Made to Order' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

export function ProductForm({
  initial,
  categories,
  onSave,
  submitLabel,
}: {
  initial: ProductFormValue;
  categories: Category[];
  onSave: (value: ProductFormValue) => Promise<void>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ProductFormValue>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const set = <K extends keyof ProductFormValue>(key: K, v: ProductFormValue[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  const setImage = (index: number, url: string, previewUrl?: string) =>
    setValue((prev) => ({
      ...prev,
      images: prev.images.map((img, i) =>
        i === index ? { ...img, url, ...(previewUrl !== undefined ? { previewUrl } : {}) } : img,
      ),
    }));

  const addImage = () =>
    setValue((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        { id: `img-${Date.now()}`, url: '', alt_text: value.name ?? 'Product image', position: prev.images.length },
      ],
    }));

  const removeImage = (index: number) =>
    setValue((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

  const handleFileSelect = async (index: number, file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WebP…).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be 10MB or smaller.');
      return;
    }
    setUploadingIndex(index);
    try {
      const uploaded = await uploadProductImage(file);
      setImage(index, uploaded.url, uploaded.preview_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!value.name?.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!value.sku?.trim()) {
      setError('SKU is required.');
      return;
    }
    setBusy(true);
    try {
      await onSave(value);
      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-hairline bg-white p-5" aria-label="Gallery">
        <h2 className="text-[16px] font-semibold text-ink">Gallery</h2>
        <p className="mt-1 text-[13px] text-muted">
          Upload images straight to your R2 bucket — or paste an image URL instead.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {value.images.map((img, i) => (
            <div key={img.id} className="flex items-center gap-2">
              {img.url ? (
                <img
                  src={img.url}
                  alt=""
                  className="h-14 w-11 shrink-0 rounded-lg bg-accentWash object-cover"
                  onError={(e) => {
                    if (img.previewUrl && e.currentTarget.src !== img.previewUrl) {
                      e.currentTarget.src = img.previewUrl;
                    }
                  }}
                />
              ) : (
                <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-accentWash text-faint">
                  <Icon name="image" className="text-xl" />
                </span>
              )}
              <label className="sr-only" htmlFor={`img-url-${i}`}>
                Image {i + 1} URL
              </label>
              <input
                id={`img-url-${i}`}
                type="url"
                value={img.url}
                onChange={(e) => setImage(i, e.target.value)}
                placeholder="https://…"
                className={`${inputCls} flex-1`}
              />
              <label
                className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3 text-[13px] font-medium text-accent hover:border-accent ${
                  uploadingIndex !== null ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                <Icon name="upload" className="text-lg" />
                {uploadingIndex === i ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingIndex !== null}
                  onChange={(e) => {
                    handleFileSelect(i, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label={`Remove image ${i + 1}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-error"
              >
                <Icon name="delete" className="text-xl" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addImage}
            className="inline-flex items-center gap-2 self-start rounded-full border border-hairline px-4 py-2 text-[13px] font-medium text-accent hover:border-accent"
          >
            <Icon name="add" className="text-lg" />
            Add image
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-hairline bg-white p-5" aria-label="Basics">
        <h2 className="text-[16px] font-semibold text-ink">Basics</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Product name">
            <input id="pf-name" value={value.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Sea Mist Chanderi Silk Saree" className={inputCls} />
          </Field>
          <Field label="Tagline" hint="short descriptor">
            <input value={value.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} placeholder="with Real Silver Zari" className={inputCls} />
          </Field>
          <Field label="SKU">
            <input value={value.sku ?? ''} onChange={(e) => set('sku', e.target.value)} placeholder="SB-CHK-014" className={inputCls} />
          </Field>
          <Field label="URL slug">
            <input value={value.slug ?? ''} onChange={(e) => set('slug', e.target.value)} placeholder="sea-mist-chanderi-silk-saree" className={inputCls} />
          </Field>
          <Field label="Category">
            <select
              value={value.category_id ?? ''}
              onChange={(e) => {
                const cat = categories.find((c) => c.id === e.target.value);
                setValue((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                  category_slug: cat?.slug ?? prev.category_slug,
                  category_name: cat?.name ?? prev.category_name,
                }));
              }}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Yarn label" hint="shown on cards">
            <input value={value.yarn_label ?? ''} onChange={(e) => set('yarn_label', e.target.value)} placeholder="100% Pure Chanderi Silk" className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-hairline bg-white p-5" aria-label="Pricing and stock">
        <h2 className="text-[16px] font-semibold text-ink">Pricing & Stock</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Price (₹)">
            <input type="number" min={0} value={value.price ?? ''} onChange={(e) => set('price', Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="MRP (₹)">
            <input type="number" min={0} value={value.mrp ?? ''} onChange={(e) => set('mrp', Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Sold by">
            <select value={value.unit ?? 'piece'} onChange={(e) => set('unit', e.target.value as PriceUnit)} className={inputCls}>
              <option value="piece">Piece</option>
              <option value="meter">Meter</option>
            </select>
          </Field>
          <Field label="Stock quantity">
            <input type="number" min={0} value={value.stock_qty ?? ''} onChange={(e) => set('stock_qty', Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Stock status">
            <select value={value.stock_status ?? 'in_stock'} onChange={(e) => set('stock_status', e.target.value as StockStatus)} className={inputCls}>
              {STOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-5">
          {(
            [
              ['is_new', 'New arrival'],
              ['is_bestseller', 'Bestseller'],
              ['is_visible', 'Visible in catalogue'],
              ['whatsapp_enabled', 'Enable for WhatsApp Concierge'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[14px] text-ink">
              <Toggle checked={Boolean(value[key])} onChange={(v) => set(key, v)} label={label} />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-hairline bg-white p-5" aria-label="Specifications">
        <h2 className="text-[16px] font-semibold text-ink">Core Specifications</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Fabric composition">
            <textarea rows={2} value={value.fabric_composition ?? ''} onChange={(e) => set('fabric_composition', e.target.value)} className={areaCls} />
          </Field>
          <Field label="Weave & zari">
            <textarea rows={2} value={value.weave ?? ''} onChange={(e) => set('weave', e.target.value)} className={areaCls} />
          </Field>
          <Field label="Dimensions">
            <input value={value.dimensions ?? ''} onChange={(e) => set('dimensions', e.target.value)} placeholder="6.5 Meters (includes blouse 0.8m)" className={inputCls} />
          </Field>
          <Field label="Care guidelines">
            <input value={value.care ?? ''} onChange={(e) => set('care', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Certifications">
            <input value={value.certifications ?? ''} onChange={(e) => set('certifications', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Origin">
            <input value={value.origin ?? ''} onChange={(e) => set('origin', e.target.value)} placeholder="Madhya Pradesh Looms" className={inputCls} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description">
            <textarea rows={3} value={value.description ?? ''} onChange={(e) => set('description', e.target.value)} className={areaCls} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-hairline bg-white p-5" aria-label="Artisan story">
        <h2 className="text-[16px] font-semibold text-ink">Artisan Story</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Weaver's diary quote">
            <textarea rows={3} value={value.artisan_quote ?? ''} onChange={(e) => set('artisan_quote', e.target.value)} className={areaCls} />
          </Field>
          <div className="flex flex-col gap-4">
            <Field label="Artisan name">
              <input value={value.artisan_name ?? ''} onChange={(e) => set('artisan_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Artisan place">
              <input value={value.artisan_place ?? ''} onChange={(e) => set('artisan_place', e.target.value)} placeholder="Pranpur, Chanderi" className={inputCls} />
            </Field>
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <UiButton type="submit" disabled={busy} className="flex-1">
          {busy ? 'Saving…' : submitLabel}
        </UiButton>
        <UiButton variant="secondary" href="/admin/products">
          Cancel
        </UiButton>
      </div>
    </form>
  );
}
