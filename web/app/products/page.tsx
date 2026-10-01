'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BottomNav } from '../../components/BottomNav';
import { FilterChips } from '../../components/FilterChips';
import { Icon } from '../../components/Icon';
import { ProductCard } from '../../components/ProductCard';
import { StoreHeader } from '../../components/StoreHeader';
import { getCategories, getProducts, getSettings } from '../../lib/api';
import type { Category, Product } from '../../lib/types';

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name';

const SORTS: { label: string; value: SortKey }[] = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name A–Z', value: 'name' },
];

function sortProducts(list: Product[], sort: SortKey): Product[] {
  const copy = [...list];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy;
  }
}

function ProductsContent() {
  const params = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [whatsapp, setWhatsapp] = useState('');

  const [search, setSearch] = useState(params.get('search') ?? '');
  const [category, setCategory] = useState(params.get('category') ?? 'all');
  const [tag, setTag] = useState(params.get('tag') ?? 'all');
  const [sort, setSort] = useState<SortKey>('featured');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => undefined);
    getCategories().then(setCategories).catch(() => undefined);
    getSettings()
      .then((s) => setWhatsapp(s.whatsapp_number.replace(/\D/g, '')))
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'all') list = list.filter((p) => p.category_slug === category);
    if (tag === 'new') list = list.filter((p) => p.is_new);
    if (tag === 'bestseller') list = list.filter((p) => p.is_bestseller);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.yarn_label.toLowerCase().includes(q),
      );
    }
    return sortProducts(list, sort);
  }, [products, category, tag, search, sort]);

  const activeChips: { label: string; clear: () => void }[] = [];
  if (category !== 'all') {
    const cat = categories.find((c) => c.slug === category);
    activeChips.push({ label: cat?.name ?? category, clear: () => setCategory('all') });
  }
  if (tag !== 'all') {
    activeChips.push({
      label: tag === 'new' ? 'New Arrivals' : 'Bestsellers',
      clear: () => setTag('all'),
    });
  }
  if (search.trim()) activeChips.push({ label: `“${search.trim()}”`, clear: () => setSearch('') });

  return (
    <div className="min-h-screen pb-24">
      <StoreHeader title="Collection" showBack backHref="/" />

      <div className="mx-auto max-w-6xl px-5 pt-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="products-search" className="sr-only">
              Search products
            </label>
            <input
              id="products-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the collection"
              className="h-12 w-full rounded-xl border border-hairline bg-white pl-11 pr-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
            />
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-faint"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="flex h-12 items-center gap-2 rounded-xl border border-hairline bg-white px-4 text-[14px] font-medium text-ink"
          >
            <Icon name="tune" className="text-xl" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 rounded-2xl border border-hairline bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label htmlFor="sort" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-caps text-muted">
                  Sort by
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-12 w-full rounded-xl border border-hairline bg-white px-3 text-[15px] focus:border-accent focus:outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-caps text-muted">
                  Curated
                </p>
                <FilterChips
                  ariaLabel="Curated filters"
                  active={tag}
                  onSelect={setTag}
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'New Arrivals', value: 'new' },
                    { label: 'Bestsellers', value: 'bestseller' },
                  ]}
                />
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-caps text-muted">
                Category
              </p>
              <FilterChips
                ariaLabel="Category filter"
                active={category}
                onSelect={setCategory}
                options={[
                  { label: 'All', value: 'all' },
                  ...categories.map((c) => ({ label: c.name, value: c.slug })),
                ]}
              />
            </div>
          </div>
        )}

        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1.5 rounded-full bg-accentWash px-3 py-1.5 text-[12px] font-medium text-accent"
              >
                {chip.label}
                <Icon name="close" className="text-base" />
              </button>
            ))}
          </div>
        )}

        <p className="mt-4 text-[13px] text-muted" role="status">
          {filtered.length} textile{filtered.length === 1 ? '' : 's'}
        </p>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-hairline bg-white p-10 text-center">
            <Icon name="search_off" className="text-4xl text-faint" />
            <p className="mt-3 text-[16px] font-medium text-ink">No weaves found</p>
            <p className="mt-1 text-[14px] text-muted">Try a different search or clear the filters.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <section className="mt-12 rounded-3xl bg-accentWash p-6 md:p-8" aria-label="Custom weave">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent">
              <Icon name="design_services" className="text-3xl" />
            </span>
            <div className="flex-1">
              <h3 className="text-[20px] font-semibold text-ink">Seeking a Custom Weave?</h3>
              <p className="mt-1 text-[14px] leading-6 text-muted">
                Our master weavers take bespoke orders — colours, motifs, yardage. Tell the
                concierge what you dream of.
              </p>
            </div>
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello Sea Birds, I would like a custom weave made.')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-whatsapp px-6 font-semibold text-white"
            >
              <Icon name="chat" className="text-xl" />
              WhatsApp Us
            </a>
          </div>
        </section>
      </div>

      <BottomNav active="/products" />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading collection…</div>}>
      <ProductsContent />
    </Suspense>
  );
}
