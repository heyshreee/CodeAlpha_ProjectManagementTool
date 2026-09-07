import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useProject } from '@/hooks/useProject';
import type { ProjectAnalytics, ProjectRole } from '@/types';
import LoaderHelix from '@/components/ui/LoaderHelix';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: '#64748b',
  TODO: '#0ea5e9',
  IN_PROGRESS: '#8b5cf6',
  DONE: '#22c55e',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#0ea5e9',
  HIGH: '#f59e0b',
  URGENT: '#f43f5e',
};

export default function Analytics() {
  const { id = '' } = useParams();
  const { data: project, isLoading: ploading } = useProject(id);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', id],
    queryFn: () => api.get<ProjectAnalytics>(`/projects/${id}/analytics`),
  });

  if (isLoading || ploading) return <div className="py-8 flex justify-center"><LoaderHelix speed={800} /></div>;
  if (!data) return <div className="text-slate-400">No analytics available.</div>;

  const statusData = Object.entries(data.byStatus).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  const priorityData = Object.entries(data.byPriority).map(([name, value]) => ({ name, value }));
  const workloadData = (data.workload || []).map((w) => ({ name: w.name, Assigned: w.assigned, Completed: w.completed }));
  const isViewer = (project?.role as ProjectRole) === 'VIEWER';

  return (
    <div className="space-y-4 pb-6">
      {isViewer && (
        <div className="text-xs text-slate-500 bg-surface-3/50 border border-edge rounded-md px-3 py-2">
          You have view-only access to this project.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {[
          ['Total', data.total],
          ['Completed', data.completed],
          ['In Progress', data.inProgress],
          ['Todo', data.todo],
          ['Overdue', data.overdue],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-surface-2 border border-edge rounded-md p-3">
            <div className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</div>
            <div className={`text-lg font-semibold mt-0.5 ${label === 'Overdue' && value as number > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-2 border border-edge rounded-lg p-3.5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[13px] font-medium text-slate-200">Completion rate</span>
          <span className="text-[13px] font-bold text-emerald-400">{data.completionRate}%</span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full"
            style={{ width: `${data.completionRate}%` }}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-surface-2 border border-edge rounded-lg p-3.5">
          <h3 className="text-[13px] font-medium text-slate-200 mb-2.5">Tasks by status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={68} paddingAngle={2}>
                {statusData.map((e) => (
                  <Cell key={e.name} fill={STATUS_COLORS[e.name.replace(' ', '_')]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #273449', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface-2 border border-edge rounded-lg p-3.5">
          <h3 className="text-[13px] font-medium text-slate-200 mb-2.5">Tasks by priority</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={68} paddingAngle={2}>
                {priorityData.map((e) => (
                  <Cell key={e.name} fill={PRIORITY_COLORS[e.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #273449', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface-2 border border-edge rounded-lg p-3.5">
        <h3 className="text-[13px] font-medium text-slate-200 mb-2.5">Member workload</h3>
        {workloadData.length === 0 ? (
          <div className="text-sm text-slate-500 py-4 text-center">No assigned tasks</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#273449" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #273449', borderRadius: 8 }} />
              <Bar dataKey="Assigned" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
