'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { FilterChips } from '../components/FilterChips';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { SectionHeader } from '../components/SectionHeader';
import { StoreHeader } from '../components/StoreHeader';
import { UiButton } from '../components/UiButton';
import { getCategories, getProducts } from '../lib/api';
import type { Category, Product } from '../lib/types';

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => undefined);
    getCategories().then(setCategories).catch(() => undefined);
  }, []);

  const newArrivals = useMemo(() => products.filter((p) => p.is_new), [products]);
  const bestsellers = useMemo(() => products.filter((p) => p.is_bestseller), [products]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(search.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : '/products');
  };

  const goToCategory = (value: string) => {
    setActiveCategory(value);
    router.push(value === 'all' ? '/products' : `/products?category=${encodeURIComponent(value)}`);
  };

  return (
    <div className="min-h-screen pb-24">
      <StoreHeader />

      <div className="mx-auto max-w-6xl px-5 pt-4">
        <form onSubmit={submitSearch} role="search" className="relative">
          <label htmlFor="home-search" className="sr-only">
            Search sarees, fabrics, weaves
          </label>
          <input
            id="home-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sarees, fabrics, weaves"
            className="h-12 w-full rounded-xl border border-hairline bg-white pl-11 pr-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
          />
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-faint"
          />
        </form>

        <div className="mt-4">
          <FilterChips
            ariaLabel="Categories"
            active={activeCategory}
            onSelect={goToCategory}
            options={[
              { label: 'All Collections', value: 'all' },
              ...categories.map((c) => ({ label: c.name, value: c.slug })),
            ]}
          />
        </div>
      </div>

      <section className="mx-auto mt-5 max-w-6xl px-5" aria-label="Featured">
        <div className="relative overflow-hidden rounded-3xl bg-primary text-white">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(120% 120% at 15% 10%, #0D5C75 0%, transparent 55%), radial-gradient(100% 100% at 90% 90%, #0D5C75 0%, transparent 50%)',
            }}
            aria-hidden="true"
          />
          <div className="relative p-8 md:p-12">
            <p className="text-[11px] font-semibold tracking-caps uppercase text-accentWash/80">
              Festive Inspiration {new Date().getFullYear()}
            </p>
            <h2 className="mt-3 max-w-md text-[32px] font-semibold leading-10 tracking-tight md:text-[48px] md:leading-[56px]">
              The Coastal Festive Weaves
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-7 text-white/80">
              Master artisan drapes harmonizing deep ocean hues, handspun threads, and delicate
              golden shimmer.
            </p>
            <div className="mt-6">
              <UiButton variant="secondary" href="/products">
                Explore Catalog
                <Icon name="arrow_forward" className="text-xl" />
              </UiButton>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5" aria-label="New arrivals">
        <SectionHeader eyebrow="Curated fresh" title="New Arrivals" actionLabel="View All" actionHref="/products?tag=new" />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {newArrivals.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5" aria-label="Bestsellers">
        <SectionHeader
          eyebrow="Artisan favorites"
          title="Bestsellers"
          actionLabel="View All"
          actionHref="/products?tag=bestseller"
        />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {bestsellers.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5" aria-label="Shop by craft and category">
        <SectionHeader eyebrow="Artisanal archive" title="Shop by Craft & Category" />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${encodeURIComponent(c.slug)}`}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-white shadow-airy"
            >
              <div className="aspect-[4/3] overflow-hidden bg-accentWash">
                <img
                  src={c.image_url}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-4 pt-10">
                <p className="text-[15px] font-semibold text-white">{c.name}</p>
                <p className="text-[12px] text-white/80">{c.product_count} products</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5" aria-label="Wholesale catalogue">
        <div className="rounded-3xl border border-hairline bg-white p-6 shadow-airy md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accentWash text-accent">
              <Icon name="picture_as_pdf" className="text-2xl" />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-caps uppercase text-muted">
                Wholesale & Retail
              </p>
              <h3 className="mt-1 text-[20px] font-semibold text-ink">
                {new Date().getFullYear()} Comprehensive Catalogue
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-muted">
                Need our complete wholesale or retail price catalogue with yarn specs? Browse the
                latest auto-generated editions.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <UiButton href="/catalogue" className="flex-1">
              <Icon name="download" className="text-xl" />
              Browse Catalogues
            </UiButton>
            <UiButton variant="secondary" href="/enquiry" className="flex-1">
              <Icon name="chat" className="text-xl" />
              Talk to Concierge
            </UiButton>
          </div>
        </div>
      </section>

      <BottomNav active="/" />
    </div>
  );
}
