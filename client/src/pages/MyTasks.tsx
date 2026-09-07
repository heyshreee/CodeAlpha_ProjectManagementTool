import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Project, Task } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';

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

  return <div className="p-4 sm:p-6 max-w-[1500px] mx-auto"><div className="mb-6"><p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-300 mb-2">Personal workspace</p><h1 className="text-2xl font-semibold text-slate-100">My tasks</h1><p className="text-sm text-slate-400 mt-1">A focused view of work assigned to you.</p></div><div className="flex flex-col sm:flex-row gap-3 mb-5"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assigned tasks..." className="sm:max-w-sm" aria-label="Search assigned tasks" /><div className="flex gap-1 overflow-x-auto rounded-lg border border-edge bg-surface-2 p-1">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${tab === item ? 'bg-surface-3 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>{item[0] + item.slice(1).toLowerCase()}</button>)}</div></div>{isLoading && <div className="flex justify-center py-20"><Spinner size={28} /></div>}{isError && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-8 text-center text-slate-300">We couldn&apos;t load your tasks. Please try again.</div>}{!isLoading && !isError && tasks.length === 0 && <div className="rounded-xl border border-dashed border-edge p-12 text-center text-slate-500">No tasks match this view.</div>}{!isLoading && !isError && tasks.length > 0 && <div className="overflow-x-auto rounded-xl border border-edge bg-surface-2"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-edge bg-surface-3/40"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Task</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Due</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-b border-edge last:border-0 hover:bg-surface-3/40"><td className="px-4 py-4"><Link to={`/projects/${task.projectId}/board?task=${task.id}`} className="block"><span className="block text-sm font-medium text-slate-200 hover:text-brand-300">{task.title}</span><span className="font-mono text-[10px] text-slate-600">TASK-{task.id.slice(-6).toUpperCase()}</span></Link></td><td className="px-4 py-4 text-sm text-slate-400">{task.project.name}</td><td className="px-4 py-4"><StatusBadge status={task.status} /></td><td className="px-4 py-4"><PriorityBadge priority={task.priority} /></td><td className={`px-4 py-4 text-sm ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-rose-400' : 'text-slate-400'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}</td></tr>)}</tbody></table></div>}</div>;
}
