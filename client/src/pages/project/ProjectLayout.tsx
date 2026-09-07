import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import type { ProjectRole } from '@/types';

const tabs = [
  { to: 'board', label: 'Board' },
  { to: 'members', label: 'Members' },
  { to: 'activity', label: 'Activity' },
  { to: 'analytics', label: 'Analytics' },
];

export default function ProjectLayout() {
  const { id = '' } = useParams();
  const { data: project, isLoading } = useProject(id);
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }
  if (!project) {
    return <div className="p-6 text-slate-400">Project not found.</div>;
  }

  const canManage = ['OWNER', 'ADMIN'].includes(project.role as ProjectRole);

  return (
    <div className="p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: project.color || '#6366f1' }} />
          <div>
            <h1 className="text-[18px] leading-tight font-semibold text-slate-100">{project.name}</h1>
            {project.description && <p className="text-[13px] text-slate-400 leading-snug">{project.description}</p>}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {project.members?.length || 0} members
        </div>
      </div>

      <div className="flex gap-1 border-b border-edge mb-3 -mx-4 sm:-mx-5 px-4 sm:px-5">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `px-3 py-1.5 text-[13px] font-medium border-b-2 -mb-px transition ${
                isActive
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
        {canManage && <span className="ml-auto text-[11px] text-slate-500 self-center">Admin access</span>}
      </div>

      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
