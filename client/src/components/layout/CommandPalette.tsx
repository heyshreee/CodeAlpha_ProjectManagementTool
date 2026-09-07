import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import type { Task, Project, TaskPriority, TaskStatus } from '@/types';

interface SearchTask extends Task {
  project?: { id: string; name: string };
}

interface PaletteResult {
  tasks: SearchTask[];
  projects: Project[];
  users: { id: string; name: string; avatar?: string | null }[];
}

const actions = [
  { id: 'dashboard', label: 'Go to Dashboard', to: '/' },
  { id: 'mytasks', label: 'Go to My tasks', to: '/tasks' },
  { id: 'projects', label: 'Go to Projects', to: '/projects' },
  { id: 'calendar', label: 'Go to Calendar', to: '/calendar' },
  { id: 'notifications', label: 'Go to Notifications', to: '/notifications' },
  { id: 'settings', label: 'Go to Settings', to: '/settings' },
  { id: 'newproject', label: 'Create a new project', to: '/projects?new=1' },
];

interface Row {
  kind: 'action' | 'task' | 'project' | 'user';
  id: string;
  label: string;
  sub?: string;
  to: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PaletteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.get<PaletteResult>(`/analytics/search?q=${encodeURIComponent(query)}`);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  const rows = useMemo<Row[]>(() => {
    const base: Row[] = actions.map((a) => ({ kind: 'action', id: a.id, label: a.label, to: a.to }));
    if (projectId) {
      base.unshift({ kind: 'action', id: 'current-board', label: 'Go to current project board', to: `/projects/${projectId}/board` });
    }
    if (!results) return base;
    const taskRows: Row[] = results.tasks.map((t) => ({
      kind: 'task',
      id: t.id,
      label: t.title,
      sub: t.project?.name,
      to: `/projects/${t.projectId}/board?task=${t.id}`,
      priority: t.priority,
      status: t.status,
    }));
    const projectRows: Row[] = results.projects.map((p) => ({
      kind: 'project',
      id: p.id,
      label: p.name,
      sub: `${p._count?.tasks || 0} tasks`,
      to: `/projects/${p.id}/board`,
    }));
    const userRows: Row[] = results.users.map((u) => ({
      kind: 'user',
      id: u.id,
      label: u.name,
      sub: 'Member',
      to: '',
    }));
    return [...base, ...taskRows, ...projectRows, ...userRows];
  }, [results, projectId]);

  const filtered = useMemo(
    () => rows.filter((r) => !query.trim() || r.kind !== 'action' || r.label.toLowerCase().includes(query.toLowerCase())),
    [rows, query],
  );

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  function select(row: Row) {
    if (row.to) navigate(row.to);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = filtered[active];
      if (row) select(row);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface-2 border border-edge rounded-xl shadow-2xl animate-fade-in overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-edge">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, projects, people — or jump to an action…"
            aria-label="Command palette search"
            className="w-full bg-transparent py-3.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="shrink-0 inline-flex items-center rounded border border-edge px-1.5 py-0.5 text-[10px] text-slate-500">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {loading && <div className="px-4 py-6 text-center text-sm text-slate-500">Searching…</div>}
          {!loading && filtered.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">No commands or results found.</div>}
          {!loading && filtered.length > 0 && (
            <ul role="listbox" aria-label="Search results">
              {filtered.map((row, i) => (
                <li key={`${row.kind}-${row.id}`}>
                  <button
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(row)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                      i === active ? 'bg-brand-600/15 text-brand-200' : 'text-slate-300'
                    }`}
                  >
                    {row.kind === 'task' && row.status && <StatusBadge status={row.status} />}
                    {row.kind === 'task' && row.priority && <PriorityBadge priority={row.priority} />}
                    {row.kind === 'project' && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: (results?.projects.find((p) => p.id === row.id)?.color) || '#6366f1' }} />}
                    {(row.kind === 'action' || row.kind === 'user') && (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span className="flex-1 truncate">{row.label}</span>
                    {row.sub && <span className="text-xs text-slate-500 truncate max-w-[40%]">{row.sub}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-edge flex items-center gap-4 text-[10px] text-slate-600">
          <span><kbd className="border border-edge rounded px-1">↑</kbd> <kbd className="border border-edge rounded px-1">↓</kbd> navigate</span>
          <span><kbd className="border border-edge rounded px-1.5">↵</kbd> open</span>
          <span><kbd className="border border-edge rounded px-1.5">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}