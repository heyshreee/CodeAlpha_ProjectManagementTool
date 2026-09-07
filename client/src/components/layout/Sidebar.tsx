import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProject } from '@/hooks/useProject';
import Avatar from '@/components/ui/Avatar';

const nav = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10' },
  { to: '/tasks', label: 'My tasks', icon: 'M5 6h14M5 12h14M5 18h8' },
  { to: '/projects', label: 'Projects', icon: 'M4 7h16M4 12h16M4 17h10' },
  { to: '/calendar', label: 'Calendar', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z' },
  { to: '/notifications', label: 'Notifications', icon: 'M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' },
];

const projectNav = [
  { to: 'board', label: 'Board', icon: 'M4 4h4v4H4zM14 4h6v6h-6zM4 14h4v6H4zM14 14h6v6h-6z' },
  { to: 'members', label: 'Members', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0' },
  { to: 'activity', label: 'Activity', icon: 'M3 12a9 9 0 1118 0 9 9 0 01-18 0zM12 7v5l3 3' },
  { to: 'analytics', label: 'Analytics', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
];

function ProjectSection({ onClose }: { onClose?: () => void }) {
  const { id } = useParams();
  const { data: project } = useProject(id || '');
  if (!id || !project) return null;
  return (
    <div className="pt-6">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Current project</p>
      <div className="px-3 pb-1 flex items-center gap-2 overflow-hidden">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color || '#6366f1' }} />
        <span className="text-sm font-medium text-slate-100 truncate">{project.name}</span>
      </div>
      <div className="mt-1 space-y-1">
        {projectNav.map((item) => (
          <NavLink
            key={item.to}
            to={`/projects/${id}/${item.to === 'board' ? 'board' : item.to}`}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 pl-[18px] pr-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-brand-600/20 text-brand-300' : 'text-slate-400 hover:bg-surface-3/50 hover:text-slate-200'
              }`
            }
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}


export default function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside className="w-60 bg-surface-2 border-r border-edge flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-edge">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
          PF
        </div>
        <span className="font-bold text-slate-100">ProjectFlow</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-brand-600/20 text-brand-300' : 'text-slate-400 hover:bg-surface-3/50 hover:text-slate-200'
              }`
            }
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-edge">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user?.name} avatar={user?.avatar} size={32} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-slate-500 hover:text-rose-400 transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
