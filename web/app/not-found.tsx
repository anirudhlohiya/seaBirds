'use client';

import { useEffect, useState } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { UiButton } from '../components/UiButton';
import { Icon } from '../components/Icon';
import { ProductDetail } from './products/[slug]/detail';

function NotFoundView() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <StoreHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accentWash text-accent">
            <Icon name="explore_off" className="text-4xl" />
          </div>
          <span className="mt-6 inline-block rounded-full bg-accentWash px-3 py-1 text-[11px] font-semibold uppercase tracking-caps text-accent">
            404 Error
          </span>
          <h1 className="mt-3 text-[32px] font-bold tracking-tight text-ink">
            Page not found
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            The page you are looking for might have been moved, deleted, or does not exist.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <UiButton href="/">
              <Icon name="home" className="text-xl" />
              Return Home
            </UiButton>
            <UiButton variant="secondary" href="/products">
              <Icon name="inventory_2" className="text-xl" />
              Browse Collections
            </UiButton>
          </div>
        </div>
      </main>
    </div>
  );
}

// The site is static, so products added after the last build have no page of their own yet.
// Their links land here; load the product by its slug instead of showing a 404.
export default function NotFound() {
  const [slug, setSlug] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/products\/([^/]+)\/?$/);
    setSlug(match ? decodeURIComponent(match[1]) : null);
  }, []);

  if (slug === undefined) return null;
  return slug ? <ProductDetail slug={slug} missingView={<NotFoundView />} /> : <NotFoundView />;
}
