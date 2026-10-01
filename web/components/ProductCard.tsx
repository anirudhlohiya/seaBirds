'use client';

import Link from 'next/link';
import { discountPct, formatUnitPrice } from '../lib/format';
import { addToEnquiry } from '../lib/store';
import type { Product } from '../lib/types';
import { useWishlist } from '../lib/wishlist';
import { Badge } from './Badge';
import { Icon } from './Icon';

export function ProductCard({ product }: { product: Product }) {
  const { has, toggle } = useWishlist();
  const wished = has(product.id);
  const pct = discountPct(product.mrp, product.price);

  return (
    <article className="group overflow-hidden rounded-2xl border border-hairline bg-white shadow-airy transition hover:shadow-float">
      <div className="relative aspect-[3/4] overflow-hidden bg-accentWash">
        <Link href={`/products/${product.slug}`} aria-label={product.name}>
          <img
            src={product.images[0]?.url ?? '/images/products/sea-mist.svg'}
            alt={product.images[0]?.alt_text ?? product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.is_new && <Badge>New</Badge>}
          {product.is_bestseller && <Badge variant="outline">Bestseller</Badge>}
        </div>
        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink backdrop-blur transition hover:text-error"
        >
          <Icon name="favorite" className="text-xl" filled={wished} />
        </button>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-medium tracking-wide text-muted">{product.yarn_label}</p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-medium leading-6 text-ink hover:text-accent">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-[16px] font-semibold text-ink">
            {formatUnitPrice(product.price, product.unit)}
          </p>
          {pct > 0 && (
            <p className="text-[13px] text-faint line-through">{formatUnitPrice(product.mrp, product.unit)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addToEnquiry(product.id, 1)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-[13px] font-medium text-accent transition hover:border-accent hover:bg-accentWash"
        >
          <Icon name="add" className="text-lg" />
          Enquiry
        </button>
      </div>
    </article>
  );
}
