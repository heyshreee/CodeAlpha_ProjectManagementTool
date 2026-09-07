import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Project, Task } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import LoaderHelix from '@/components/ui/LoaderHelix';

const tabs = ['ALL', 'TODAY', 'UPCOMING', 'OVERDUE', 'COMPLETED'] as const;
type Tab = typeof tabs[number];

export default function MyTasks() {
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>('ALL');
  const [query, setQuery] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-tasks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const projects = await api.get<Project[]>('/projects');
      const entries = await Promise.all(projects.map(async (project) => ({ project, tasks: await api.get<Task[]>(`/projects/${project.id}/tasks`) })));
      return entries.flatMap(({ project, tasks }) => tasks.filter((task) => task.assigneeId === user?.id).map((task) => ({ ...task, project })));
    },
  });
  const tasks = useMemo(() => (data || []).filter((task) => {
    const matchesQuery = task.title.toLowerCase().includes(query.toLowerCase());
    const due = task.dueDate ? new Date(task.dueDate) : null;
    const today = new Date();
    const isToday = !!due && due.toDateString() === today.toDateString();
    const isOverdue = !!due && due < today && task.status !== 'DONE';
    const matchesTab = tab === 'ALL' || (tab === 'COMPLETED' && task.status === 'DONE') || (tab === 'TODAY' && isToday) || (tab === 'OVERDUE' && isOverdue) || (tab === 'UPCOMING' && !!due && due >= today && task.status !== 'DONE');
    return matchesQuery && matchesTab;
  }), [data, query, tab]);

  return (
    <div className="p-4 sm:p-5 max-w-[1500px] mx-auto">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-300 mb-1">Personal workspace</p>
        <h1 className="text-2xl sm:text-[28px] leading-tight font-semibold text-slate-100">My tasks</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">A focused view of work assigned to you.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-4">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assigned tasks..." className="sm:max-w-sm" aria-label="Search assigned tasks" />
        <div className="flex gap-0.5 overflow-x-auto rounded-md border border-edge bg-surface-2 p-0.5 w-fit">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`shrink-0 rounded px-2.5 py-1.5 text-xs font-medium transition ${tab === item ? 'bg-surface-3 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {item[0] + item.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-16"><LoaderHelix speed={800} /></div>}
      {isError && <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-6 text-center text-[13px] text-slate-300">We couldn&apos;t load your tasks. Please try again.</div>}
      {!isLoading && !isError && tasks.length === 0 && <div className="rounded-lg border border-dashed border-edge p-10 text-center text-sm text-slate-500">No tasks match this view.</div>}
      {!isLoading && !isError && tasks.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-edge bg-surface-2">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-edge bg-surface-3/40">
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3.5 py-2">Task</th>
                <th className="px-3.5 py-2">Project</th>
                <th className="px-3.5 py-2">Status</th>
                <th className="px-3.5 py-2">Priority</th>
                <th className="px-3.5 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-edge last:border-0 hover:bg-surface-3/40">
                  <td className="px-3.5 py-2.5">
                    <Link to={`/projects/${task.projectId}/board?task=${task.id}`} className="block">
                      <span className="block text-[13px] font-medium text-slate-200 hover:text-brand-300">{task.title}</span>
                      <span className="font-mono text-[10px] text-slate-600">TASK-{task.id.slice(-6).toUpperCase()}</span>
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 text-[13px] text-slate-400">{task.project.name}</td>
                  <td className="px-3.5 py-2.5"><StatusBadge status={task.status} /></td>
                  <td className="px-3.5 py-2.5"><PriorityBadge priority={task.priority} /></td>
                  <td className={`px-3.5 py-2.5 text-[13px] ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-rose-400' : 'text-slate-400'}`}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}