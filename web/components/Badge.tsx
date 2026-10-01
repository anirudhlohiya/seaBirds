import type { ReactNode } from 'react';

type Variant = 'filled' | 'outline' | 'error' | 'wash';

const VARIANTS: Record<Variant, string> = {
  filled: 'bg-accentWash text-accent',
  outline: 'bg-white text-ink border border-hairline',
  error: 'bg-[#ffdad6] text-error',
  wash: 'bg-white/90 text-ink backdrop-blur',
};

export function Badge({
  variant = 'filled',
  children,
  className = '',
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full py-1 px-3 text-[11px] font-semibold tracking-caps uppercase ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
