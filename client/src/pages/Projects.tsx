import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Project, ProjectRole } from '@/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Textarea, Field } from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { toast } from '@/lib/toast';

const roleStyle: Record<ProjectRole, string> = {
  OWNER: 'bg-brand-600/20 text-brand-300 border-brand-600/40',
  ADMIN: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  MEMBER: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  VIEWER: 'bg-slate-600/15 text-slate-400 border-slate-600/30',
};

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      const project = await api.post<Project>('/projects', {
        name: String(fd.get('name')),
        description: String(fd.get('description') || ''),
        color: '#6366f1',
      });
      toast('Project created', 'success');
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      window.location.href = `/projects/${project.id}/board`;
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a new project" footer={<Button form="create-project-form" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create project'}</Button>}>
      <form id="create-project-form" onSubmit={onSubmit} className="space-y-4">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}
        <Field label="Project name">
          <Input name="name" required placeholder="e.g. Argus Header" />
        </Field>
        <Field label="Description">
          <Textarea name="description" rows={3} placeholder="What is this project about?" />
        </Field>
      </form>
    </Modal>
  );
}

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('new') === '1');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned'>('all');
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });
  const filteredProjects = useMemo(() => (projects || []).filter((project) => {
    const matchesQuery = `${project.name} ${project.description || ''}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || project.role === 'OWNER';
    return matchesQuery && matchesFilter;
  }), [projects, query, filter]);

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-300 mb-2">Your workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">Organize work, align your team, and keep momentum visible.</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New project</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects..." className="sm:max-w-sm" aria-label="Search projects" />
        <div className="flex items-center gap-1 rounded-lg border border-edge bg-surface-2 p-1 w-fit">
          {(['all', 'owned'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === item ? 'bg-surface-3 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>{item === 'all' ? 'All projects' : 'Owned by me'}</button>)}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : projects && projects.length === 0 ? (
        <div className="bg-surface-2 border border-edge rounded-xl p-12 text-center text-slate-400">
          <p className="mb-4">No projects yet.</p>
          <Button onClick={() => setOpen(true)}>Create your first project</Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-surface-2 border border-dashed border-edge rounded-xl p-12 text-center text-slate-500">No projects match your search.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}/board`}
              className="bg-surface-2 border border-edge rounded-xl p-5 hover:border-brand-500/40 transition group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: p.color || '#6366f1' }} />
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${roleStyle[p.role || 'MEMBER']}`}>
                  {p.role}
                </span>
              </div>
              <h3 className="font-semibold text-slate-100 group-hover:text-brand-300">{p.name}</h3>
              {p.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
              <div className="text-xs text-slate-500 mt-4 flex gap-4">
                <span>{p._count?.tasks || 0} tasks</span>
                <span>{p._count?.members || 0} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
