import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile, authStore, ApiError } from '@/lib/api';
import { useProject, useProjectMembers } from '@/hooks/useProject';
import type { Task, Comment, Attachment, TaskPriority, TaskStatus, ProjectRole } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { Input, Textarea, Select, Field } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from '@/lib/toast';

const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];
const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TaskDetail({
  task,
  projectId,
  onClose,
}: {
  task: Task | null;
  projectId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [comment, setComment] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(t.title);
      setDesc(t.description || '');
    }
  }, [task?.id]);

  // Drawer a11y: focus the panel on open, restore focus / close on Escape.
  useEffect(() => {
    if (!task) return;
    requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task?.id]);

  const { data: project } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);
  const canEdit = ['OWNER', 'ADMIN', 'MEMBER'].includes(project?.role as ProjectRole);

  const { data: comments } = useQuery({
    queryKey: ['comments', task?.id],
    queryFn: () => api.get<Comment[]>(`/tasks/${task!.id}/comments`),
    enabled: !!task,
  });
  const { data: attachments } = useQuery({
    queryKey: ['attachments', task?.id],
    queryFn: () => api.get<Attachment[]>(`/tasks/${task!.id}/attachments`),
    enabled: !!task,
  });
  const { data: labels } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => api.get<any[]>(`/projects/${projectId}/labels`),
    enabled: !!projectId,
  });

  if (!task) return null;
  const t = task;

  async function refresh(taskId: string) {
    qc.invalidateQueries({ queryKey: ['boards', projectId] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['comments', taskId] });
    qc.invalidateQueries({ queryKey: ['attachments', taskId] });
  }

  async function patch(data: Record<string, unknown>) {
    try {
      const updated = await api.patch<Task>(`/tasks/${t.id}`, data);
      await refresh(t.id);
      toast('Task updated', 'success');
      return updated;
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
      return null;
    }
  }

  async function saveTitle() {
    if (title.trim() !== t.title) await patch({ title: title.trim() });
  }
  async function saveDesc() {
    if (desc !== (t.description || '')) await patch({ description: desc });
  }

  async function addComment() {
    if (!comment.trim()) return;
    try {
      await api.post(`/tasks/${t.id}/comments`, { content: comment.trim() });
      setComment('');
      qc.invalidateQueries({ queryKey: ['comments', t.id] });
      qc.invalidateQueries({ queryKey: ['boards', projectId] });
    } catch (err: any) {
      toast(err.message || 'Failed to comment', 'error');
    }
  }

  async function upload(file: File) {
    try {
      await uploadFile(`/tasks/${t.id}/attachments`, file);
      qc.invalidateQueries({ queryKey: ['attachments', t.id] });
      toast('Attachment uploaded', 'success');
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    }
  }

  async function toggleLabel(labelId: string) {
    const has = t.labels?.some((tl) => tl.label.id === labelId);
    const ids = has
      ? t.labels!.filter((tl) => tl.label.id !== labelId).map((tl) => tl.label.id)
      : [...(t.labels?.map((tl) => tl.label.id) || []), labelId];
    await patch({ labelIds: ids });
  }

  async function removeTask() {
    const ok = window.confirm('Delete this task?');
    if (!ok) return;
    try {
      await api.del(`/tasks/${t.id}`);
      toast('Task deleted', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  }

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set');

  // Downloads require the Authorization header, which a plain <a href> cannot
  // send. Fetch the file through the authenticated client and open it as a blob
  // so previews (images/PDF) and downloads work reliably.
  async function openAttachment(a: Attachment) {
    try {
      const token = authStore.getToken();
      const res = await fetch(`/api/v1/tasks/${t.id}/attachments/${a.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body?.message || 'Could not load file');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const preview = (a.mimeType?.startsWith('image/') || a.mimeType === 'application/pdf');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      if (preview) {
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        anchor.download = a.originalName || 'download';
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to open file', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Task ${t.title}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-2 border-l border-edge h-full flex flex-col animate-fade-in shadow-2xl">
        <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between">
          <span className="text-xs text-slate-500">TASK-{t.id.slice(-4).toUpperCase()}</span>
          <button ref={closeRef} onClick={onClose} aria-label="Close task details" className="text-slate-400 hover:text-slate-200 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {canEdit ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} className="text-base font-semibold" />
          ) : (
            <h2 className="text-base font-semibold text-slate-100">{t.title}</h2>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Status">
              <Select value={t.status} onChange={(e) => patch({ status: e.target.value })} disabled={!canEdit}>
                {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={t.priority} onChange={(e) => patch({ priority: e.target.value })} disabled={!canEdit}>
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Assignee">
              <Select
                value={t.assigneeId || ''}
                onChange={(e) => patch({ assigneeId: e.target.value || null })}
                disabled={!canEdit}
              >
                <option value="">Unassigned</option>
                {(members || []).map((m: any) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : ''}
                onChange={(e) => patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                disabled={!canEdit}
              />
            </Field>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1.5">Description</span>
            {canEdit ? (
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={saveDesc} rows={3} placeholder="Add a description..." />
            ) : (
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.description || 'No description.'}</p>
            )}
          </div>

          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1.5">Labels</span>
            <div className="flex flex-wrap gap-1.5">
              {(labels || []).map((l: any) => {
                const active = t.labels?.some((tl) => tl.label.id === l.id);
                return (
                  <button
                    key={l.id}
                    disabled={!canEdit}
                    onClick={() => toggleLabel(l.id)}
                    className={`text-[11px] px-2 py-1 rounded border transition ${
                      active ? 'font-medium' : 'opacity-50'
                    }`}
                    style={{ borderColor: `${l.color || '#8b5cf6'}77`, color: l.color || '#8b5cf6', background: `${l.color || '#8b5cf6'}18` }}
                  >
                    {l.name}
                  </button>
                );
              })}
              {(labels || []).length === 0 && <span className="text-xs text-slate-500">No labels yet</span>}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1.5">Attachments</span>
            {canEdit && (
              <label className="block text-xs text-brand-400 cursor-pointer hover:text-brand-300 mb-1.5">
                + Upload file
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
              </label>
            )}
            <div className="space-y-1.5">
              {(attachments || []).map((a) => (
                <div key={a.id} className="flex items-center gap-2 bg-surface-3 border border-edge rounded-md px-2.5 py-1.5 text-[13px]">
                  <span>📄</span>
                  <button
                    type="button"
                    onClick={() => openAttachment(a)}
                    className="flex-1 truncate text-left text-slate-200 hover:text-brand-300"
                    title={a.originalName || 'Open file'}
                  >
                    {a.originalName}
                  </button>
                  <span className="text-[11px] text-slate-500">{Math.round(a.size / 1024)} KB</span>
                </div>
              ))}
              {(attachments || []).length === 0 && <span className="text-xs text-slate-500">No attachments</span>}
            </div>
          </div>

          {/* Comments */}
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1.5">Comments ({comments?.length || 0})</span>
            <div className="space-y-2 mb-2.5">
              {(comments || []).map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar name={c.user.name} avatar={c.user.avatar} size={24} />
                  <div className="bg-surface-3/60 border border-edge rounded-md px-2.5 py-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{c.user.name}</span>
                      <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[13px] text-slate-300 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-1.5">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Write a comment..." />
                <button onClick={addComment} className="px-2.5 py-1.5 text-[13px] bg-brand-600 hover:bg-brand-500 rounded-md text-white" disabled={!comment.trim()}>Send</button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-edge flex justify-between text-xs text-slate-500">
          <span>Created {fmt(t.createdAt)}</span>
          {canEdit && (
            <button onClick={removeTask} className="text-rose-400 hover:text-rose-300">Delete task</button>
          )}
        </div>
      </div>
    </div>
  );
}
