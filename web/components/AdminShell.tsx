'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { adminLogout, isAdminAuthed } from '../lib/api';
import { Icon } from './Icon';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/products', label: 'Products', icon: 'inventory_2' },
  { href: '/admin/categories', label: 'Categories', icon: 'category' },
  { href: '/admin/catalogue', label: 'Catalogue', icon: 'picture_as_pdf' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAdminAuthed()) {
      router.replace('/admin/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-muted">Checking session…</p>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const handleLogout = () => {
    adminLogout();
    router.replace('/admin/login');
  };

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed left-0 top-0 hidden h-full w-60 flex-col border-r border-hairline bg-white p-5 md:flex">
        <div className="flex items-center gap-2 px-1">
          <img src="/logo.svg" alt="Sea Birds" className="h-8 w-auto" />
          <div>
            <p className="text-[11px] font-semibold tracking-caps uppercase text-muted">Admin Portal</p>
            <p className="text-[15px] font-semibold text-ink">Weave Master</p>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition ${
                isActive(item.href) ? 'bg-accentWash text-accent' : 'text-muted hover:bg-surface'
              }`}
            >
              <Icon name={item.icon} className="text-xl" filled={isActive(item.href)} />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-error hover:bg-[#ffdad6]/50"
        >
          <Icon name="logout" className="text-xl" />
          Sign out
        </button>
      </aside>

      <div className="md:pl-60">
        <div className="no-print flex items-center justify-between border-b border-hairline bg-white/95 px-5 py-3 backdrop-blur-md md:hidden">
          <img src="/logo.svg" alt="Sea Birds" className="h-7 w-auto" />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="text-muted"
          >
            <Icon name="logout" className="text-2xl" />
          </button>
        </div>
        <main className="mx-auto max-w-5xl px-5 pb-28 pt-6 md:pb-12">{children}</main>
      </div>

      <nav
        aria-label="Admin"
        className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-hairline bg-white/95 backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                isActive(item.href) ? 'text-accent' : 'text-muted'
              }`}
            >
              <Icon name={item.icon} className="text-2xl" filled={isActive(item.href)} />
              {item.label}
              {isActive(item.href) && <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
