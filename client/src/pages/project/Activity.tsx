import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Activity } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { useRealtime } from '@/hooks/useRealtime';

const actionLabels: Record<string, string> = {
  'project.created': 'created project',
  'project.updated': 'updated project',
  'member.added': 'invited a member',
  'member.removed': 'removed a member',
  'member.role': 'changed roles',
  'task.created': 'created a task',
  'task.updated': 'updated a task',
  'task.deleted': 'deleted a task',
  'task.moved': 'moved a task',
  'comment.created': 'commented on a task',
  'attachment.added': 'attached a file',
  'attachment.removed': 'removed an attachment',
  'column.created': 'created a column',
  'column.deleted': 'deleted a column',
};

export default function Activity() {
  const { id = '' } = useParams();
  useRealtime();
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', id],
    queryFn: () => api.get<Activity[]>(`/projects/${id}/activities`),
  });

  if (isLoading) return <div className="text-slate-500 text-sm py-8">Loading activity...</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-sm font-semibold text-slate-200 mb-4">Activity timeline</h2>
      {(!activities || activities.length === 0) ? (
        <div className="text-slate-500 text-sm py-8 text-center">No activity yet</div>
      ) : (
        <div className="space-y-1">
          {activities.map((a, i) => (
            <div key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Avatar name={a.user.name} avatar={a.user.avatar} size={28} />
                {i < activities.length - 1 && <div className="w-px flex-1 bg-edge my-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm text-slate-300">
                  <span className="font-medium text-slate-200">{a.user.name}</span>{' '}
                  {actionLabels[a.action] || a.action.replace('.', ' ')}
                  {a.details && <span className="text-slate-400"> — {a.details}</span>}
                </p>
                <span className="text-[11px] text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
