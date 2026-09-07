import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Notification } from '@/types';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';

function groupLabel(date: string) {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (value.toDateString() === today.toDateString()) return 'Today';
  if (value.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'assigned', label: 'Assignments' },
  { id: 'mentions', label: 'Mentions' },
] as const;
type FilterId = typeof filters[number]['id'];

function matchesFilter(n: Notification, filter: FilterId) {
  if (filter === 'unread') return n.status === 'UNREAD';
  if (filter === 'assigned') return n.type === 'TASK_ASSIGNED';
  if (filter === 'mentions') return n.type === 'COMMENT_MENTION';
  return true;
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterId>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
  });
  const groups = useMemo(() => {
    const result: Record<string, Notification[]> = { Today: [], Yesterday: [], Earlier: [] };
    (data?.notifications || [])
      .filter((n) => matchesFilter(n, filter))
      .forEach((notification) => result[groupLabel(notification.createdAt)].push(notification));
    return result;
  }, [data?.notifications, filter]);

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch { /* The bell remains usable if a single notification update fails. */ }
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch { /* The error state is represented by the unchanged unread count. */ }
  }

  async function openNotification(n: Notification) {
    if (n.status === 'UNREAD') await markRead(n.id);
    if (n.taskId && n.projectId) {
      navigate(`/projects/${n.projectId}/board?task=${n.taskId}`);
    } else if (n.projectId) {
      navigate(`/projects/${n.projectId}/board`);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-300 mb-2">Workspace activity</p><h1 className="text-2xl font-semibold text-slate-100">Notifications</h1><p className="text-sm text-slate-400 mt-1">Stay close to assignments, comments, and deadlines.</p></div>
        {!!data?.unreadCount && <Button variant="secondary" size="sm" onClick={markAllRead}>Mark all read</Button>}
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-edge bg-surface-2 p-1 mb-5 w-fit">
        {filters.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === item.id ? 'bg-surface-3 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {isLoading && <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 rounded-xl bg-surface-2 border border-edge animate-pulse" />)}</div>}
      {isError && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-8 text-center"><p className="text-slate-200 font-medium">We couldn&apos;t load notifications.</p><button onClick={() => refetch()} className="mt-3 text-sm text-brand-300 hover:text-brand-200">Try again</button></div>}
      {!isLoading && !isError && data?.notifications.length === 0 && <div className="rounded-xl border border-dashed border-edge p-12 text-center text-slate-500">You&apos;re all caught up.</div>}
      {!isLoading && !isError && data && data.notifications.length > 0 && Object.values(groups).every((items) => items.length === 0) && (
        <div className="rounded-xl border border-dashed border-edge p-12 text-center text-slate-500">Nothing in this view.</div>
      )}
      {!isLoading && !isError && Object.entries(groups).map(([label, items]) => items.length > 0 && <section key={label} className="mb-7"><h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">{label}</h2><div className="overflow-hidden rounded-xl border border-edge bg-surface-2">{items.map((notification) => <button key={notification.id} onClick={() => openNotification(notification)} className={`w-full flex items-start gap-3 text-left px-4 py-4 border-b last:border-b-0 border-edge hover:bg-surface-3/60 transition ${notification.status === 'UNREAD' ? 'bg-brand-500/5' : ''}`}><span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${notification.status === 'UNREAD' ? 'bg-brand-400' : 'bg-slate-700'}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-200">{notification.title}</span>{notification.body && <span className="block text-sm text-slate-400 mt-1">{notification.body}</span>}<span className="block text-xs text-slate-600 mt-2">{new Date(notification.createdAt).toLocaleString()}</span></span></button>)}</div></section>)}
    </div>
  );
}
