import { Outlet, Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/ui/Avatar';

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-surface-2/80 backdrop-blur border-b border-edge flex items-center justify-between px-5 shrink-0">
          <form
            className="flex-1 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get('q') || '').trim();
              if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
            }}
          >
            <div className="relative">
              <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                placeholder="Search tasks, projects..."
                className="w-full bg-surface-3/60 border border-edge rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-600/40"
              />
            </div>
          </form>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link to="/settings" className="hover:opacity-80">
              <Avatar name={user?.name} avatar={user?.avatar} size={30} />
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
