import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { toast } from '@/lib/toast';
import { useProject } from '@/hooks/useProject';
import type { ProjectRole } from '@/types';

export function NewTaskInput({ columnId, autoOpen = false }: { columnId: string; autoOpen?: boolean }) {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(autoOpen);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { data: project } = useProject(id);

  const canCreate = ['OWNER', 'ADMIN', 'MEMBER'].includes(project?.role as ProjectRole);

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/projects/${id}/tasks`, { title: title.trim(), columnId });
      setTitle('');
      setOpen(false);
      toast('Task created', 'success');
      qc.invalidateQueries({ queryKey: ['boards', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      toast(err.message || 'Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="m-2 text-sm text-slate-500 hover:text-brand-300 px-3 py-1.5 text-left rounded hover:bg-surface-3/50 transition"
      >
        + Add task
      </button>
    );
  }

  return (
    <div className="p-2 flex gap-1">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Task title"
        className="py-1.5 text-sm"
      />
      {submitting ? (
        <span className="text-slate-500 px-2">…</span>
      ) : (
        <button
          onClick={submit}
          className="text-sm text-brand-300 px-2 hover:text-brand-200"
          disabled={!title.trim()}
        >
          Add
        </button>
      )}
    </div>
  );
}
