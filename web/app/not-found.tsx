import Link from 'next/link';
import { StoreHeader } from '../components/StoreHeader';
import { UiButton } from '../components/UiButton';
import { Icon } from '../components/Icon';

export default function NotFound() {
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
