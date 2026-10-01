const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inrFormatter.format(value);
}

export function formatUnitPrice(price: number, unit: 'piece' | 'meter'): string {
  return unit === 'meter' ? `${formatINR(price)}/m` : formatINR(price);
}

export function discountPct(mrp: number, price: number): number {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function formatQty(qty: number, unit: 'piece' | 'meter'): string {
  return unit === 'meter' ? `${qty} m` : `${qty} pc${qty === 1 ? '' : 's'}`;
}
