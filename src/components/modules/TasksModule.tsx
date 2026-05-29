import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Plus, Trash2, Flag, LayoutGrid, List as ListIcon, X, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { format, fromISO, toISO } from '../../lib/dates';
import type { Task, TaskStatus, TaskPriority } from '../../types';

const COLUMNS: { id: TaskStatus; label: string; accent: string }[] = [
  { id: 'todo', label: 'To do', accent: '#94a3b8' },
  { id: 'doing', label: 'In progress', accent: 'var(--m-tasks)' },
  { id: 'done', label: 'Done', accent: 'var(--m-habits)' },
];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: '#94a3b8',
  med: '#0ea5e9',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function TasksModule() {
  const tasks = usePlannerStore((s) => s.tasks);
  const projects = usePlannerStore((s) => s.projects);
  const addTask = usePlannerStore((s) => s.addTask);
  const updateTask = usePlannerStore((s) => s.updateTask);
  const deleteTask = usePlannerStore((s) => s.deleteTask);
  const setTaskStatus = usePlannerStore((s) => s.setTaskStatus);

  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(
    () => (projectFilter ? tasks.filter((t) => t.projectId === projectFilter) : tasks),
    [tasks, projectFilter],
  );

  const grouped: Record<TaskStatus, Task[]> = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    for (const t of filtered) g[t.status].push(t);
    return g;
  }, [filtered]);

  const onDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over) return;
    const newStatus = e.over.id as TaskStatus;
    const id = String(e.active.id);
    const t = tasks.find((x) => x.id === id);
    if (t && t.status !== newStatus) setTaskStatus(id, newStatus);
  };

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null;

  const actions = (
    <>
      <div className="segmented" role="tablist">
        <button data-active={view === 'kanban'} onClick={() => setView('kanban')} aria-label="Kanban">
          <LayoutGrid size={13} />
        </button>
        <button data-active={view === 'list'} onClick={() => setView('list')} aria-label="List">
          <ListIcon size={13} />
        </button>
      </div>
      <button
        className="btn-primary !text-xs"
        onClick={() => {
          const title = prompt('New task');
          if (title?.trim()) addTask({ title: title.trim(), status: 'todo', priority: 'med', projectId: projectFilter ?? undefined });
        }}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">New task</span>
      </button>
    </>
  );

  return (
    <ModulePage id="tasks" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-3 sm:space-y-4">
        {/* Project filter chips */}
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto calendar-scroll -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
          <button
            onClick={() => setProjectFilter(null)}
            className={clsx(
              'chip border transition-all whitespace-nowrap shrink-0',
              projectFilter === null
                ? 'text-white border-transparent'
                : 'border-[color:var(--border-strong)] text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]',
            )}
            style={
              projectFilter === null
                ? { background: 'var(--m-tasks)' }
                : undefined
            }
          >
            All ({tasks.length})
          </button>
          {projects.map((p) => {
            const count = tasks.filter((t) => t.projectId === p.id).length;
            const active = projectFilter === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setProjectFilter(active ? null : p.id)}
                className={clsx(
                  'chip border transition-all',
                  active
                    ? 'text-white border-transparent'
                    : 'border-[color:var(--border-strong)] text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]',
                )}
                style={active ? { background: p.color } : undefined}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: active ? '#fff' : p.color }}
                />
                {p.name} ({count})
              </button>
            );
          })}
          <button
            onClick={() => {
              const name = prompt('Project name?');
              if (!name?.trim()) return;
              const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
              usePlannerStore.getState().addProject({ name: name.trim(), color });
            }}
            className="chip border border-dashed border-[color:var(--border-strong)] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
          >
            <Plus size={11} /> Project
          </button>
        </div>

        {view === 'kanban' ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={grouped[col.id]}
                  onAdd={() => {
                    const title = prompt(`New task in "${col.label}"`);
                    if (title?.trim())
                      addTask({
                        title: title.trim(),
                        status: col.id,
                        priority: 'med',
                        projectId: projectFilter ?? undefined,
                      });
                  }}
                  onDelete={deleteTask}
                  onCyclePriority={(t) => {
                    const order: TaskPriority[] = ['low', 'med', 'high', 'urgent'];
                    const cur = t.priority || 'med';
                    const next = order[(order.indexOf(cur) + 1) % order.length];
                    updateTask(t.id, { priority: next });
                  }}
                  onSchedule={(t) => promptAndScheduleTask(t, updateTask)}
                />
              ))}
            </div>
            <DragOverlay>
              {draggingTask ? <TaskCard task={draggingTask} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <TaskList
            tasks={filtered}
            onToggle={(t) => setTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
            onDelete={deleteTask}
            onCyclePriority={(t) => {
              const order: TaskPriority[] = ['low', 'med', 'high', 'urgent'];
              const cur = t.priority || 'med';
              const next = order[(order.indexOf(cur) + 1) % order.length];
              updateTask(t.id, { priority: next });
            }}
          />
        )}
      </div>
    </ModulePage>
  );
}

/**
 * Schedules a task by prompting for an ISO datetime. The result is written
 * straight to `scheduledStart` so the calendar surfaces pick it up via the
 * integration layer — no separate event is created.
 */
function promptAndScheduleTask(t: Task, updateTask: (id: string, patch: Partial<Task>) => void) {
  // Use a basic prompt for now — a full datepicker would mean adding a modal
  // and is overkill for the integration MVP. Pre-fill with the current
  // scheduledStart if any, otherwise tomorrow at 9 am.
  const cur = t.scheduledStart ? fromISO(t.scheduledStart) : null;
  const seed = cur ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  })();
  const fmt = format(seed, "yyyy-MM-dd'T'HH:mm");
  const answer = prompt('Schedule this task (YYYY-MM-DDThh:mm). Leave empty to unschedule.', fmt);
  if (answer === null) return; // cancel
  if (answer.trim() === '') {
    updateTask(t.id, { scheduledStart: undefined });
    return;
  }
  // Treat empty seconds as :00 — the input from a `datetime-local` field is
  // already local time, so we round-trip through Date and re-emit ISO.
  const parsed = new Date(answer);
  if (isNaN(parsed.getTime())) {
    alert('That date didn\'t parse. Try YYYY-MM-DDThh:mm');
    return;
  }
  updateTask(t.id, { scheduledStart: toISO(parsed) });
}

interface KanbanColumnProps {
  column: { id: TaskStatus; label: string; accent: string };
  tasks: Task[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onCyclePriority: (t: Task) => void;
  onSchedule: (t: Task) => void;
}

function KanbanColumn({ column, tasks, onAdd, onDelete, onCyclePriority, onSchedule }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'card flex flex-col min-h-[12rem] p-3 transition-colors',
        isOver && 'ring-2 ring-offset-0',
      )}
      style={
        isOver
          ? ({ ['--tw-ring-color' as string]: column.accent } as React.CSSProperties)
          : undefined
      }
    >
      <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-[color:var(--border)]">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: column.accent }} />
          {column.label}
          <span className="text-slate-400 dark:text-slate-500 font-normal tabular-nums">
            {tasks.length}
          </span>
        </h3>
        <button onClick={onAdd} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 space-y-2">
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 italic px-1 py-3">Drop tasks here</p>
        )}
        {tasks.map((t) => (
          <DraggableTaskCard
            key={t.id}
            task={t}
            onDelete={() => onDelete(t.id)}
            onCyclePriority={() => onCyclePriority(t)}
            onSchedule={() => onSchedule(t)}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  onDelete,
  onCyclePriority,
  onSchedule,
}: {
  task: Task;
  onDelete: () => void;
  onCyclePriority: () => void;
  onSchedule: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: task.id });
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0 : 1 }
    : { opacity: isDragging ? 0 : 1 };
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
      <TaskCard task={task} onDelete={onDelete} onCyclePriority={onCyclePriority} onSchedule={onSchedule} />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onDelete?: () => void;
  onCyclePriority?: () => void;
  onSchedule?: () => void;
  isDragging?: boolean;
}
function TaskCard({ task, onDelete, onCyclePriority, onSchedule, isDragging }: TaskCardProps) {
  const pri = task.priority || 'med';
  const projects = usePlannerStore.getState().projects;
  const project = projects.find((p) => p.id === task.projectId);
  return (
    <div
      className={clsx(
        'group rounded-xl border border-[color:var(--border)] bg-white dark:bg-white/[0.03] p-3 cursor-grab active:cursor-grabbing transition-all',
        isDragging ? 'shadow-lg scale-[1.02]' : 'hover:shadow-md hover:border-[color:var(--border-strong)]',
      )}
      style={{ boxShadow: isDragging ? 'var(--shadow-lg)' : undefined }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ background: PRIORITY_COLOR[pri] }}
          title={`Priority: ${pri}`}
        />
        <span className="text-sm font-medium flex-1 leading-snug">{task.title}</span>
        {!isDragging && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
            aria-label="Delete"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px]">
        {project && (
          <span
            className="chip"
            style={{
              background: `${project.color}1a`,
              color: project.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.color }} />
            {project.name}
          </span>
        )}
        {!isDragging && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCyclePriority?.();
            }}
            className="chip"
            style={{ background: `${PRIORITY_COLOR[pri]}1a`, color: PRIORITY_COLOR[pri] }}
            title="Cycle priority"
          >
            <Flag size={10} /> {pri}
          </button>
        )}
        {!isDragging && onSchedule && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSchedule();
            }}
            className={clsx(
              'chip',
              task.scheduledStart
                ? 'text-white'
                : 'border border-[color:var(--border-strong)] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
            )}
            style={task.scheduledStart ? { background: 'var(--m-calendar)' } : undefined}
            title={
              task.scheduledStart
                ? `Scheduled ${format(fromISO(task.scheduledStart), 'MMM d, h:mm a')} — click to change`
                : 'Schedule on calendar'
            }
          >
            <CalendarIcon size={10} />
            {task.scheduledStart ? format(fromISO(task.scheduledStart), 'MMM d, h:mm a') : 'Schedule'}
          </button>
        )}
      </div>
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  onCyclePriority: (t: Task) => void;
}
function TaskList({ tasks, onToggle, onDelete, onCyclePriority }: TaskListProps) {
  const projects = usePlannerStore((s) => s.projects);
  return (
    <ul className="card divide-y divide-[color:var(--border)]">
      {tasks.length === 0 && (
        <li className="px-4 py-8 text-center text-sm text-slate-400 italic">No tasks. Add one to get started.</li>
      )}
      {tasks.map((t) => {
        const project = projects.find((p) => p.id === t.projectId);
        const pri = t.priority || 'med';
        return (
          <li key={t.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.02]">
            <button
              onClick={() => onToggle(t)}
              className={clsx(
                'h-4 w-4 rounded-md border transition-colors shrink-0',
                t.status === 'done'
                  ? 'bg-[color:var(--m-habits)] border-transparent'
                  : 'border-slate-300 dark:border-slate-600 hover:border-[color:var(--m-tasks)]',
              )}
              aria-label="Toggle"
            />
            <span
              className={clsx(
                'text-sm flex-1 truncate',
                t.status === 'done' && 'line-through text-slate-400',
              )}
            >
              {t.title}
            </span>
            {project && (
              <span className="chip hidden sm:inline-flex" style={{ background: `${project.color}1a`, color: project.color }}>
                {project.name}
              </span>
            )}
            <button
              onClick={() => onCyclePriority(t)}
              className="chip" style={{ background: `${PRIORITY_COLOR[pri]}1a`, color: PRIORITY_COLOR[pri] }}
              title="Cycle priority"
            >
              <Flag size={10} /> {pri}
            </button>
            <button
              onClick={() => onDelete(t.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
