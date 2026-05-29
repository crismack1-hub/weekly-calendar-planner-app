import { useState, useMemo } from 'react';
import { Plus, Trash2, Check, ChevronLeft, ChevronRight, Repeat, Link2 } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { dayKey, fromISO, startOfWeek, addDays, format } from '../../lib/dates';
import { goalRollup } from '../../lib/integration';

export function GoalsModule() {
  const goals = usePlannerStore((s) => s.goals);
  const habits = usePlannerStore((s) => s.habits);
  const tasks = usePlannerStore((s) => s.tasks);
  const addGoal = usePlannerStore((s) => s.addGoal);
  const toggleGoal = usePlannerStore((s) => s.toggleGoal);
  const deleteGoal = usePlannerStore((s) => s.deleteGoal);
  const weekStartsOn = usePlannerStore((s) => s.settings.weekStartsOn);
  const [pickerForGoal, setPickerForGoal] = useState<string | null>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [draft, setDraft] = useState('');

  const weekStart = useMemo(() => {
    const today = new Date();
    return addDays(startOfWeek(today, { weekStartsOn }), weekOffset * 7);
  }, [weekStartsOn, weekOffset]);
  const weekStartKey = dayKey(weekStart);
  const weekEnd = addDays(weekStart, 6);

  const currentGoals = goals.filter((g) => g.weekStart === weekStartKey);
  const done = currentGoals.filter((g) => g.done).length;
  const pct = currentGoals.length ? (done / currentGoals.length) * 100 : 0;

  const previousWeeks = useMemo(() => {
    const map = new Map<string, typeof goals>();
    for (const g of goals) {
      if (g.weekStart === weekStartKey) continue;
      if (!map.has(g.weekStart)) map.set(g.weekStart, [] as never);
      (map.get(g.weekStart) as unknown as typeof goals).push(g);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6);
  }, [goals, weekStartKey]);

  return (
    <ModulePage id="goals">
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-3xl mx-auto">
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((v) => v - 1)} className="btn-ghost p-1.5">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-semibold">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {weekOffset === 0 ? 'This week' : weekOffset < 0 ? `${-weekOffset} week${weekOffset === -1 ? '' : 's'} ago` : `In ${weekOffset} weeks`}
            </p>
          </div>
          <button onClick={() => setWeekOffset((v) => v + 1)} className="btn-ghost p-1.5">
            <ChevronRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="btn-secondary !text-xs">
              This week
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Weekly progress</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {done} of {currentGoals.length} done
              </p>
            </div>
            <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--m-goals)' }}>
              {Math.round(pct)}%
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, var(--m-goals), color-mix(in srgb, var(--m-goals) 70%, #f97316))',
              }}
            />
          </div>
        </div>

        {/* Add goal */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addGoal({ title: draft.trim(), weekStart: weekStartKey, done: false });
            setDraft('');
          }}
          className="card flex items-center gap-2 p-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a goal for this week…"
            className="flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400"
          />
          <button type="submit" className="btn-primary !text-xs">
            <Plus size={13} /> Add
          </button>
        </form>

        {/* Current goals */}
        <ul className="card divide-y divide-[color:var(--border)]">
          {currentGoals.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-400 italic">
              No goals yet for this week. What's one thing that would make this week a win?
            </li>
          )}
          {currentGoals.map((g) => {
            const rollup = goalRollup(g, habits, tasks, weekStart);
            const habitPct = Math.round(rollup.weeklyHabitRate * 100);
            const showPicker = pickerForGoal === g.id;
            return (
              <li key={g.id} className="group flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleGoal(g.id)}
                    className={clsx(
                      'h-5 w-5 grid place-items-center rounded-md border transition-all shrink-0',
                      g.done
                        ? 'border-transparent text-white'
                        : 'border-[color:var(--border-strong)] hover:border-[color:var(--m-goals)]',
                    )}
                    style={g.done ? { background: 'var(--m-goals)' } : undefined}
                  >
                    {g.done && <Check size={12} />}
                  </button>
                  <span
                    className={clsx(
                      'flex-1 text-sm',
                      g.done && 'line-through text-slate-400',
                    )}
                  >
                    {g.title}
                  </span>
                  <button
                    onClick={() => setPickerForGoal(showPicker ? null : g.id)}
                    className={clsx(
                      'text-slate-400 hover:text-[color:var(--m-habits)]',
                      rollup.habits.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                    title="Link habits"
                    aria-label="Link habits"
                  >
                    <Link2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteGoal(g.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Linked habits rollup */}
                {rollup.habits.length > 0 && (
                  <div className="ml-8 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {rollup.habits.map((h) => (
                      <span
                        key={h.id}
                        className="chip"
                        style={{ background: `${h.color}1a`, color: h.color }}
                      >
                        {h.emoji && <span className="leading-none">{h.emoji}</span>}
                        {h.name}
                      </span>
                    ))}
                    <span
                      className="ml-auto inline-flex items-center gap-1 tabular-nums font-medium"
                      style={{ color: habitPct >= 80 ? 'var(--m-habits)' : habitPct >= 50 ? 'var(--m-tasks)' : '#94a3b8' }}
                    >
                      <Repeat size={11} /> {habitPct}%
                    </span>
                  </div>
                )}
                {/* Linked-habit picker */}
                {showPicker && (
                  <HabitPicker
                    goalId={g.id}
                    onClose={() => setPickerForGoal(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {/* (HabitPicker rendered inline below each goal — definition lives outside the map) */}

        {/* Previous weeks history */}
        {previousWeeks.length > 0 && (
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2 px-1">
              Past weeks
            </h3>
            <div className="space-y-2">
              {previousWeeks.map(([wkKey, list]) => {
                const wkDate = fromISO(wkKey);
                const wkDone = list.filter((g) => g.done).length;
                const wkPct = list.length ? Math.round((wkDone / list.length) * 100) : 0;
                return (
                  <div key={wkKey} className="card p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-medium">{format(wkDate, 'MMM d')}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {wkDone} / {list.length} done
                      </div>
                    </div>
                    <div className="w-32 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full" style={{ width: `${wkPct}%`, background: 'var(--m-goals)' }} />
                    </div>
                    <span className="text-xs tabular-nums w-10 text-right text-slate-500 dark:text-slate-400">{wkPct}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </ModulePage>
  );
}

/**
 * Inline picker for linking habits to a goal. Toggles `habit.goalId` so the
 * habit shows up under this goal's rollup. The change persists through the
 * normal store commit pipeline — no extra state to manage.
 */
function HabitPicker({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  const habits = usePlannerStore((s) => s.habits);
  const updateHabit = usePlannerStore((s) => s.updateHabit);

  if (habits.length === 0) {
    return (
      <div className="ml-8 rounded-lg border border-dashed border-[color:var(--border-strong)] p-3 text-[11px] text-slate-500 dark:text-slate-400">
        Create some habits first to link them here.
      </div>
    );
  }

  return (
    <div className="ml-8 rounded-lg border border-[color:var(--border)] bg-slate-900/[0.02] dark:bg-white/[0.02] p-2 space-y-1">
      <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Habits that feed this goal
      </div>
      {habits.map((h) => {
        const linked = h.goalId === goalId;
        const otherLinked = !!h.goalId && h.goalId !== goalId;
        return (
          <button
            key={h.id}
            onClick={() => updateHabit(h.id, { goalId: linked ? undefined : goalId })}
            className={clsx(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
              linked
                ? 'bg-slate-900/[0.06] dark:bg-white/[0.06]'
                : 'hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]',
            )}
          >
            <span
              className={clsx(
                'h-4 w-4 grid place-items-center rounded border',
                linked ? 'text-white border-transparent' : 'border-[color:var(--border-strong)]',
              )}
              style={linked ? { background: h.color } : undefined}
            >
              {linked && <Check size={10} />}
            </span>
            {h.emoji && <span>{h.emoji}</span>}
            <span className="flex-1">{h.name}</span>
            {otherLinked && (
              <span className="text-[10px] text-slate-400 italic">linked to another goal</span>
            )}
          </button>
        );
      })}
      <div className="flex justify-end pt-1">
        <button onClick={onClose} className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          Done
        </button>
      </div>
    </div>
  );
}
