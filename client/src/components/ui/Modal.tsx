import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-md'} bg-surface-2 border border-edge rounded-xl shadow-2xl animate-fade-in`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-edge flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
