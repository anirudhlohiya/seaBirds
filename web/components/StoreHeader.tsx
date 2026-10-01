'use client';

import Link from 'next/link';
import { useEnquiry } from '../lib/store';
import { useWishlist } from '../lib/wishlist';
import { Icon } from './Icon';

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}

export function StoreHeader({
  title,
  showBack = false,
  backHref = '/',
}: {
  title?: string;
  showBack?: boolean;
  backHref?: string;
}) {
  const { count: wishlistCount } = useWishlist();
  const { count: enquiryCount } = useEnquiry();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-hairline bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
        {showBack ? (
          <Link href={backHref} aria-label="Go back" className="text-ink">
            <Icon name="arrow_back" className="text-2xl" />
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2" aria-label="Sea Birds home">
            <img src="/logo.svg" alt="Sea Birds" className="h-7 w-auto" />
          </Link>
        )}
        {title ? (
          <h1 className="flex-1 text-center text-[17px] font-semibold text-ink">{title}</h1>
        ) : (
          <p className="flex-1 text-[11px] font-semibold tracking-caps uppercase text-muted">
            Sea Birds Home
          </p>
        )}
        <nav className="flex items-center gap-4" aria-label="Quick actions">
          <Link href="/wishlist" aria-label={`Wishlist, ${wishlistCount} items`} className="relative text-ink">
            <Icon name="favorite" className="text-2xl" />
            <CountBadge count={wishlistCount} />
          </Link>
          <Link href="/enquiry" aria-label={`Enquiry basket, ${enquiryCount} items`} className="relative text-ink">
            <Icon name="shopping_bag" className="text-2xl" />
            <CountBadge count={enquiryCount} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
