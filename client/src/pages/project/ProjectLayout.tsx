import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProject } from '@/hooks/useProject';
import LoaderHelix from '@/components/ui/LoaderHelix';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { ProjectRole } from '@/types';

const tabs = [
  { to: 'board', label: 'Board' },
  { to: 'members', label: 'Members' },
  { to: 'activity', label: 'Activity' },
  { to: 'analytics', label: 'Analytics' },
];

const roleLabel: Record<ProjectRole, string> = {
  OWNER: 'You are the Owner',
  ADMIN: 'You are an Admin',
  MEMBER: 'You are a Member',
  VIEWER: 'You are a Viewer',
};

const rolePill: Record<ProjectRole, string> = {
  OWNER: 'bg-brand-600/20 text-brand-300 border-brand-600/40',
  ADMIN: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  MEMBER: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  VIEWER: 'bg-slate-600/15 text-slate-400 border-slate-600/30',
};

export default function ProjectLayout() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: project, isLoading } = useProject(id);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoaderHelix speed={800} />
      </div>
    );
  }
  if (!project) {
    return <div className="p-6 text-slate-400">Project not found.</div>;
  }

  const role = project.role as ProjectRole;
  const projectName = project.name;

  async function deleteProject() {
    if (!window.confirm(`Delete "${projectName}" and all of its tasks? This cannot be undone.`)) return;
    try {
      await api.del(`/projects/${id}`);
      toast('Project deleted', 'success');
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/projects');
    } catch (err: any) {
      toast(err.message || 'Failed to delete project', 'error');
    }
  }

  return (
    <div className="p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color || '#6366f1' }} />
          <div className="min-w-0">
            <h1 className="text-[18px] leading-tight font-semibold text-slate-100 truncate">{project.name}</h1>
            {project.description && <p className="text-[13px] text-slate-400 leading-snug truncate">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className={`text-[11px] px-2 py-1 rounded border ${rolePill[role]}`}>{roleLabel[role]}</span>
          <span className="text-xs text-slate-500">{project.members?.length || 0} members</span>
          {role === 'OWNER' && (
            <button
              onClick={deleteProject}
              className="text-xs text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/15 rounded-md px-2.5 py-1 transition"
            >
              Delete project
            </button>
          )}
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
      </div>

      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
