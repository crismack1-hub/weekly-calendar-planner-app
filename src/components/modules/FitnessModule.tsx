import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Timer, Flame, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { addDays, dayKey, format, fromISO, formatTime, startOfWeek } from '../../lib/dates';
import type { Workout, WorkoutType, WorkoutIntensity } from '../../types';

const TYPE_META: Record<WorkoutType, { label: string; emoji: string; color: string }> = {
  cardio: { label: 'Cardio', emoji: '🏃', color: '#0ea5e9' },
  strength: { label: 'Strength', emoji: '🏋️', color: '#dc2626' },
  flexibility: { label: 'Flexibility', emoji: '🧘', color: '#a855f7' },
  sports: { label: 'Sports', emoji: '⚽', color: '#22c55e' },
  other: { label: 'Other', emoji: '💪', color: '#f59e0b' },
};

const INTENSITY_META: Record<WorkoutIntensity, { label: string; color: string }> = {
  low: { label: 'Easy', color: '#22c55e' },
  medium: { label: 'Moderate', color: '#f59e0b' },
  high: { label: 'Intense', color: '#ef4444' },
};

export function FitnessModule() {
  const workouts = usePlannerStore((s) => s.workouts);
  const addWorkout = usePlannerStore((s) => s.addWorkout);
  const updateWorkout = usePlannerStore((s) => s.updateWorkout);
  const deleteWorkout = usePlannerStore((s) => s.deleteWorkout);
  const weekStartsOn = usePlannerStore((s) => s.settings.weekStartsOn);
  const use24h = usePlannerStore((s) => s.settings.use24HourClock);

  const [weekOffset, setWeekOffset] = useState(0);

  // Week range — used by the strip + the weekly summary.
  const weekStart = useMemo(
    () => addDays(startOfWeek(new Date(), { weekStartsOn }), weekOffset * 7),
    [weekStartsOn, weekOffset],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const [activeDayKey, setActiveDayKey] = useState<string>(dayKey(new Date()));
  const dayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === activeDayKey).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    [workouts, activeDayKey],
  );

  const weeklyStats = useMemo(() => {
    const inWeek = workouts.filter((w) => {
      return weekDays.some((d) => dayKey(d) === w.date);
    });
    const completed = inWeek.filter((w) => w.completed);
    const minutes = completed.reduce((acc, w) => acc + (w.durationMin || 0), 0);
    const calories = completed.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
    return { planned: inWeek.length, done: completed.length, minutes, calories };
  }, [workouts, weekDays]);

  const actions = (
    <button className="btn-primary !text-xs" onClick={() => quickAddWorkout(addWorkout, activeDayKey)}>
      <Plus size={13} />
      <span className="hidden sm:inline">Log workout</span>
    </button>
  );

  return (
    <ModulePage id="fitness" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-5xl mx-auto">
        {/* Week strip */}
        <div className="card p-2 sm:p-3">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setWeekOffset((v) => v - 1)} className="btn-ghost p-1">
              <ChevronLeft size={14} />
            </button>
            <div className="flex-1 text-center">
              <p className="text-xs font-semibold">
                {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
              </p>
            </div>
            <button onClick={() => setWeekOffset((v) => v + 1)} className="btn-ghost p-1">
              <ChevronRight size={14} />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => {
                  setWeekOffset(0);
                  setActiveDayKey(dayKey(new Date()));
                }}
                className="btn-secondary !text-xs"
              >
                Today
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const k = dayKey(d);
              const dayWk = workouts.filter((w) => w.date === k);
              const done = dayWk.filter((w) => w.completed).length;
              const isToday = k === dayKey(new Date());
              const isActive = k === activeDayKey;
              return (
                <button
                  key={k}
                  onClick={() => setActiveDayKey(k)}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-lg p-1.5 sm:p-2 transition-all',
                    isActive ? 'text-white shadow-sm' : isToday ? 'border border-[color:var(--m-fitness)]' : 'hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]',
                  )}
                  style={isActive ? { background: 'var(--m-fitness)' } : undefined}
                >
                  <span className="text-[10px] uppercase tracking-wide opacity-70">{format(d, 'EEE')}</span>
                  <span className="text-sm font-bold tabular-nums">{format(d, 'd')}</span>
                  <div className="h-1 w-full rounded-full bg-slate-900/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    {dayWk.length > 0 && (
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, (done / dayWk.length) * 100)}%`,
                          background: isActive ? '#fff' : 'var(--m-fitness)',
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="This week" value={`${weeklyStats.done} / ${weeklyStats.planned}`} sub="workouts" />
          <StatCard label="Minutes" value={weeklyStats.minutes.toString()} sub="active" icon={<Timer size={11} />} />
          <StatCard label="Calories" value={weeklyStats.calories.toString()} sub="burned" icon={<Flame size={11} />} />
        </div>

        {/* Day workouts */}
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2 px-1">
            {format(fromISO(activeDayKey + 'T00:00:00'), 'EEEE, MMM d')}
          </h3>
          {dayWorkouts.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-400 italic">
              Nothing logged. Tap "Log workout" to add one.
            </div>
          ) : (
            <ul className="card divide-y divide-[color:var(--border)]">
              {dayWorkouts.map((w) => (
                <WorkoutRow
                  key={w.id}
                  workout={w}
                  use24h={use24h}
                  onUpdate={(patch) => updateWorkout(w.id, patch)}
                  onDelete={() => deleteWorkout(w.id)}
                />
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center flex items-center justify-center gap-1.5">
          <CalendarIcon size={11} /> Workouts appear on your calendar automatically.
        </p>
      </div>
    </ModulePage>
  );
}

function quickAddWorkout(addWorkout: (w: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>) => string, date: string) {
  const name = prompt('Workout name (e.g. "Morning Run")');
  if (!name?.trim()) return;
  const types = (Object.keys(TYPE_META) as WorkoutType[]).join(', ');
  const typeStr = (prompt(`Type? (${types})`, 'cardio') || 'cardio').toLowerCase() as WorkoutType;
  const type = (Object.keys(TYPE_META) as WorkoutType[]).includes(typeStr) ? typeStr : 'cardio';
  const time = prompt('Time (HH:mm)', '17:00') || '17:00';
  const durStr = prompt('Duration (minutes)', '30');
  const dur = durStr ? parseInt(durStr, 10) : 30;
  addWorkout({
    name: name.trim(),
    type,
    date,
    time,
    durationMin: isNaN(dur) ? 30 : dur,
    intensity: 'medium',
  });
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-lg sm:text-xl font-bold tabular-nums mt-1" style={{ color: 'var(--m-fitness)' }}>
        {value}
      </p>
      <p className="text-[10px] text-slate-400">{sub}</p>
    </div>
  );
}

function WorkoutRow({
  workout,
  use24h,
  onUpdate,
  onDelete,
}: {
  workout: Workout;
  use24h: boolean;
  onUpdate: (patch: Partial<Workout>) => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[workout.type];
  const intMeta = workout.intensity ? INTENSITY_META[workout.intensity] : null;
  const t = (workout.time || '17:00').split(':');
  const d = new Date();
  d.setHours(parseInt(t[0], 10), parseInt(t[1], 10), 0, 0);

  return (
    <li className="group flex items-center gap-3 px-3 sm:px-4 py-3">
      <button
        onClick={() => onUpdate({ completed: !workout.completed })}
        className={clsx(
          'h-9 w-9 grid place-items-center rounded-xl shrink-0 transition-all text-lg',
          workout.completed ? 'text-white' : 'text-slate-500',
        )}
        style={{
          background: workout.completed
            ? `linear-gradient(135deg, ${meta.color}, color-mix(in srgb, ${meta.color} 60%, #000 0%))`
            : `${meta.color}1a`,
          color: workout.completed ? '#fff' : meta.color,
        }}
      >
        {workout.completed ? <Check size={16} /> : meta.emoji}
      </button>
      <div className="flex-1 min-w-0">
        <input
          value={workout.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className={clsx(
            'w-full bg-transparent text-sm font-semibold outline-none',
            workout.completed && 'line-through text-slate-400',
          )}
        />
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="chip text-[10px]" style={{ background: `${meta.color}1a`, color: meta.color }}>
            {meta.label}
          </span>
          {intMeta && (
            <button
              onClick={() => {
                const order: WorkoutIntensity[] = ['low', 'medium', 'high'];
                const cur = workout.intensity || 'medium';
                onUpdate({ intensity: order[(order.indexOf(cur) + 1) % order.length] });
              }}
              className="chip text-[10px]"
              style={{ background: `${intMeta.color}1a`, color: intMeta.color }}
              title="Cycle intensity"
            >
              {intMeta.label}
            </button>
          )}
          <span className="tabular-nums">{formatTime(d, use24h)}</span>
          {workout.durationMin != null && (
            <span className="tabular-nums">· {workout.durationMin}m</span>
          )}
          {(workout.caloriesBurned || 0) > 0 && (
            <span className="chip text-[10px] bg-slate-900/[0.04] dark:bg-white/[0.06]">
              <Flame size={9} /> {workout.caloriesBurned} kcal
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
        aria-label="Delete"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}
