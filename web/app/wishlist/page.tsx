'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '../../components/BottomNav';
import { Badge } from '../../components/Badge';
import { Icon } from '../../components/Icon';
import { StoreHeader } from '../../components/StoreHeader';
import { UiButton } from '../../components/UiButton';
import { getProducts, getSettings } from '../../lib/api';
import { formatUnitPrice } from '../../lib/format';
import { addToEnquiry } from '../../lib/store';
import type { Product } from '../../lib/types';
import { useWishlist } from '../../lib/wishlist';
import { downloadPdf } from '../../lib/pdf';
import { generateWishlistPdf, slugFilename } from '../../lib/wishlistPdf';

function stockBadge(product: Product) {
  switch (product.stock_status) {
    case 'in_stock':
      return <Badge>In Stock</Badge>;
    case 'low':
      return <Badge variant="error">Low Stock</Badge>;
    case 'made_to_order':
      return <Badge variant="outline">Made to Order</Badge>;
    default:
      return <Badge variant="error">Unavailable</Badge>;
  }
}

export default function WishlistPage() {
  const { ids, remove } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [businessName, setBusinessName] = useState('Sea Birds Luxury Textiles');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts().then(setProducts).catch(() => undefined);
    getSettings().then((s) => setBusinessName(s.business_name)).catch(() => undefined);
  }, []);

  const saved = useMemo(
    () => ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => Boolean(p)),
    [ids, products],
  );

  const moveToEnquiry = (id: string) => {
    addToEnquiry(id, 1);
    remove(id);
  };

  const shareAsPdf = async () => {
    setGenerating(true);
    setError('');
    try {
      const bytes = await generateWishlistPdf({
        business_name: businessName,
        products: saved.map((p) => ({
          name: p.name,
          sku: p.sku,
          price: p.price,
          unit: p.unit,
          image_url: p.images[0]?.url ?? '',
          yarn_label: p.yarn_label,
        })),
      });
      downloadPdf(bytes, `${slugFilename(businessName)}-wishlist.pdf`);
    } catch {
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <StoreHeader title="Wishlist" showBack backHref="/" />

      <div className="mx-auto max-w-6xl px-5 pt-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Saved Weaves</h1>
        <p className="mt-1 text-[14px] text-muted" role="status">
          {saved.length} textile{saved.length === 1 ? '' : 's'} saved on this device
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
            {error}
          </p>
        )}

        {saved.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-hairline bg-white p-10 text-center">
            <Icon name="favorite" className="text-4xl text-faint" />
            <p className="mt-3 text-[16px] font-medium text-ink">Your wishlist is empty</p>
            <p className="mt-1 text-[14px] text-muted">
              Tap the heart on any weave to save it here.
            </p>
            <div className="mt-5">
              <UiButton href="/products">Browse the Collection</UiButton>
            </div>
          </div>
        ) : (
          <>
            <ul className="mt-6 flex flex-col gap-4">
              {saved.map((p) => (
                <li
                  key={p.id}
                  className="flex gap-4 rounded-2xl border border-hairline bg-white p-4 shadow-airy"
                >
                  <Link href={`/products/${p.slug}`} className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-accentWash">
                    <img src={p.images[0]?.url} alt={p.name} className="h-full w-full object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/products/${p.slug}`}>
                          <h2 className="truncate text-[15px] font-medium text-ink hover:text-accent">
                            {p.name}
                          </h2>
                        </Link>
                        <p className="mt-0.5 text-[12px] text-faint">{p.sku}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        aria-label={`Remove ${p.name} from wishlist`}
                        className="text-muted hover:text-error"
                      >
                        <Icon name="delete" className="text-xl" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {stockBadge(p)}
                      <p className="text-[15px] font-semibold text-ink">
                        {formatUnitPrice(p.price, p.unit)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => moveToEnquiry(p.id)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-1.5 text-[13px] font-medium text-accent hover:border-accent hover:bg-accentWash"
                    >
                      <Icon name="shopping_bag" className="text-base" />
                      Move to Enquiry
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <UiButton variant="secondary" onClick={shareAsPdf} disabled={generating} className="w-full">
                <Icon name="picture_as_pdf" className="text-xl" />
                {generating ? 'Generating PDF…' : 'Share Wishlist as Curated PDF'}
              </UiButton>
            </div>
          </>
        )}
      </div>

      <BottomNav active="/wishlist" />
    </div>
  );
}
