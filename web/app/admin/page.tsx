'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '../../components/AdminShell';
import { Badge } from '../../components/Badge';
import { Icon } from '../../components/Icon';
import { UiButton } from '../../components/UiButton';
import { adminListProducts, getDashboard } from '../../lib/api';
import { formatINR } from '../../lib/format';
import type { DashboardStats, Product } from '../../lib/types';

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5 shadow-airy">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accentWash text-accent">
          <Icon name={icon} className="text-xl" />
        </span>
      </div>
      <p className="mt-2 text-[32px] font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[12px] text-muted">{sub}</p>
    </div>
  );
}

function stockBadge(product: Product) {
  if (product.stock_status === 'low') return <Badge variant="error">Low ({product.stock_qty} pcs)</Badge>;
  if (product.stock_status === 'made_to_order') return <Badge variant="outline">Made to Order</Badge>;
  if (product.stock_status === 'out_of_stock') return <Badge variant="error">Out of Stock</Badge>;
  return (
    <Badge variant="filled">
      In Stock ({product.stock_qty}
      {product.unit === 'meter' ? 'm' : ''})
    </Badge>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Product[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard().then(setStats).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Could not load dashboard.');
    });
    adminListProducts()
      .then((list) => setRecent(list.slice(0, 5)))
      .catch(() => undefined);
  }, []);

  return (
    <AdminShell>
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-caps uppercase text-accent">
        <span className="h-2 w-2 rounded-full bg-whatsapp" aria-hidden="true" />
        Catalogue Live • {stats ? `${stats.total_products} active SKUs` : '…'}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-[14px] text-muted">Heritage Textile Operations</p>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">Weave Master Admin</h1>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Products" value={stats ? String(stats.total_products) : '—'} sub="Active SKUs" icon="inventory_2" />
        <StatCard label="Categories" value={stats ? String(stats.total_categories) : '—'} sub="Craft families" icon="category" />
        <StatCard label="New Arrivals" value={stats ? String(stats.new_arrivals) : '—'} sub="In lookbook" icon="auto_awesome" />
        <StatCard label="Bestsellers" value={stats ? String(stats.bestsellers) : '—'} sub="High conversion" icon="star" />
      </div>

      <div className="mt-4">
        <UiButton href="/admin/products/new" className="w-full">
          <Icon name="add" className="text-xl" />
          Add New Product
        </UiButton>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <UiButton variant="secondary" href="/admin/categories">
          <Icon name="category" className="text-xl" />
          Categories
        </UiButton>
        <UiButton variant="secondary" href="/admin/catalogue">
          <Icon name="picture_as_pdf" className="text-xl" />
          Catalogue
        </UiButton>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[20px] font-semibold text-ink">Recent Textiles</h2>
        <p className="text-[11px] font-semibold tracking-caps uppercase text-faint">Active weaves</p>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {recent.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-4 rounded-2xl border border-hairline bg-white p-4 shadow-airy"
          >
            <img src={p.images[0]?.url} alt="" className="h-16 w-14 shrink-0 rounded-xl bg-accentWash object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                {p.is_new && <Badge>New</Badge>}
                {p.is_bestseller && <Badge variant="outline">Bestseller</Badge>}
              </div>
              <p className="mt-1 truncate text-[15px] font-medium text-ink">{p.name}</p>
              <p className="text-[12px] text-faint">SKU: {p.sku}</p>
              <div className="mt-1.5 flex items-center gap-3">
                <p className="text-[16px] font-semibold text-ink">{formatINR(p.price)}</p>
                {stockBadge(p)}
              </div>
            </div>
            <Link
              href={`/admin/products/${p.id}`}
              aria-label={`Edit ${p.name}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-accentWash hover:text-accent"
            >
              <Icon name="edit" className="text-xl" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <UiButton variant="secondary" href="/admin/products" className="w-full">
          View All {stats ? stats.total_products : ''} Products
          <Icon name="arrow_forward" className="text-xl" />
        </UiButton>
      </div>
    </AdminShell>
  );
}
