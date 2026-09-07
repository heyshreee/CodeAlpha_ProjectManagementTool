import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white border border-brand-500/40',
  secondary: 'bg-surface-3 hover:bg-surface-3/70 text-slate-200 border border-edge',
  ghost: 'bg-transparent hover:bg-surface-3/60 text-slate-300 border border-transparent',
  danger: 'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-500/40',
  subtle: 'bg-brand-600/10 hover:bg-brand-600/20 text-brand-300 border border-brand-600/30',
};

const sizes: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 rounded-md',
  md: 'text-sm px-3.5 py-2 rounded-lg',
  lg: 'text-sm px-5 py-2.5 rounded-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
