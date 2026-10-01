import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'whatsapp' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-primary',
  secondary: 'bg-white text-ink border border-hairline hover:border-accent',
  whatsapp: 'bg-whatsapp text-white font-semibold shadow-airy',
  ghost: 'bg-transparent text-accent hover:bg-accentWash',
};

interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  href?: string;
  children: ReactNode;
}

export function UiButton({ variant = 'primary', href, children, className = '', ...rest }: UiButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl h-12 px-6 text-[15px] font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
