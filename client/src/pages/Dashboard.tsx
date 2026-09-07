import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { DashboardStats } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { useRealtime } from '@/hooks/useRealtime';

function StatCard({ label, value, accent = 'text-slate-200' }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="bg-surface-2 border border-edge rounded-xl p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  useRealtime();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/analytics/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const upcoming = data?.upcomingDeadlines || [];
  const recent = data?.recentProjects || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-400">Here's what's happening across your projects today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projects" value={data?.totalProjects || 0} />
        <StatCard label="Total tasks" value={data?.totalTasks || 0} />
        <StatCard label="Assigned to me" value={data?.assignedTasks || 0} />
        <StatCard label="Completed" value={data?.completedTasks || 0} accent="text-emerald-400" />
      </div>

      {data && (data.overdueTasks > 0 || data.myCompleted > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Overdue" value={data.overdueTasks} accent="text-rose-400" />
          <StatCard label="My completed" value={data.myCompleted} accent="text-emerald-400" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-2 border border-edge rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Recent projects</h2>
          {recent.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">
              No projects yet.{' '}
              <Link to="/projects" className="text-brand-400 hover:text-brand-300">
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}/board`}
                  className="bg-surface-3/50 border border-edge rounded-lg p-4 hover:border-brand-500/40 transition group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: p.color || '#6366f1' }}
                    />
                    <span className="font-medium text-slate-100 group-hover:text-brand-300 truncate">
                      {p.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {p._count?.tasks || 0} tasks · {p._count?.members || 0} members
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-2 border border-edge rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Upcoming deadlines</h2>
          {upcoming.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">Nothing due soon</div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((t) => (
                <Link
                  key={t.id}
                  to={`/projects/${t.projectId}/board?task=${t.id}`}
                  className="block bg-surface-3/50 border border-edge rounded-lg p-3 hover:border-brand-500/40 transition"
                >
                  <div className="text-sm text-slate-200 truncate">{t.title}</div>
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
    </div>
  );
}
