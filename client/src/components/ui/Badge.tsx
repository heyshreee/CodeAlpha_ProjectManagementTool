const priorityStyles: Record<string, string> = {
  URGENT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  HIGH: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  MEDIUM: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  LOW: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const statusStyles: Record<string, string> = {
  BACKLOG: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  TODO: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
  IN_PROGRESS: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  DONE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: string }) {
  const style =
    tone === 'priority'
      ? priorityStyles[String(children)] || priorityStyles.MEDIUM
      : tone === 'status'
      ? statusStyles[String(children)] || statusStyles.TODO
      : 'bg-surface-3 text-slate-400 border-edge';
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium border ${style}`}
    >
      {children}
    </span>
  );
}
