import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Task } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type ViewMode = 'month' | 'week' | 'agenda';

interface CalTask extends Task {
  project?: { id: string; name: string };
}

interface CalendarData {
  byMonth: Record<string, Record<string, CalTask[]>>;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date) {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // Monday-first
  s.setDate(s.getDate() - dow);
  return s;
}

function addDays(d: Date, n: number) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function dayLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function TaskPill({ t }: { t: CalTask }) {
  return (
    <Link
      to={`/projects/${t.projectId}/board?task=${t.id}`}
      className={`block text-[10px] leading-4 px-1 py-0.5 rounded truncate hover:opacity-80 ${
        t.status === 'DONE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-brand-600/20 text-brand-300'
      }`}
      title={t.title}
      aria-label={`Open task ${t.title}`}
    >
      {t.title}
    </Link>
  );
}

function TaskRow({ t, showProject = false }: { t: CalTask; showProject?: boolean }) {
  return (
    <Link
      to={`/projects/${t.projectId}/board?task=${t.id}`}
      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-surface-3/60 border border-edge hover:border-brand-500/40 transition"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-slate-200 truncate">{t.title}</span>
        {showProject && t.project && (
          <span className="block text-xs text-slate-500 mt-0.5 truncate">{t.project.name}</span>
        )}
      </span>
      <PriorityBadge priority={t.priority} />
      <StatusBadge status={t.status} />
    </Link>
  );
}

export default function Calendar() {
  const [view, setView] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => api.get<CalendarData>('/analytics/calendar'),
  });

  // Flatten { byMonth: { "YYYY-MM": { "day": tasks } } } into a per-day map.
  const byDay = useMemo(() => {
    const map = new Map<string, CalTask[]>();
    for (const [ym, days] of Object.entries(data?.byMonth || {})) {
      for (const [day, tasks] of Object.entries(days)) {
        map.set(`${ym}-${String(day).padStart(2, '0')}`, tasks);
      }
    }
    return map;
  }, [data]);

  const step = view === 'month' ? 1 : view === 'week' ? 7 : 7;
  const navigate = (dir: 1 | -1) => {
    if (view === 'month') {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    } else {
      setAnchor(addDays(anchor, dir * step));
    }
  };

  let title = '';
  if (view === 'month') {
    title = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } else if (view === 'week') {
    title = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } else {
    title = `${anchor.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} onward`;
  }

  // Month grid
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];

  // Week: Monday-first 7-day column layout for the anchored week.
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Agenda: the next 14 days starting at the anchor.
  const agendaDays = Array.from({ length: 14 }, (_, i) => addDays(anchor, i));

  return (
    <div className="p-4 sm:p-5 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-300 mb-1">Schedule</p>
          <h1 className="text-2xl leading-none font-semibold text-slate-100">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex gap-0.5 rounded-md border border-edge bg-surface-2 p-0.5"
            role="tablist"
            aria-label="Calendar view"
          >
            {(['month', 'week', 'agenda'] as ViewMode[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded px-2.5 py-1.5 text-xs font-medium capitalize transition ${
                  view === v ? 'bg-surface-3 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => navigate(-1)}
              aria-label="Previous"
              className="px-2.5 py-1.5 bg-surface-3 border border-edge rounded-md text-[13px] hover:bg-surface-3/70"
            >
              &larr;
            </button>
            <button
              onClick={() => setAnchor(startOfDay(new Date()))}
              className="px-2.5 py-1.5 bg-surface-3 border border-edge rounded-md text-[13px] hover:bg-surface-3/70"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              aria-label="Next"
              className="px-2.5 py-1.5 bg-surface-3 border border-edge rounded-md text-[13px] hover:bg-surface-3/70"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size={24} />
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-8 text-center text-[13px] text-slate-300">
          We couldn&apos;t load your calendar. The backend may be unavailable.
        </div>
      )}
      {!isLoading && !isError && view === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-0.5">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[11px] text-slate-500 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={i} className="min-h-[64px] rounded-md border border-transparent" />;
              }
              const date = new Date(year, month, day);
              const key = isoKey(date);
              const tasks = byDay.get(key) || [];
              const isToday = isoKey(date) === isoKey(new Date());
              return (
                <div
                  key={i}
                  className={`min-h-[64px] rounded-md border p-1 bg-surface-2 border-edge ${isToday ? 'ring-1 ring-brand-500' : ''}`}
                >
                  <div className={`text-[11px] font-medium leading-4 mb-0.5 ${isToday ? 'text-brand-300' : 'text-slate-400'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {tasks.slice(0, 3).map((t) => (
                      <TaskPill key={t.id} t={t} />
                    ))}
                    {tasks.length > 3 && (
                      <div className="text-[10px] text-slate-500">+{tasks.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!isLoading && !isError && view === 'week' && (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const tasks = byDay.get(isoKey(d)) || [];
            const isToday = isoKey(d) === isoKey(new Date());
            return (
              <div
                key={isoKey(d)}
                className={`rounded-md border p-1.5 bg-surface-2 border-edge min-h-[120px] ${isToday ? 'ring-1 ring-brand-500' : ''}`}
              >
                <div className="mb-1">
                  <div className={`text-xs font-semibold ${isToday ? 'text-brand-300' : 'text-slate-300'}`}>{dayLabel(d)}</div>
                  <div className="text-[10px] text-slate-600">{sameMonth(d, anchor) ? '' : d.toLocaleDateString(undefined, { month: 'short' })}</div>
                </div>
                <div className="space-y-0.5">
                  {tasks.map((t) => (
                    <TaskPill key={t.id} t={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && view === 'agenda' && (
        <div className="overflow-hidden rounded-lg border border-edge bg-surface-2">
          {agendaDays.every((d) => (byDay.get(isoKey(d)) || []).length === 0) && (
            <div className="p-8 text-center text-sm text-slate-500">
              No tasks with due dates in the next two weeks.
            </div>
          )}
          {agendaDays.map((d) => {
            const tasks = byDay.get(isoKey(d)) || [];
            if (tasks.length === 0) return null;
            const isToday = isoKey(d) === isoKey(new Date());
            return (
              <div key={isoKey(d)} className="border-b border-edge last:border-0">
                <div className="px-3 py-1.5 bg-surface-3/40 border-b border-edge flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isToday ? 'text-brand-300' : 'text-slate-300'}`}>
                    {d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                  {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-medium">Today</span>}
                  <span className="ml-auto text-xs text-slate-600">{tasks.length} task{tasks.length > 1 ? 's' : ''}</span>
                </div>
                <div className="p-1.5 space-y-1">
                  {tasks.map((t) => (
                    <TaskRow key={t.id} t={t} showProject />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}