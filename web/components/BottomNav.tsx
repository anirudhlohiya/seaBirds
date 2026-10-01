'use client';

import Link from 'next/link';
import { useEnquiry } from '../lib/store';
import { useWishlist } from '../lib/wishlist';
import { Icon } from './Icon';

const ITEMS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/products', label: 'Products', icon: 'grid_view' },
  { href: '/wishlist', label: 'Wishlist', icon: 'favorite' },
  { href: '/enquiry', label: 'Enquiry', icon: 'shopping_bag' },
];

export function BottomNav({ active }: { active: string }) {
  const { count: wishlistCount } = useWishlist();
  const { count: enquiryCount } = useEnquiry();

  const badgeFor = (href: string): number => {
    if (href === '/wishlist') return wishlistCount;
    if (href === '/enquiry') return enquiryCount;
    return 0;
  };

  return (
    <nav
      aria-label="Primary"
      className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-hairline bg-white/95 backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-4">
        {ITEMS.map((item) => {
          const isActive = active === item.href;
          const badge = badgeFor(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              <span className="relative">
                <Icon name={item.icon} className="text-2xl" filled={isActive} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </span>
              {item.label}
              {isActive && <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
