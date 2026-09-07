import type { TaskPriority, Task } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

const prioColor: Record<TaskPriority, string> = {
  URGENT: '#f43f5e',
  HIGH: '#f59e0b',
  MEDIUM: '#0ea5e9',
  LOW: '#94a3b8',
};

const statusColor: Record<string, string> = {
  BACKLOG: 'bg-slate-500/20 text-slate-400',
  TODO: 'bg-slate-400/20 text-slate-300',
  IN_PROGRESS: 'bg-brand-500/20 text-brand-300',
  DONE: 'bg-emerald-500/20 text-emerald-400',
};

function overdue(due?: string | null, status?: string) {
  if (!due || status === 'DONE') return false;
  return new Date(due) < new Date();
}

export default function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isOverdue = overdue(task.dueDate, task.status);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full text-left bg-surface-3 border border-edge rounded-lg p-3 hover:border-brand-500/50 transition group shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: `${prioColor[task.priority]}22`, color: prioColor[task.priority] }}
          >
            {task.priority}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor[task.status]}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="text-sm text-slate-100 font-medium leading-snug">{task.title}</div>

      {task.description && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
      )}

      {(task.labels?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels!.slice(0, 3).map((tl) => (
            <span
              key={tl.label.id}
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{ borderColor: `${tl.label.color || '#8b5cf6'}55`, color: tl.label.color || '#8b5cf6', background: `${tl.label.color || '#8b5cf6'}15` }}
            >
              {tl.label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {task.dueDate && (
            <span className={isOverdue ? 'text-rose-400' : ''}>
              {isOverdue && '⚠ '}
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task._count && (
            <span>💬 {task._count.comments}</span>
          )}
        </div>
        <div className="flex -space-x-1.5">
          <Avatar name={task.assignee?.name} avatar={task.assignee?.avatar} size={22} />
        </div>
      </div>
    </button>
  );
}
