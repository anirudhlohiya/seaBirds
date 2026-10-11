'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
  optional,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  optional?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {optional && <span className="ml-1 text-[12px] font-normal text-faint italic">(optional)</span>}
        {hint && <span className="ml-2 text-[12px] font-normal text-faint">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[13px] text-error">{error}</p>}
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parent_id),
    [categories],
  );

  const availableSubcategories = useMemo(
    () =>
      value.category_id
        ? categories.filter((c) => c.parent_id === value.category_id)
        : categories.filter((c) => !!c.parent_id),
    [categories, value.category_id],
  );

  useEffect(() => {
    const errors: Record<string, string> = {};
    if (touched.name && !value.name?.trim()) errors.name = 'Product name is required.';
    if (touched.sku && !value.sku?.trim()) errors.sku = 'SKU is required.';
    
    setFieldErrors(errors);
    setError(Object.values(errors)[0] || '');
  }, [value.name, value.sku, touched.name, touched.sku]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const set = <K extends keyof ProductFormValue>(key: K, v: ProductFormValue[K]) => {
    setValue((prev) => ({ ...prev, [key]: v }));
    setTouched((prev) => ({ ...prev, [key as string]: true }));
  };

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
    const localPreview = URL.createObjectURL(file);
    setImage(index, value.images[index]?.url || localPreview, localPreview);
    setUploadingIndex(index);
    try {
      const uploaded = await uploadProductImage(file);
      setImage(index, uploaded.url, uploaded.preview_url || uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const errors: Record<string, string> = {};
    if (!value.name?.trim()) errors.name = 'Product name is required.';
    if (!value.sku?.trim()) errors.sku = 'SKU is required.';
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the errors below.');
      setTouched((prev) => ({ ...prev, name: true, sku: true }));
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
          {value.images.map((img, i) => {
            const previewSrc = img.previewUrl || img.url;
            return (
              <div key={img.id} className="flex items-center gap-2">
                {previewSrc ? (
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-accentWash border border-hairline">
                    <img
                      src={previewSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        if (img.previewUrl && e.currentTarget.src !== img.previewUrl) {
                          e.currentTarget.src = img.previewUrl;
                        } else {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }
                      }}
                    />
                    <span
                      style={{ display: 'none' }}
                      className="absolute inset-0 items-center justify-center bg-accentWash text-faint"
                    >
                      <Icon name="broken_image" className="text-xl" />
                    </span>
                    {uploadingIndex === i && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] text-white">
                        …
                      </div>
                    )}
                  </div>
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
            );
          })}
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
          <Field label="Product name" error={fieldErrors.name}>
            <input id="pf-name" value={value.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Sea Mist Chanderi Silk Saree" className={inputCls} />
          </Field>
          <Field label="Tagline" hint="short descriptor" optional>
            <input value={value.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} placeholder="with Real Silver Zari" className={inputCls} />
          </Field>
          <Field label="SKU" error={fieldErrors.sku}>
            <input value={value.sku ?? ''} onChange={(e) => set('sku', e.target.value)} placeholder="SB-CHK-014" className={inputCls} />
          </Field>
          <Field label="URL slug">
            <input value={value.slug ?? ''} onChange={(e) => set('slug', e.target.value)} placeholder="sea-mist-chanderi-silk-saree" className={inputCls} />
          </Field>
          <Field label="Main Category">
            <select
              value={value.category_id ?? ''}
              onChange={(e) => {
                const cat = categories.find((c) => c.id === e.target.value);
                setValue((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                  category_slug: cat?.slug ?? '',
                  category_name: cat?.name ?? '',
                  subcategory_id: '',
                  subcategory_slug: '',
                  subcategory_name: '',
                }));
              }}
              className={inputCls}
            >
              <option value="">Select main category…</option>
              {mainCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subcategory" optional hint={value.category_id ? 'specific weave or style' : 'select main category first'}>
            <select
              value={value.subcategory_id ?? ''}
              disabled={!value.category_id}
              onChange={(e) => {
                const sub = categories.find((c) => c.id === e.target.value);
                setValue((prev) => ({
                  ...prev,
                  subcategory_id: e.target.value,
                  subcategory_slug: sub?.slug ?? '',
                  subcategory_name: sub?.name ?? '',
                }));
              }}
              className={`${inputCls} ${!value.category_id ? 'bg-[#f7f9f8] text-muted cursor-not-allowed' : ''}`}
            >
              <option value="">
                {!value.category_id
                  ? 'Select a main category first…'
                  : availableSubcategories.length === 0
                    ? 'No subcategories under this category'
                    : 'Select subcategory (optional)…'}
              </option>
              {availableSubcategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Yarn label" hint="shown on cards" optional>
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
          <Field label="Fabric composition" optional>
            <textarea rows={2} value={value.fabric_composition ?? ''} onChange={(e) => set('fabric_composition', e.target.value)} className={areaCls} />
          </Field>
          <Field label="Weave & zari" optional>
            <textarea rows={2} value={value.weave ?? ''} onChange={(e) => set('weave', e.target.value)} className={areaCls} />
          </Field>
          <Field label="Dimensions" optional>
            <input value={value.dimensions ?? ''} onChange={(e) => set('dimensions', e.target.value)} placeholder="6.5 Meters (includes blouse 0.8m)" className={inputCls} />
          </Field>
          <Field label="Care guidelines" optional>
            <input value={value.care ?? ''} onChange={(e) => set('care', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Certifications" optional>
            <input value={value.certifications ?? ''} onChange={(e) => set('certifications', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Origin" optional>
            <input value={value.origin ?? ''} onChange={(e) => set('origin', e.target.value)} placeholder="Madhya Pradesh Looms" className={inputCls} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description" optional>
            <textarea rows={3} value={value.description ?? ''} onChange={(e) => set('description', e.target.value)} className={areaCls} />
          </Field>
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
