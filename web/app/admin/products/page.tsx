'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../../../components/AdminShell';
import { Badge } from '../../../components/Badge';
import { FilterChips } from '../../../components/FilterChips';
import { Icon } from '../../../components/Icon';
import { Toggle } from '../../../components/Toggle';
import { UiButton } from '../../../components/UiButton';
import {
  adminDeleteProduct,
  adminListCategories,
  adminListProducts,
  adminPatchProduct,
} from '../../../lib/api';
import { formatINR } from '../../../lib/format';
import type { Category, Product } from '../../../lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [stock, setStock] = useState('all');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    adminListProducts().then(setProducts).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Could not load products.');
    });
  };

  useEffect(() => {
    load();
    adminListCategories().then(setCategories).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'all') list = list.filter((p) => p.category_slug === category);
    if (stock !== 'all') list = list.filter((p) => p.stock_status === stock);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    return list;
  }, [products, category, stock, search]);

  const patchFlag = async (p: Product, key: 'is_new' | 'is_bestseller', value: boolean) => {
    setBusyId(p.id);
    setError('');
    try {
      const updated = await adminPatchProduct(p.id, { [key]: value } as Partial<Product>);
      setProducts((list) => list.map((x) => (x.id === p.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    setError('');
    try {
      await adminDeleteProduct(p.id);
      setProducts((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">Products</h1>
        <UiButton href="/admin/products/new">
          <Icon name="add" className="text-xl" />
          Add Product
        </UiButton>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="admin-product-search" className="sr-only">
          Search products
        </label>
        <input
          id="admin-product-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU"
          className="h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
        />
      </div>

      <div className="mt-3">
        <FilterChips
          ariaLabel="Category filter"
          active={category}
          onSelect={setCategory}
          options={[
            { label: 'All Categories', value: 'all' },
            ...categories.map((c) => ({ label: c.name, value: c.slug })),
          ]}
        />
      </div>
      <div className="mt-2">
        <FilterChips
          ariaLabel="Stock filter"
          active={stock}
          onSelect={setStock}
          options={[
            { label: 'All Stock', value: 'all' },
            { label: 'In Stock', value: 'in_stock' },
            { label: 'Low', value: 'low' },
            { label: 'Made to Order', value: 'made_to_order' },
            { label: 'Out of Stock', value: 'out_of_stock' },
          ]}
        />
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-hairline bg-white p-4 shadow-airy"
          >
            <div className="flex items-center gap-4">
              <img src={p.images[0]?.url} alt="" className="h-16 w-14 shrink-0 rounded-xl bg-accentWash object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{p.name}</p>
                <p className="text-[12px] text-faint">SKU: {p.sku}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-ink">{formatINR(p.price)}</p>
                  <Badge variant={p.stock_status === 'in_stock' ? 'filled' : 'outline'}>
                    {p.stock_status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/admin/products/${p.id}`}
                  aria-label={`Edit ${p.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
                >
                  <Icon name="edit" className="text-xl" />
                </Link>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  disabled={busyId === p.id}
                  aria-label={`Delete ${p.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-[#ffdad6]/60 hover:text-error disabled:opacity-50"
                >
                  <Icon name="delete" className="text-xl" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-5 border-t border-hairline pt-3">
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <Toggle
                  checked={p.is_new}
                  onChange={(v) => patchFlag(p, 'is_new', v)}
                  label={`Mark ${p.name} as new arrival`}
                />
                New
              </label>
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <Toggle
                  checked={p.is_bestseller}
                  onChange={(v) => patchFlag(p, 'is_bestseller', v)}
                  label={`Mark ${p.name} as bestseller`}
                />
                Bestseller
              </label>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-[14px] text-muted">No products match these filters.</p>
      )}
    </AdminShell>
  );
}
