import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { api } from '@/lib/api';
import type { Board, Task } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { toast } from '@/lib/toast';
import TaskCard from './TaskCard';
import { TaskDetail } from './TaskDetail';
import { NewTaskInput } from './NewTaskInput';
import { useProjectMembers } from '@/hooks/useProject';

// --- Sortable task card wrapper ---
function SortableTask({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={isDragging ? 'opacity-40' : ''}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

function BoardColumn({
  column,
  tasks,
  onTaskClick,
}: {
  column: { id: string; title: string; color?: string | null };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const items = tasks.map((t) => t.id);
  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-xl border flex flex-col transition-colors ${
        isOver ? 'border-brand-500/50 bg-brand-600/5' : 'border-edge bg-surface-2/50'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: column.color || '#6366f1' }}
        />
        <span className="text-sm font-semibold text-slate-200">{column.title}</span>
        <span className="text-xs text-slate-500 ml-auto">{tasks.length}</span>
      </div>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="px-2 pb-2 space-y-2 flex-1 overflow-y-auto">
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} onClick={() => onTaskClick(t)} />
          ))}
        </div>
      </SortableContext>
      <NewTaskInput columnId={column.id} />
    </div>
  );
}

export default function BoardPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [boardState, setBoardState] = useState<ColumnState[] | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);

  useProjectMembers(id);

  const { data, isLoading } = useQuery({
    queryKey: ['boards', id],
    queryFn: async () => {
      const boards = await api.get<Board[]>(`/projects/${id}/boards`);
      const primary = boards[0];
      const board = await api.get<Board>(`/projects/${id}/boards/${primary.id}`);
      setBoardState(board.columns as unknown as ColumnState[]);
      return board;
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns: ColumnState[] =
    boardState || (data?.columns as unknown as ColumnState[]) || [];

  function findTask(id: string) {
    for (const col of columns) {
      const t = col.tasks?.find((x: any) => x.id === id);
      if (t) return t;
    }
    return null;
  }
  function findColumn(id: string) {
    return columns.find((c) => c.id === id);
  }

  // Restore a task opened via ?task= query.
  useMemo(() => {
    const tid = params.get('task');
    if (tid && !selected) {
      const t = findTask(tid);
      if (t) setSelected(t as Task);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (!data) {
    return <div className="text-slate-400">Board not found.</div>;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveTask(findTask(String(e.active.id)) || null);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const activeColumn = columns.find((c) => c.tasks?.some((t: any) => t.id === activeId));
    const overColumn = findColumn(overId) || columns.find((c) => c.tasks?.some((t: any) => t.id === overId));
    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    setBoardState((prev) => {
      if (!prev) return prev;
      const activeList = prev.find((c) => c.id === activeColumn.id);
      const overList = prev.find((c) => c.id === overColumn.id);
      if (!activeList || !overList) return prev;
      const activeIndex = activeList.tasks!.findIndex((t: any) => t.id === activeId);
      const overIndex = overList.tasks!.findIndex((t: any) => t.id === overId);
      const newActive = [...activeList.tasks!];
      const [moved] = newActive.splice(activeIndex, 1);
      const newOver = [...overList.tasks!];
      newOver.splice(overIndex >= 0 ? overIndex : newOver.length, 0, moved);
      return prev.map((c) =>
        c.id === activeColumn.id ? { ...c, tasks: newActive } : c.id === overColumn.id ? { ...c, tasks: newOver } : c
      );
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const from = columns.find((c) => c.tasks?.some((t: any) => t.id === activeId));
    const to = findColumn(overId) || columns.find((c) => c.tasks?.some((t: any) => t.id === overId));
    if (!from || !to) return;

    // Position among target column tasks (index of the over task, -1 if none).
    const position = (to.tasks || []).findIndex((t: any) => t.id === overId && t.id !== activeId);

    try {
      await api.patch(`/projects/${id}/tasks/${activeId}/move`, {
        columnId: to.id,
        ...(position >= 0 ? { position } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['boards', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (from.id !== to.id) toast('Task moved', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to move task', 'error');
      queryClient.invalidateQueries({ queryKey: ['boards', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  }

  const scrollToTask = (taskId: string) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('task', taskId);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-2">
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={(col.tasks || []) as Task[]}
              onTaskClick={(t) => {
                setSelected(t);
                scrollToTask(t.id);
              }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-64 opacity-90">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetail
        task={selected}
        projectId={id}
        onClose={() => {
          setSelected(null);
          setParams({});
        }}
      />
    </div>
  );
}

interface ColumnState {
  id: string;
  title: string;
  color?: string | null;
  tasks?: Task[];
}
