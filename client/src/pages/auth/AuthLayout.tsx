import type { ReactNode } from 'react';

export default function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-full flex items-center justify-center p-4 sm:p-6 bg-surface surface-grid">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg">
              PF
            </div>
            <span className="text-xl font-bold text-slate-100">ProjectFlow</span>
          </div>
          <p className="text-sm text-slate-400">Real-time collaborative project management</p>
        </div>
        <div className="bg-surface-2/95 border border-edge rounded-xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          <h1 className="text-lg font-semibold text-slate-100 mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mb-5">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
