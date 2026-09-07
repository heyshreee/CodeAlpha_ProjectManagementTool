import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

const base =
  'w-full bg-surface-2 border border-edge rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-500/60 transition';

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${base} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${base} resize-y ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${base} ${className}`} {...rest}>
      {children}
    </select>
  );
}

interface FieldProps {
  label?: string;
  children: React.ReactNode;
  error?: string;
}

export function Field({ label, children, error }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="block text-xs font-medium text-slate-400">{label}</span>}
      {children}
      {error && <span className="block text-xs text-rose-400">{error}</span>}
    </label>
  );
}
