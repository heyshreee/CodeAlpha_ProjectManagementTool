import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import type { Task, Project } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { Link } from 'react-router-dom';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState<{ tasks: Task[]; projects: Project[]; users: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.get<{ tasks: Task[]; projects: Project[]; users: any[] }>(
          `/analytics/search?q=${encodeURIComponent(q)}`
        );
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="p-4 sm:p-5 max-w-3xl">
      <h1 className="text-2xl sm:text-[28px] leading-tight font-semibold text-slate-100 mb-3">Search</h1>
      <Input
        autoFocus
        value={q}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})}
        placeholder="Search tasks, projects, people... (e.g. JWT)"
        className="mb-4"
      />

      {loading && <div className="flex justify-center py-8"><Spinner size={20} /></div>}

      {!loading && q.trim() && results && (
        <div className="space-y-4">
          <section>
            <h2 className="text-[13px] font-semibold text-slate-300 mb-2">Tasks ({results.tasks.length})</h2>
            <div className="space-y-1.5">
              {results.tasks.map((t) => (
                <Link
                  key={t.id}
                  to={`/projects/${t.projectId}/board?task=${t.id}`}
                  className="flex items-center gap-3 bg-surface-2 border border-edge rounded-md px-3 py-2 hover:border-brand-500/40 transition"
                >
                  <span className="text-xs text-slate-500 font-mono">#{t.id.slice(-4).toUpperCase()}</span>
                  <span className="flex-1 text-[13px] text-slate-200 truncate">{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </Link>
              ))}
              {results.tasks.length === 0 && <div className="text-[13px] text-slate-500">No tasks found</div>}
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold text-slate-300 mb-2">Projects ({results.projects.length})</h2>
            <div className="space-y-1.5">
              {results.projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}/board`}
                  className="flex items-center gap-3 bg-surface-2 border border-edge rounded-md px-3 py-2 hover:border-brand-500/40 transition"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color || '#6366f1' }} />
                  <span className="flex-1 text-[13px] text-slate-200">{p.name}</span>
                  <span className="text-xs text-slate-500">{p._count?.tasks || 0} tasks</span>
                </Link>
              ))}
              {results.projects.length === 0 && <div className="text-[13px] text-slate-500">No projects found</div>}
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold text-slate-300 mb-2">People ({results.users.length})</h2>
            <div className="space-y-1.5">
              {results.users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 bg-surface-2 border border-edge rounded-md px-3 py-2">
                  <span className="text-[13px] text-slate-200">{u.name}</span>
                  <span className="text-xs text-slate-500">{u.email}</span>
                </div>
              ))}
              {results.users.length === 0 && <div className="text-[13px] text-slate-500">No users found</div>}
            </div>
          </section>
        </div>
      )}

      {!q.trim() && (
        <div className="text-sm text-slate-500 py-8 text-center">Type a query to search across your projects.</div>
      )}
    </div>
  );
}
