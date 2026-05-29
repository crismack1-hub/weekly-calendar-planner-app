import { useState, useMemo } from 'react';
import { Plus, Trash2, Flame, Check } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { dayKey, addDays, format, startOfWeek } from '../../lib/dates';

export function HabitsModule() {
  const habits = usePlannerStore((s) => s.habits);
  const addHabit = usePlannerStore((s) => s.addHabit);
  const toggleHabitDay = usePlannerStore((s) => s.toggleHabitDay);
  const deleteHabit = usePlannerStore((s) => s.deleteHabit);
  const weekStartsOn = usePlannerStore((s) => s.settings.weekStartsOn);

  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = useMemo(() => {
    const today = new Date();
    const start = addDays(startOfWeek(today, { weekStartsOn }), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStartsOn, weekOffset]);

  const computeStreak = (completions: Record<string, boolean>) => {
    let streak = 0;
    let d = new Date();
    while (completions[dayKey(d)]) {
      streak++;
      d = addDays(d, -1);
    }
    return streak;
  };

  const actions = (
    <button
      className="btn-primary !text-xs"
      onClick={() => {
        const name = prompt('Habit name?');
        if (!name?.trim()) return;
        const emoji = prompt('Emoji? (optional)') || '✨';
        const palette = ['#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#22c55e'];
        const color = palette[Math.floor(Math.random() * palette.length)];
        addHabit({ name: name.trim(), emoji, color, target: 5 });
      }}
    >
      <Plus size={13} /> New habit
    </button>
  );

  return (
    <ModulePage id="habits" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-6xl mx-auto">
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((v) => v - 1)} className="btn-ghost p-1.5">‹</button>
          <h2 className="text-sm font-semibold">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d')}
          </h2>
          <button onClick={() => setWeekOffset((v) => v + 1)} className="btn-ghost p-1.5">›</button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="btn-secondary !text-xs">
              This week
            </button>
          )}
        </div>

        {habits.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-400 italic">
            No habits yet. Build a streak — click "New habit" above.
          </div>
        ) : (
          <div className="card overflow-x-auto calendar-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                  <th className="text-left px-4 py-3 sticky left-0 bg-white dark:bg-slate-950/40 backdrop-blur z-10">Habit</th>
                  {weekDays.map((d) => (
                    <th key={d.toISOString()} className="text-center px-2 py-3 min-w-12">
                      <div>{format(d, 'EEE')}</div>
                      <div className="font-normal text-slate-400 dark:text-slate-500">{format(d, 'd')}</div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3">Streak</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => {
                  const streak = computeStreak(h.completions);
                  const weekDone = weekDays.filter((d) => h.completions[dayKey(d)]).length;
                  return (
                    <tr key={h.id} className="border-b border-[color:var(--border)] last:border-b-0 group">
                      <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-950/40 backdrop-blur z-10">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid h-8 w-8 place-items-center rounded-xl text-base"
                            style={{ background: `${h.color}1f`, color: h.color }}
                          >
                            {h.emoji || '✦'}
                          </span>
                          <div>
                            <div className="font-medium">{h.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {weekDone} / {h.target} this week
                            </div>
                          </div>
                        </div>
                      </td>
                      {weekDays.map((d) => {
                        const done = !!h.completions[dayKey(d)];
                        return (
                          <td key={d.toISOString()} className="px-2 py-2 text-center">
                            <button
                              onClick={() => toggleHabitDay(h.id, d)}
                              className={clsx(
                                'grid h-8 w-8 place-items-center rounded-lg border mx-auto transition-all',
                                done
                                  ? 'border-transparent text-white shadow-sm'
                                  : 'border-[color:var(--border-strong)] text-transparent hover:border-slate-400',
                              )}
                              style={done ? { background: h.color } : undefined}
                              aria-label="Toggle"
                            >
                              <Check size={14} />
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: streak > 0 ? '#f59e0b' : '#94a3b8' }}
                        >
                          <Flame size={12} />
                          {streak}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${h.name}"?`)) deleteHabit(h.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
