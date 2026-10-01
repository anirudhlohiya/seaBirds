'use client';

import { useEffect, useState } from 'react';
import { BottomNav } from '../../components/BottomNav';
import { Icon } from '../../components/Icon';
import { StoreHeader } from '../../components/StoreHeader';
import { Toggle } from '../../components/Toggle';
import { UiButton } from '../../components/UiButton';
import { getCatalogueEditions, getSettings } from '../../lib/api';
import type { CatalogueEdition } from '../../lib/types';

type Scope = 'master' | 'category' | 'new-arrivals';

const SCOPES: { label: string; hint: string; value: Scope }[] = [
  { label: 'Entire Master Catalogue', hint: 'Every active weave, all categories', value: 'master' },
  { label: 'Specific Category', hint: 'One craft family, e.g. Heritage Sarees', value: 'category' },
  { label: 'New Arrivals Lookbook', hint: 'This season’s freshest weaves', value: 'new-arrivals' },
];

function EditionCard({
  edition,
  whatsappNumber,
  siteUrl,
}: {
  edition: CatalogueEdition;
  whatsappNumber: string;
  siteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const webLink = `${siteUrl.replace(/\/$/, '')}${edition.file_url}`;

  const shareText = encodeURIComponent(
    `Hello, please find the Sea Birds catalogue "${edition.title}" (${edition.volume}): ${webLink}`,
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(webLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-airy">
      <div className="flex gap-5 p-5">
        <div className="h-36 w-28 shrink-0 overflow-hidden rounded-2xl bg-accentWash">
          <img src={edition.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-caps uppercase text-accent">{edition.volume}</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-6 text-ink">{edition.title}</h2>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-muted">{edition.description}</p>
          <p className="mt-2 text-[12px] text-faint">
            PDF • {edition.file_size_mb} MB
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-hairline border-t border-hairline">
        <a
          href={edition.file_url}
          download
          className="flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-medium text-accent hover:bg-accentWash"
        >
          <Icon name="download" className="text-lg" />
          Download
        </a>
        <a
          href={`https://wa.me/${whatsappNumber}?text=${shareText}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-medium text-ink hover:bg-surface"
        >
          <Icon name="chat" className="text-lg text-whatsapp" />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-medium text-ink hover:bg-surface"
        >
          <Icon name={copied ? 'check' : 'link'} className="text-lg" />
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </article>
  );
}

export default function CataloguePage() {
  const [editions, setEditions] = useState<CatalogueEdition[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [scope, setScope] = useState<Scope>('master');
  const [includeTiers, setIncludeTiers] = useState(true);
  const [includeSpecs, setIncludeSpecs] = useState(true);
  const [includeContact, setIncludeContact] = useState(true);

  useEffect(() => {
    getCatalogueEditions().then(setEditions).catch(() => undefined);
    getSettings()
      .then((s) => setWhatsappNumber(s.whatsapp_number.replace(/\D/g, '')))
      .catch(() => undefined);
    setSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin);
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <StoreHeader title="Catalogue" showBack backHref="/" />

      <div className="mx-auto max-w-6xl px-5 pt-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Catalogue Library</h1>
        <p className="mt-1 text-[14px] text-muted">
          Auto-generated editions, refreshed from the live collection.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {editions.map((edition) => (
            <EditionCard
              key={edition.id}
              edition={edition}
              whatsappNumber={whatsappNumber}
              siteUrl={siteUrl}
            />
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-hairline bg-white p-6" aria-label="Export configuration">
          <h2 className="text-[18px] font-semibold text-ink">Export Configuration</h2>
          <p className="mt-1 text-[13px] text-muted">
            Prefer a tailored edition? Ask the concierge — these preferences shape the next
            auto-generated catalogue in our studio.
          </p>

          <div className="mt-5">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-caps text-muted">Scope</p>
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
                    name="catalogue-scope"
                    value={s.value}
                    checked={scope === s.value}
                    onChange={() => setScope(s.value)}
                    className="mt-1 accent-[#0D5C75]"
                  />
                  <span>
                    <span className="block text-[14px] font-medium text-ink">{s.label}</span>
                    <span className="block text-[13px] text-muted">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 divide-y divide-hairline rounded-2xl border border-hairline">
            {[
              { label: 'Wholesale & bulk price tiers', hint: 'Retail / 10+ pcs / 50+ pcs', value: includeTiers, set: setIncludeTiers },
              { label: 'Fabric specifications & details', hint: 'Composition, weave, dimensions', value: includeSpecs, set: setIncludeSpecs },
              { label: 'Showroom contact & WhatsApp', hint: 'Concierge line on every page', value: includeContact, set: setIncludeContact },
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

          <div className="mt-5">
            <UiButton
              variant="whatsapp"
              className="w-full"
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                `Hello Sea Birds, please share a catalogue with me.\nScope: ${SCOPES.find((s) => s.value === scope)?.label}\nBulk tiers: ${includeTiers ? 'yes' : 'no'}\nFabric specs: ${includeSpecs ? 'yes' : 'no'}\nShowroom contact: ${includeContact ? 'yes' : 'no'}`,
              )}`}
            >
              <Icon name="chat" className="text-xl" />
              Request Tailored Catalogue on WhatsApp
            </UiButton>
          </div>
        </section>
      </div>

      <BottomNav active="/" />
    </div>
  );
}
