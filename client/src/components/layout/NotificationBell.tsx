import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import type { Notification } from '@/types';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    enabled: !!user,
    refetchInterval: 60000,
  });
  const notifications = data?.notifications || [];
  const unread = data?.unreadCount || 0;

  // Real-time subscription using the shared socket so the bell never misses a
  // push (connectSocket returns the same instance as the app uses).
  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification.created', handler);
    return () => {
      socket.off('notification.created', handler);
    };
  }, [user, qc]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAllRead() {
    await api.post('/notifications/read-all');
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function openNotification(n: Notification) {
    if (n.status === 'UNREAD') await markRead(n.id);
    setOpen(false);
    if (n.taskId && n.projectId) {
      navigate(`/projects/${n.projectId}/board?task=${n.taskId}`);
    } else if (n.projectId) {
      navigate(`/projects/${n.projectId}/board`);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-slate-400 hover:bg-surface-3 hover:text-slate-200 transition"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17h5l-1.4-2.2a4 4 0 01-.6-2.2V10a6 6 0 10-12 0v2.6a4 4 0 01-.6 2.2L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface-2 border border-edge rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
            <span className="text-sm font-semibold text-slate-100">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-8">No notifications yet</div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={`w-full text-left px-4 py-3 hover:bg-surface-3/60 transition flex gap-3 ${
                  n.status === 'UNREAD' ? 'bg-brand-600/5' : ''
                }`}
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    n.status === 'UNREAD' ? 'bg-brand-400' : 'bg-slate-600'
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm text-slate-200 font-medium">{n.title}</span>
                  {n.body && <span className="block text-xs text-slate-400 truncate">{n.body}</span>}
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
