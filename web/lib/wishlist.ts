'use client';

import { useCallback, useEffect, useState } from 'react';

const WISHLIST_KEY = 'sb_wishlist';

type Listener = (ids: string[]) => void;
const listeners = new Set<Listener>();

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    // storage full or unavailable — wishlist stays in memory for this session
  }
  listeners.forEach((fn) => fn(ids));
}

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  return readIds();
}

export function isWishlisted(id: string): boolean {
  return getWishlist().includes(id);
}

export function addToWishlist(id: string): void {
  const ids = readIds();
  if (!ids.includes(id)) writeIds([...ids, id]);
}

export function removeFromWishlist(id: string): void {
  writeIds(readIds().filter((x) => x !== id));
}

export function toggleWishlist(id: string): boolean {
  const ids = readIds();
  const wished = !ids.includes(id);
  writeIds(wished ? [...ids, id] : ids.filter((x) => x !== id));
  return wished;
}

export function clearWishlist(): void {
  writeIds([]);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === WISHLIST_KEY) listeners.forEach((fn) => fn(readIds()));
  });
}

export function useWishlist(): {
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
} {
  const [ids, setIds] = useState<string[]>(() => getWishlist());

  useEffect(() => {
    const fn: Listener = (next) => setIds(next);
    listeners.add(fn);
    setIds(readIds());
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    toggleWishlist(id);
  }, []);
  const remove = useCallback((id: string) => {
    removeFromWishlist(id);
  }, []);
  const clear = useCallback(() => {
    clearWishlist();
  }, []);

  return {
    ids,
    count: ids.length,
    has: (id: string) => ids.includes(id),
    toggle,
    remove,
    clear,
  };
}
