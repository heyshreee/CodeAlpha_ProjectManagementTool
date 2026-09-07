import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { DashboardStats } from '@/types';
import LoaderHelix from '@/components/ui/LoaderHelix';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { useRealtime } from '@/hooks/useRealtime';

function StatCard({ label, value, detail, accent = 'text-slate-100' }: { label: string; value: number | string; detail: string; accent?: string }) {
  return (
    <div className="bg-surface-2/90 border border-edge rounded-lg p-4 hover:border-slate-600 transition-colors flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      </div>
      <div className={`text-[28px] leading-8 font-semibold tracking-tight mt-2 ${accent}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{detail}</div>
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTIVITY_LABEL: Record<string, string> = {
  'task.created': 'created a task',
  'task.updated': 'updated a task',
  'task.deleted': 'deleted a task',
  'task.moved': 'moved a task',
  'comment.created': 'commented on a task',
  'member.added': 'added a member',
  'member.removed': 'removed a member',
  'attachment.added': 'attached a file',
  'label.created': 'created a label',
  'project.created': 'created a project',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  useRealtime();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/analytics/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoaderHelix speed={800} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-surface-2 border border-rose-500/30 rounded-lg p-6 text-center max-w-sm">
          <p className="text-slate-200 font-medium">We couldn&apos;t load your workspace.</p>
          <p className="text-sm text-slate-500 mt-1">The backend may be unavailable — the data you see elsewhere is real, not this.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  const upcoming = data?.upcomingDeadlines || [];
  const recent = data?.recentProjects || [];
  const activity = data?.activity || [];

  return (
    <div className="p-4 sm:p-5 space-y-4 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-300 mb-1">Workspace overview</p>
          <h1 className="text-2xl sm:text-[28px] leading-tight font-semibold tracking-tight text-slate-100">
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Here&apos;s what&apos;s happening across your workspace.</p>
        </div>
        <Link to="/projects"><Button><span className="text-base leading-none">+</span> New Project</Button></Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Projects" value={data?.totalProjects || 0} detail="In your workspace" />
        <StatCard label="Active tasks" value={Math.max((data?.totalTasks || 0) - (data?.completedTasks || 0), 0)} detail="Not yet done, across all projects" accent="text-brand-300" />
        <StatCard
          label="Completed"
          value={data?.completedTasks || 0}
          detail={`${data?.myCompleted || 0} of these were done by you`}
          accent="text-emerald-400"
        />
        <StatCard label="Overdue" value={data?.overdueTasks || 0} detail="Past due date and open" accent="text-rose-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-2/90 border border-edge rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div><h2 className="text-[15px] font-semibold text-slate-100">Recent projects</h2><p className="text-[13px] text-slate-500 mt-0.5">Your latest active workspaces</p></div>
            <Link to="/projects" className="text-xs font-medium text-brand-300 hover:text-brand-200">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-edge rounded-lg">No projects yet. <Link to="/projects" className="text-brand-300 hover:text-brand-200">Create your first project</Link></div>
          ) : (
            <div className="space-y-2">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}/board`}
                  className="block bg-surface-3/45 border border-edge rounded-md p-3 hover:border-brand-400/50 hover:bg-surface-3/70 transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color || '#6366f1' }} />
                    <span className="text-[13px] font-medium text-slate-100 group-hover:text-brand-300 truncate">{p.name}</span>
                    <span className="ml-auto text-xs text-slate-500">{p.completedCount}/{p.taskCount} tasks</span>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.completionRate}%`, background: p.completionRate === 100 ? '#34d399' : p.color || '#6366f1' }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                      <span>{p.taskCount} tasks · {p.memberCount} members</span>
                      <span className="text-slate-400 font-medium">{p.completionRate}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-2/90 border border-edge rounded-lg p-4">
          <div className="flex items-center justify-between mb-3"><div><h2 className="text-[15px] font-semibold text-slate-100">Upcoming deadlines</h2><p className="text-[13px] text-slate-500 mt-0.5">Next tasks on your calendar</p></div><span className="text-xs text-amber-400">{upcoming.length} due</span></div>
          {upcoming.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-edge rounded-lg">Nothing due soon</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => (
                <Link
                  key={t.id}
                  to={`/projects/${t.projectId}/board?task=${t.id}`}
                  className="block bg-surface-3/50 border border-edge rounded-md p-2.5 hover:border-brand-500/40 transition"
                >
                  <div className="text-[13px] text-slate-200 truncate">{t.title}</div>
                  <div className="text-xs text-slate-500 mt-1 flex justify-between">
                    <span>{t.project.name}</span>
                    <span className="text-amber-400">{new Date(t.dueDate!).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-2/90 border border-edge rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div><h2 className="text-[15px] font-semibold text-slate-100">Recent activity</h2><p className="text-[13px] text-slate-500 mt-0.5">Latest changes across your projects</p></div>
        </div>
        {activity.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-edge rounded-lg">No activity yet. Actions in your projects will show up here.</div>
        ) : (
          <div className="space-y-0.5">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-edge/60 last:border-0">
                <Avatar name={a.user.name} avatar={a.user.avatar} size={24} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-slate-300">
                    <span className="font-medium text-slate-100">{a.user.name}</span>{' '}
                    <span className="text-slate-500">{ACTIVITY_LABEL[a.action] || a.action.toLowerCase()}</span>
                    {a.task?.title && <span className="text-slate-300"> “{a.task.title}”</span>}
                    {a.details && <span className="text-slate-500"> — {a.details}</span>}
                  </p>
                  {a.project && <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: a.project.color || '#6366f1' }} />{a.project.name}</p>}
                </div>
                <span className="text-xs text-slate-600 shrink-0">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
