'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '../../../components/BottomNav';
import { Badge } from '../../../components/Badge';
import { Icon } from '../../../components/Icon';
import { StoreHeader } from '../../../components/StoreHeader';
import { UiButton } from '../../../components/UiButton';
import { getProduct, getProducts, getSettings } from '../../../lib/api';
import { discountPct, formatINR, formatUnitPrice } from '../../../lib/format';
import { addToEnquiry } from '../../../lib/store';
import type { Product } from '../../../lib/types';
import { useWishlist } from '../../../lib/wishlist';

function stockBanner(product: Product): { label: string; sub: string; tone: string } {
  switch (product.stock_status) {
    case 'in_stock':
      return {
        label: 'In Stock & Loom-Inspected',
        sub: 'Ready for worldwide express courier dispatch within 24 hours',
        tone: 'bg-[#e6f4ea] text-[#0d5c2e]',
      };
    case 'low':
      return {
        label: `Low Stock — only ${product.stock_qty} left`,
        sub: 'Reserve yours before this weave sells out',
        tone: 'bg-[#fff4e0] text-[#8a5a00]',
      };
    case 'made_to_order':
      return {
        label: 'Made to Order',
        sub: 'Woven fresh on our looms — ships in 3–4 weeks',
        tone: 'bg-accentWash text-accent',
      };
    default:
      return { label: 'Currently Unavailable', sub: 'Ask the concierge about the next weaving', tone: 'bg-[#ffdad6] text-error' };
  }
}

const SPECS: { label: string; icon: string; key: 'fabric_composition' | 'weave' | 'dimensions' | 'care' | 'certifications' }[] = [
  { label: 'Fabric Composition', icon: 'texture', key: 'fabric_composition' },
  { label: 'Weave & Zari', icon: 'grid_on', key: 'weave' },
  { label: 'Dimensions', icon: 'straighten', key: 'dimensions' },
  { label: 'Care Guidelines', icon: 'dry_cleaning', key: 'care' },
  { label: 'Guild Certifications', icon: 'verified', key: 'certifications' },
];

export function ProductDetail({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [advisor, setAdvisor] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [missing, setMissing] = useState(false);
  const { has, toggle } = useWishlist();

  useEffect(() => {
    getProduct(slug)
      .then((p) => {
        if (!p) setMissing(true);
        else setProduct(p);
      })
      .catch(() => setMissing(true));
    getProducts()
      .then((all) => setRelated(all.filter((p) => p.slug !== slug).slice(0, 4)))
      .catch(() => undefined);
    getSettings()
      .then((s) => {
        setWhatsapp(s.whatsapp_number.replace(/\D/g, ''));
        setAdvisor(s.advisor_name);
      })
      .catch(() => undefined);
  }, [slug]);

  const banner = useMemo(() => (product ? stockBanner(product) : null), [product]);

  if (missing) notFound();
  if (!product || !banner) {
    return <div className="p-10 text-center text-muted">Loading weave…</div>;
  }

  const pct = discountPct(product.mrp, product.price);
  const wished = has(product.id);
  const waText = encodeURIComponent(
    `Hello ${advisor || 'Sea Birds'}, I would like to enquire about the ${product.name} (${product.sku}) priced at ${formatUnitPrice(product.price, product.unit)}.`,
  );

  return (
    <div className="min-h-screen pb-24">
      <StoreHeader title="Product Detail" showBack backHref="/products" />

      <div className="mx-auto max-w-6xl px-5 pt-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-caps text-muted">
          <Link href="/products" className="hover:text-accent">
            Handloom
          </Link>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-ink">{product.category_name}</span>
        </nav>

        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div>
            <div className="relative overflow-hidden rounded-3xl bg-accentWash">
              <img
                src={product.images[activeImage]?.url}
                alt={product.images[activeImage]?.alt_text ?? product.name}
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="absolute bottom-4 right-4 rounded-full bg-ink/70 px-3 py-1 text-[12px] font-medium text-white">
                {activeImage + 1}/{product.images.length}
              </span>
            </div>
            <div className="mt-3 flex gap-3" role="tablist" aria-label="Product images">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeImage}
                  aria-label={`View image ${i + 1}`}
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-16 overflow-hidden rounded-xl border-2 ${
                    i === activeImage ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-caps uppercase text-muted">
              {product.yarn_label} • Heritage Lot #{product.sku.split('-')[2]}
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-8 tracking-tight text-ink md:text-[36px] md:leading-[44px]">
              {product.name} <span className="text-muted font-medium">{product.tagline}</span>
            </h1>

            <div className="mt-4 flex items-center gap-3">
              <p className="text-[24px] font-semibold text-ink">
                {formatUnitPrice(product.price, product.unit)}
              </p>
              {pct > 0 && (
                <>
                  <p className="text-[15px] text-faint line-through">
                    {formatUnitPrice(product.mrp, product.unit)}
                  </p>
                  <Badge>{pct}% Privilege</Badge>
                </>
              )}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Inclusive of all levies & complimentary heritage muslin box packing
            </p>

            <div className={`mt-4 rounded-2xl p-4 ${banner.tone}`}>
              <p className="flex items-center gap-2 text-[14px] font-semibold">
                <Icon name="verified" className="text-xl" />
                {banner.label}
              </p>
              <p className="mt-1 text-[13px] opacity-80">{banner.sub}</p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex gap-3">
                <UiButton className="flex-1" onClick={() => addToEnquiry(product.id, 1)}>
                  <Icon name="shopping_bag" className="text-xl" />
                  Add to Enquiry
                </UiButton>
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-pressed={wished}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-white text-ink hover:text-error"
                >
                  <Icon name="favorite" className="text-2xl" filled={wished} />
                </button>
              </div>
              <UiButton
                variant="whatsapp"
                href={`https://wa.me/${whatsapp}?text=${waText}`}
              >
                <Icon name="chat" className="text-xl" />
                Enquire via WhatsApp Advisor
              </UiButton>
            </div>

            <div className="mt-6 rounded-2xl border border-hairline bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-ink">Artisanal Specifications</h2>
                <p className="text-[11px] font-semibold tracking-caps uppercase text-accent">{product.origin}</p>
              </div>
              <dl className="mt-4 divide-y divide-hairline">
                {SPECS.map((spec) => (
                  <div key={spec.key} className="flex gap-4 py-3">
                    <Icon name={spec.icon} className="mt-0.5 text-xl text-muted" />
                    <div className="flex-1">
                      <dt className="text-[12px] font-semibold uppercase tracking-caps text-muted">
                        {spec.label}
                      </dt>
                      <dd className="mt-1 text-[14px] leading-6 text-ink">{product[spec.key]}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <section className="mt-12" aria-label="Related products">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[20px] font-semibold text-ink">Complete the Ensemble</h2>
              <p className="text-[13px] text-muted">Curated artisanal pairings from the same seasonal vat</p>
            </div>
            <Link href="/products" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent">
              Explore <Icon name="chevron_right" className="text-lg" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="overflow-hidden rounded-2xl border border-hairline bg-white"
              >
                <div className="aspect-[3/4] bg-accentWash">
                  <img src={p.images[0]?.url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="truncate text-[14px] font-medium text-ink">{p.name}</p>
                  <p className="mt-1 text-[14px] font-semibold text-ink">{formatINR(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <BottomNav active="/products" />
    </div>
  );
}
