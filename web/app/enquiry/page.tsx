'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '../../components/BottomNav';
import { Icon } from '../../components/Icon';
import { StoreHeader } from '../../components/StoreHeader';
import { UiButton } from '../../components/UiButton';
import { getProducts, getSettings } from '../../lib/api';
import { generateEnquiryPdf, type EnquiryPdfLine } from '../../lib/enquiryPdf';
import { formatINR, formatQty, formatUnitPrice } from '../../lib/format';
import { downloadPdf } from '../../lib/pdf';
import { getEnquiryLines, setEnquiryQty, removeFromEnquiry, useEnquiry } from '../../lib/store';
import type { Product, StoreSettings } from '../../lib/types';
import { slugFilename } from '../../lib/wishlistPdf';

interface ResolvedLine {
  product: Product;
  qty: number;
}

function buildWhatsAppMessage(
  lines: ResolvedLine[],
  total: number,
  name: string,
  phone: string,
  notes: string,
  businessName: string,
): string {
  const parts: string[] = [`Hello ${businessName},`, '', 'I would like to place an enquiry:', ''];
  lines.forEach((line, i) => {
    const subtotal = line.product.price * line.qty;
    parts.push(`${i + 1}. ${line.product.name}`);
    parts.push(`   SKU: ${line.product.sku}`);
    parts.push(
      `   ${formatQty(line.qty, line.product.unit)} × ${formatUnitPrice(line.product.price, line.product.unit)} = ${formatINR(subtotal)}`,
    );
    parts.push('');
  });
  parts.push(`Estimated Total: ${formatINR(total)}`, '');
  if (name.trim()) parts.push(`Name: ${name.trim()}`);
  if (phone.trim()) parts.push(`Phone: ${phone.trim()}`);
  if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
  return parts.join('\n');
}

export default function EnquiryPage() {
  const { lines, setQty, remove } = useEnquiry();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts().then(setProducts).catch(() => undefined);
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  const resolved: ResolvedLine[] = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return getEnquiryLines()
      .map((l) => {
        const product = byId.get(l.product_id);
        return product ? { product, qty: l.qty } : null;
      })
      .filter((x): x is ResolvedLine => x !== null);
  }, [lines, products]);

  const total = resolved.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const totalUnits = resolved.reduce((sum, l) => sum + l.qty, 0);

  const whatsappNumber = (settings?.whatsapp_number ?? '').replace(/\D/g, '');
  const businessName = settings?.business_name ?? 'Sea Birds Luxury Textiles';

  const waHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    buildWhatsAppMessage(resolved, total, name, phone, notes, businessName),
  )}`;

  const downloadAsPdf = async () => {
    setGenerating(true);
    setError('');
    try {
      const pdfLines: EnquiryPdfLine[] = resolved.map((l) => ({
        name: l.product.name,
        sku: l.product.sku,
        qty: l.qty,
        unit: l.product.unit,
        unit_price: l.product.price,
        subtotal: l.product.price * l.qty,
      }));
      const bytes = await generateEnquiryPdf({
        business_name: businessName,
        advisor_name: settings?.advisor_name ?? '',
        whatsapp_number: settings?.whatsapp_number ?? '',
        customer_name: name,
        customer_phone: phone,
        notes,
        lines: pdfLines,
        total,
      });
      downloadPdf(bytes, `${slugFilename(businessName)}-enquiry.pdf`);
    } catch {
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <StoreHeader title="Enquiry" showBack backHref="/" />

      <div className="mx-auto max-w-6xl px-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-ink">Enquiry Basket</h1>
            <p className="mt-1 text-[14px] text-muted" role="status">
              {resolved.length} product{resolved.length === 1 ? '' : 's'} selected
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accentWash px-3 py-1.5 text-[12px] font-medium text-accent">
            <Icon name="handshake" className="text-base" />
            Artisan Direct
          </span>
        </div>

        <div className="mt-4 rounded-2xl bg-accentWash p-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Icon name="storefront" className="text-xl text-accent" />
            Direct Weavers Desk
          </p>
          <p className="mt-1 text-[14px] leading-6 text-muted">
            Enquiries are sent directly to our master weavers & showroom team for wholesale or
            retail order confirmation. Nothing is charged online.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-[14px] text-error">
            {error}
          </p>
        )}

        {resolved.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-hairline bg-white p-10 text-center">
            <Icon name="shopping_bag" className="text-4xl text-faint" />
            <p className="mt-3 text-[16px] font-medium text-ink">Your enquiry basket is empty</p>
            <p className="mt-1 text-[14px] text-muted">
              Add weaves from the collection to start an enquiry.
            </p>
            <div className="mt-5">
              <UiButton href="/products">Browse the Collection</UiButton>
            </div>
          </div>
        ) : (
          <>
            <ul className="mt-6 flex flex-col gap-4">
              {resolved.map(({ product, qty }) => (
                <li
                  key={product.id}
                  className="flex gap-4 rounded-2xl border border-hairline bg-white p-4 shadow-airy"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-accentWash"
                  >
                    <img src={product.images[0]?.url} alt={product.name} className="h-full w-full object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-block rounded-full bg-accentWash px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps text-accent">
                          {product.unit === 'meter' ? 'Fabric' : product.yarn_label.split(' ')[2] ?? 'Silk'}
                        </span>
                        <h2 className="mt-1 truncate text-[15px] font-medium text-ink">{product.name}</h2>
                        <p className="mt-0.5 text-[12px] text-faint">Code: {product.sku}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        aria-label={`Remove ${product.name} from enquiry`}
                        className="text-muted hover:text-error"
                      >
                        <Icon name="delete" className="text-xl" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[12px] text-muted">
                          Unit: <span className="font-semibold text-ink">{formatUnitPrice(product.price, product.unit)}</span>
                        </p>
                        <div className="mt-1.5 inline-flex items-center gap-3 rounded-full border border-hairline px-2 py-1">
                          <button
                            type="button"
                            onClick={() => setQty(product.id, qty - 1)}
                            aria-label={`Decrease quantity of ${product.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-accentWash"
                          >
                            <Icon name="remove" className="text-lg" />
                          </button>
                          <span className="min-w-10 text-center text-[14px] font-semibold" aria-live="polite">
                            {formatQty(qty, product.unit)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(product.id, qty + 1)}
                            aria-label={`Increase quantity of ${product.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-accentWash"
                          >
                            <Icon name="add" className="text-lg" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-caps text-faint">Subtotal</p>
                        <p className="text-[18px] font-semibold text-ink">
                          {formatINR(product.price * qty)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <section className="mt-6 rounded-3xl border border-hairline bg-white p-6" aria-label="Enquiry summary">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-ink">Enquiry Summary</h2>
                <p className="text-[11px] font-semibold tracking-caps uppercase text-faint">Pre-invoice</p>
              </div>
              <dl className="mt-4 space-y-2 text-[14px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Total Selected Items</dt>
                  <dd className="text-right font-medium text-ink">
                    {resolved.length} distinct textile{resolved.length === 1 ? '' : 's'} ({totalUnits} units/meters)
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Artisan Weaving Hub</dt>
                  <dd className="text-right font-medium text-ink">Chanderi & Bagru Ateliers</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-end justify-between border-t border-hairline pt-4">
                <div>
                  <p className="text-[16px] font-semibold text-ink">Estimated Value</p>
                  <p className="text-[12px] text-faint">Taxes & freight calculated on confirmation</p>
                </div>
                <p className="text-[26px] font-semibold text-primary">{formatINR(total)}</p>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-hairline bg-white p-6" aria-label="Your details">
              <h2 className="text-[18px] font-semibold text-ink">Your Details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="enq-name" className="mb-1.5 block text-[13px] font-medium text-ink">
                    Full name
                  </label>
                  <input
                    id="enq-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
                  />
                </div>
                <div>
                  <label htmlFor="enq-phone" className="mb-1.5 block text-[13px] font-medium text-ink">
                    Phone / WhatsApp
                  </label>
                  <input
                    id="enq-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 …"
                    autoComplete="tel"
                    className="h-12 w-full rounded-xl border border-hairline bg-white px-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="enq-notes" className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-ink">
                  Custom Instructions & Specifications
                  <span className="text-[12px] font-normal text-faint">Optional</span>
                </label>
                <textarea
                  id="enq-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add custom weaving or dye requirements / GST details…"
                  className="w-full rounded-xl border border-hairline bg-white p-4 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentWash"
                />
              </div>
            </section>

            <div className="mt-6 flex flex-col gap-3">
              <UiButton variant="whatsapp" href={waHref} className="w-full">
                <Icon name="chat" className="text-xl" />
                Send Enquiry via WhatsApp
              </UiButton>
              <p className="flex items-center gap-1.5 text-[13px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-whatsapp" aria-hidden="true" />
                Instant response with stock confirmation & fabric video clips
              </p>
              <UiButton variant="secondary" onClick={downloadAsPdf} disabled={generating} className="w-full">
                <Icon name="picture_as_pdf" className="text-xl" />
                {generating ? 'Generating PDF…' : 'Download Enquiry as PDF'}
              </UiButton>
            </div>

            <p className="mt-6 flex items-center justify-center gap-4 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="verified" className="text-base" /> Authentic Handloom
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="local_shipping" className="text-base" /> Direct Showroom Dispatch
              </span>
            </p>
          </>
        )}
      </div>

      <BottomNav active="/enquiry" />
    </div>
  );
}
