import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-500 hover:bg-brand-400 text-white border border-brand-400/40 shadow-sm shadow-brand-900/30',
  secondary: 'bg-surface-3 hover:bg-surface-3/70 text-slate-200 border border-edge',
  ghost: 'bg-transparent hover:bg-surface-3/60 text-slate-300 border border-transparent',
  danger: 'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-500/40',
  subtle: 'bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30',
};

const sizes: Record<Size, string> = {
  sm: 'text-xs px-2.5 h-8 rounded-md',
  md: 'text-[13px] px-3.5 h-9 rounded-md',
  lg: 'text-sm px-4 h-10 rounded-md',
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
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
