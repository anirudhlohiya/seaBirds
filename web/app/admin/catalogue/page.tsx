'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../components/AdminShell';
import { Icon } from '../../../components/Icon';
import { Toggle } from '../../../components/Toggle';
import { UiButton } from '../../../components/UiButton';
import {
  adminDeleteCatalogueEdition,
  adminGetCatalogueEditions,
  adminUploadCataloguePdf,
  getCategories,
  getProducts,
  getSettings,
} from '../../../lib/api';
import { generateCataloguePdf, type CataloguePdfOptions } from '../../../lib/cataloguePdf';
import type { CatalogueEdition, Category, Product, StoreSettings } from '../../../lib/types';

type Scope = 'master' | 'category' | 'new-arrivals';
type Phase = 'idle' | 'preparing' | 'generating' | 'uploading' | 'done';

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: 'master', label: 'Entire Master Catalogue', hint: 'Every visible weave, all categories' },
  { value: 'category', label: 'Specific Category', hint: 'One craft family' },
  { value: 'new-arrivals', label: 'New Arrivals Lookbook', hint: 'This season’s freshest weaves' },
];

const PHASE_LABEL: Record<Exclude<Phase, 'idle' | 'done'>, string> = {
  preparing: 'Gathering weaves…',
  generating: 'Composing pages…',
  uploading: 'Publishing to library…',
};

export default function AdminCataloguePage() {
  const [editions, setEditions] = useState<CatalogueEdition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [scope, setScope] = useState<Scope>('master');
  const [categorySlug, setCategorySlug] = useState('');
  const [includeTiers, setIncludeTiers] = useState(true);
  const [includeSpecs, setIncludeSpecs] = useState(true);
  const [includeContact, setIncludeContact] = useState(true);
  const [recipient, setRecipient] = useState('');

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [published, setPublished] = useState<{ file_url: string; file_size_mb: number } | null>(null);

  const loadEditions = () => {
    adminGetCatalogueEditions().then(setEditions).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Could not load editions.');
    });
  };

  useEffect(() => {
    loadEditions();
    getCategories().then(setCategories).catch(() => undefined);
    getProducts().then(setProducts).catch(() => undefined);
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  const scopedProducts = (): Product[] => {
    if (scope === 'category' && categorySlug) {
      return products.filter((p) => p.category_slug === categorySlug);
    }
    if (scope === 'new-arrivals') return products.filter((p) => p.is_new);
    return products;
  };

  const scopeTitle = (): string => {
    if (scope === 'new-arrivals') return 'New Arrivals Lookbook';
    if (scope === 'category' && categorySlug) {
      return categories.find((c) => c.slug === categorySlug)?.name ?? 'Category Catalogue';
    }
    return 'Master Catalogue';
  };

  const generate = async () => {
    setError('');
    setPublished(null);
    if (!settings) {
      setError('Store settings are still loading. Please wait a moment.');
      return;
    }
    const list = scopedProducts();
    if (list.length === 0) {
      setError('No products match this scope yet.');
      return;
    }
    setPhase('preparing');
    try {
      const options: CataloguePdfOptions = {
        scope,
        categorySlug: scope === 'category' ? categorySlug : undefined,
        includeTiers,
        includeSpecs,
        includeContact,
        recipientName: recipient.trim() || undefined,
      };
      setPhase('generating');
      const bytes = await generateCataloguePdf({ products: list, categories, settings, options });
      setPhase('uploading');
      const title = scopeTitle();
      const uploaded = await adminUploadCataloguePdf(bytes, { title, scope });
      setPublished({ file_url: uploaded.file_url, file_size_mb: uploaded.file_size_mb });
      setPhase('done');
      loadEditions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
      setPhase('idle');
    }
  };

  const remove = async (edition: CatalogueEdition) => {
    if (!window.confirm(`Delete "${edition.title}" from the library?`)) return;
    setError('');
    try {
      await adminDeleteCatalogueEdition(edition.id);
      setEditions((list) => list.filter((x) => x.id !== edition.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const busy = phase === 'preparing' || phase === 'generating' || phase === 'uploading';

  return (
    <AdminShell>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Catalogue Studio</h1>
      <p className="mt-1 text-[14px] text-muted">
        Catalogues are auto-generated from live products — never uploaded manually.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      )}
      {published && (
        <div role="status" className="mt-4 rounded-2xl bg-[#e6f4ea] p-5 text-[14px] text-[#0d5c2e]">
          <p className="font-semibold">Catalogue published ✓</p>
          <p className="mt-1 break-all">
            <a href={published.file_url} target="_blank" rel="noreferrer" className="underline">
              {published.file_url}
            </a>{' '}
            • {published.file_size_mb.toFixed(1)} MB
          </p>
        </div>
      )}

      <section className="mt-5 rounded-2xl border border-hairline bg-white p-5" aria-label="Generate catalogue">
        <h2 className="text-[16px] font-semibold text-ink">Generate New Edition</h2>

        <p className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-caps text-muted">Scope</p>
        <div role="radiogroup" aria-label="Catalogue scope" className="flex flex-col gap-2">
          {SCOPES.map((s) => (
            <label
              key={s.value}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                scope === s.value ? 'border-accent bg-accentWash/50' : 'border-hairline'
              }`}
            >
              <input
                type="radio"
                name="admin-catalogue-scope"
                value={s.value}
                checked={scope === s.value}
                onChange={() => setScope(s.value)}
                className="mt-1 accent-[#0D5C75]"
              />
              <span className="flex-1">
                <span className="block text-[14px] font-medium text-ink">{s.label}</span>
                <span className="block text-[13px] text-muted">{s.hint}</span>
                {s.value === 'category' && scope === 'category' && (
                  <span className="mt-2 block">
                    <label htmlFor="admin-cat-select" className="sr-only">
                      Choose category
                    </label>
                    <select
                      id="admin-cat-select"
                      value={categorySlug}
                      onChange={(e) => setCategorySlug(e.target.value)}
                      className="h-11 w-full rounded-xl border border-hairline bg-white px-3 text-[14px] focus:border-accent focus:outline-none"
                    >
                      <option value="">Select category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 divide-y divide-hairline rounded-2xl border border-hairline">
          {[
            { label: 'Wholesale & bulk price tiers', hint: 'Retail / 10+ pcs −5% / 50+ pcs −10%', value: includeTiers, set: setIncludeTiers },
            { label: 'Fabric specifications & GSM details', hint: 'Composition, weave, dimensions', value: includeSpecs, set: setIncludeSpecs },
            { label: 'Showroom contact & WhatsApp link', hint: 'Concierge line on every page', value: includeContact, set: setIncludeContact },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-[14px] font-medium text-ink">{row.label}</p>
                <p className="text-[13px] text-muted">{row.hint}</p>
              </div>
              <Toggle checked={row.value} onChange={row.set} label={row.label} />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="admin-recipient" className="mb-1.5 block text-[13px] font-medium text-ink">
            Recipient personalization
            <span className="ml-2 text-[12px] font-normal text-faint">Optional — printed on the cover</span>
          </label>
          <input
            id="admin-recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="e.g. Meera Kapoor, Bridal House"
            className="h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
          />
        </div>

        <div className="mt-5">
          <UiButton onClick={generate} disabled={busy} className="w-full">
            {busy ? (
              <>
                <Icon name="progress_activity" className="animate-spin text-xl" />
                {PHASE_LABEL[phase as Exclude<Phase, 'idle' | 'done'>]}
              </>
            ) : (
              <>
                <Icon name="picture_as_pdf" className="text-xl" />
                Generate & Publish Catalogue
              </>
            )}
          </UiButton>
          <p className="mt-2 text-[12px] text-faint" role="status">
            {scopedProducts().length} product{scopedProducts().length === 1 ? '' : 's'} in this scope
          </p>
        </div>
      </section>

      <section className="mt-8" aria-label="Published editions">
        <h2 className="text-[18px] font-semibold text-ink">Published Editions</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {editions.map((ed) => (
            <li
              key={ed.id}
              className="flex items-center gap-4 rounded-2xl border border-hairline bg-white p-4 shadow-airy"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accentWash text-accent">
                <Icon name="picture_as_pdf" className="text-2xl" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{ed.title}</p>
                <p className="text-[12px] text-faint">
                  {ed.volume} • {ed.file_size_mb} MB
                </p>
                <a
                  href={ed.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[12px] text-accent underline"
                >
                  {ed.file_url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => remove(ed)}
                aria-label={`Delete ${ed.title}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[#ffdad6]/60 hover:text-error"
              >
                <Icon name="delete" className="text-xl" />
              </button>
            </li>
          ))}
        </ul>
        {editions.length === 0 && (
          <p className="mt-4 text-[14px] text-muted">No editions published yet.</p>
        )}
      </section>
    </AdminShell>
  );
}
