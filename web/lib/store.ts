'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EnquiryLine } from './types';

const ENQUIRY_KEY = 'sb_enquiry_basket';
const DEVICE_KEY = 'sb_device_id';

type Listener = (lines: EnquiryLine[]) => void;
const listeners = new Set<Listener>();

function readLines(): EnquiryLine[] {
  try {
    const raw = localStorage.getItem(ENQUIRY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is EnquiryLine =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as EnquiryLine).product_id === 'string' &&
        typeof (x as EnquiryLine).qty === 'number',
    );
  } catch {
    return [];
  }
}

function writeLines(lines: EnquiryLine[]): void {
  try {
    localStorage.setItem(ENQUIRY_KEY, JSON.stringify(lines));
  } catch {
    // ignore; basket stays in memory for this session
  }
  listeners.forEach((fn) => fn(lines));
}

export function getEnquiryLines(): EnquiryLine[] {
  if (typeof window === 'undefined') return [];
  return readLines();
}

export function addToEnquiry(productId: string, qty = 1): void {
  const lines = readLines();
  const existing = lines.find((l) => l.product_id === productId);
  if (existing) {
    writeLines(lines.map((l) => (l.product_id === productId ? { ...l, qty: l.qty + qty } : l)));
  } else {
    writeLines([...lines, { product_id: productId, qty }]);
  }
}

export function setEnquiryQty(productId: string, qty: number): void {
  const lines = readLines();
  if (qty <= 0) {
    writeLines(lines.filter((l) => l.product_id !== productId));
  } else {
    writeLines(lines.map((l) => (l.product_id === productId ? { ...l, qty } : l)));
  }
}

export function removeFromEnquiry(productId: string): void {
  writeLines(readLines().filter((l) => l.product_id !== productId));
}

export function clearEnquiry(): void {
  writeLines([]);
}

export function moveToEnquiry(productId: string): void {
  addToEnquiry(productId, 1);
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'ephemeral';
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === ENQUIRY_KEY) listeners.forEach((fn) => fn(readLines()));
  });
}

export function useEnquiry(): {
  lines: EnquiryLine[];
  count: number;
  totalUnits: number;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
} {
  const [lines, setLines] = useState<EnquiryLine[]>(() => getEnquiryLines());

  useEffect(() => {
    const fn: Listener = (next) => setLines(next);
    listeners.add(fn);
    setLines(readLines());
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const add = useCallback((productId: string, qty = 1) => addToEnquiry(productId, qty), []);
  const setQty = useCallback((productId: string, qty: number) => setEnquiryQty(productId, qty), []);
  const remove = useCallback((productId: string) => removeFromEnquiry(productId), []);
  const clear = useCallback(() => clearEnquiry(), []);

  return {
    lines,
    count: lines.length,
    totalUnits: lines.reduce((sum, l) => sum + l.qty, 0),
    add,
    setQty,
    remove,
    clear,
  };
}
