import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar() {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;

  const { data, isLoading } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => api.get<{ byMonth: Record<string, Record<string, any[]>> }>('/analytics/calendar'),
  });

  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const byDay = data?.byMonth?.[key] || {};
  const numDays = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-100">{monthLabel}</h1>
        <div className="flex gap-2">
          <button onClick={() => setMonthOffset((o) => o - 1)} className="px-3 py-1.5 bg-surface-3 border border-edge rounded-lg text-sm hover:bg-surface-3/70">&larr;</button>
          <button onClick={() => setMonthOffset(0)} className="px-3 py-1.5 bg-surface-3 border border-edge rounded-lg text-sm hover:bg-surface-3/70">Today</button>
          <button onClick={() => setMonthOffset((o) => o + 1)} className="px-3 py-1.5 bg-surface-3 border border-edge rounded-lg text-sm hover:bg-surface-3/70">&rarr;</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs text-slate-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const tasks = day ? byDay[day] || [] : [];
              const isToday = day === now.getDate() && monthOffset === 0;
              return (
                <div
                  key={i}
                  className={`min-h-[90px] rounded-lg border p-1.5 ${
                    day ? 'bg-surface-2 border-edge' : 'border-transparent'
                  } ${isToday ? 'ring-1 ring-brand-500' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-1 ${isToday ? 'text-brand-300' : 'text-slate-400'}`}>{day}</div>
                      <div className="space-y-1">
                        {tasks.slice(0, 3).map((t: any) => (
                          <Link
                            key={t.id}
                            to={`/projects/${t.projectId}/board?task=${t.id}`}
                            className={`block text-[10px] px-1 py-0.5 rounded truncate hover:opacity-80 ${
                              t.status === 'DONE'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-brand-600/20 text-brand-300'
                            }`}
                          >
                            {t.title}
                          </Link>
                        ))}
                        {tasks.length > 3 && <div className="text-[10px] text-slate-500">+{tasks.length - 3} more</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
