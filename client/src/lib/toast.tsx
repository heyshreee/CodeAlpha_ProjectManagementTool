import { create } from 'zustand';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, type?: Toast['type']) => void;
  remove: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastHost() {
  const { toasts, remove } = useToastStore();
  const color = (type: string) =>
    type === 'success' ? 'bg-emerald-600/90' : type === 'error' ? 'bg-rose-600/90' : 'bg-slate-700/95';
  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={`${color(t.type)} text-white text-sm px-4 py-2.5 rounded-lg shadow-xl cursor-pointer animate-fade-in max-w-xs`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function toast(message: string, type: Toast['type'] = 'info') {
  useToastStore.getState().push(message, type);
}
