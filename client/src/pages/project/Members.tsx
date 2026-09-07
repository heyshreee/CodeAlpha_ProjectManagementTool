import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useProject, useProjectMembers } from '@/hooks/useProject';
import { useAuthStore } from '@/stores/authStore';
import type { ProjectRole } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Field, Select } from '@/components/ui/Input';
import { toast } from '@/lib/toast';

const roleStyle: Record<ProjectRole, string> = {
  OWNER: 'bg-brand-600/20 text-brand-300 border-brand-600/40',
  ADMIN: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  MEMBER: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  VIEWER: 'bg-slate-600/15 text-slate-400 border-slate-600/30',
};

export default function Members() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { data: project } = useProject(id);
  const { data: members, isLoading } = useProjectMembers(id);
  const [inviteOpen, setInviteOpen] = useState(false);

  const myRole = project?.role as ProjectRole | undefined;
  const canManage = ['OWNER', 'ADMIN'].includes(myRole || '');

  async function changeRole(memberId: string, role: string) {
    try {
      await api.patch(`/projects/${id}/members/${memberId}`, { role });
      toast('Role updated', 'success');
      qc.invalidateQueries({ queryKey: ['members', id] });
    } catch (err: any) {
      toast(err.message || 'Failed to update role', 'error');
    }
  }

  async function removeMember(memberId: string) {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.del(`/projects/${id}/members/${memberId}`);
      toast('Member removed', 'success');
      qc.invalidateQueries({ queryKey: ['members', id] });
    } catch (err: any) {
      toast(err.message || 'Failed to remove member', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-slate-200">Project members</h2>
        {canManage && <Button size="sm" onClick={() => setInviteOpen(true)}>+ Invite</Button>}
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm py-6">Loading members...</div>
      ) : (
        <div className="bg-surface-2 border border-edge rounded-lg divide-y divide-edge">
          {(members || []).map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar name={m.user.name} avatar={m.user.avatar} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-slate-200 truncate">
                  {m.user.name}
                  {m.user.id === currentUser?.id && <span className="text-slate-500 text-xs"> (you)</span>}
                </div>
                <div className="text-xs text-slate-500 truncate">{m.user.email}</div>
              </div>
              {m.role === 'OWNER' ? (
                <span className={`text-[11px] px-2 py-1 rounded border ${roleStyle.OWNER}`}>Owner</span>
              ) : canManage && m.user.id !== currentUser?.id ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    className="w-28 py-1 text-xs"
                  >
                    {(['ADMIN', 'MEMBER', 'VIEWER'] as const).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                  <button onClick={() => removeMember(m.id)} className="text-slate-500 hover:text-rose-400 text-xs">
                    Remove
                  </button>
                </div>
              ) : (
                <span className={`text-[11px] px-2 py-1 rounded border ${roleStyle[m.role as ProjectRole]}`}>
                  {m.role}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} projectId={id} />
    </div>
  );
}

function InviteModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api.post(`/projects/${projectId}/members`, {
        email: String(fd.get('email')),
        role: String(fd.get('role')) || 'MEMBER',
      });
      toast('Member invited', 'success');
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invite failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite a member" footer={<Button form="invite-form" type="submit" disabled={loading}>{loading ? 'Inviting...' : 'Invite'}</Button>}>
      <form id="invite-form" onSubmit={onSubmit} className="space-y-3">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">{error}</div>}
        <Field label="Email">
          <Input name="email" type="email" required placeholder="teammate@company.com" />
        </Field>
        <Field label="Role">
          <Select name="role" defaultValue="MEMBER">
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
