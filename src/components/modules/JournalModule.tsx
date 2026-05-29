import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, CalendarDays, CheckSquare, Repeat, Plane } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { dayKey, format, addDays, fromISO, formatTime } from '../../lib/dates';
import { getDayContext } from '../../lib/integration';
import type { Mood } from '../../types';

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: '😞', label: 'Rough', color: '#94a3b8' },
  { value: 2, emoji: '😕', label: 'Off',   color: '#64748b' },
  { value: 3, emoji: '😐', label: 'Okay',  color: '#0ea5e9' },
  { value: 4, emoji: '🙂', label: 'Good',  color: '#10b981' },
  { value: 5, emoji: '😄', label: 'Great', color: '#f59e0b' },
];

export function JournalModule() {
  const journal = usePlannerStore((s) => s.journal);
  const upsert = usePlannerStore((s) => s.upsertJournal);
  const del = usePlannerStore((s) => s.deleteJournal);
  const use24h = usePlannerStore((s) => s.settings.use24HourClock);

  // Subscribe to all the slices the day-context view needs. Pull them here
  // (instead of inside the context card) so journal navigation between days
  // doesn't reset child component state.
  const events = usePlannerStore((s) => s.events);
  const tasks = usePlannerStore((s) => s.tasks);
  const habits = usePlannerStore((s) => s.habits);
  const trips = usePlannerStore((s) => s.trips);
  const tripItems = usePlannerStore((s) => s.tripItems);
  const medications = usePlannerStore((s) => s.medications);
  const meals = usePlannerStore((s) => s.meals);
  const workouts = usePlannerStore((s) => s.workouts);
  const toggleHabitDay = usePlannerStore((s) => s.toggleHabitDay);

  const [date, setDate] = useState<Date>(new Date());
  const key = dayKey(date);
  const entry = useMemo(() => journal.find((j) => j.date === key), [journal, key]);

  const context = useMemo(
    () => getDayContext({ events, tasks, habits, journal, trips, tripItems, medications, meals, workouts }, date),
    [events, tasks, habits, journal, trips, tripItems, medications, meals, workouts, date],
  );

  const recent = useMemo(() => {
    return [...journal].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 14);
  }, [journal]);

  return (
    <ModulePage id="journal">
      <div className="grid lg:grid-cols-[1fr_18rem] gap-4 sm:gap-5 p-3 sm:p-5 lg:p-7 max-w-6xl mx-auto">
        <div className="space-y-4 sm:space-y-5 min-w-0">
          {/* Date nav */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setDate(addDays(date, -1))} className="btn-ghost p-1.5 shrink-0" aria-label="Previous day">
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base font-semibold truncate">{format(date, 'EEEE')}</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">{format(date, 'MMMM d, yyyy')}</p>
            </div>
            <button onClick={() => setDate(addDays(date, 1))} className="btn-ghost p-1.5 shrink-0" aria-label="Next day">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setDate(new Date())} className="btn-secondary !text-xs shrink-0">Today</button>
          </div>

          {/* Day context — pulls in events, habits, tasks, trips for this date.
              Makes the journal a true day-of-record rather than a free-floating
              text editor. */}
          <DayContextCard
            context={context}
            use24h={use24h}
            onToggleHabit={(habitId) => toggleHabitDay(habitId, date)}
          />

          {/* Mood */}
          <div className="card p-4 sm:p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-3">
              How was your day?
            </h3>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {MOODS.map((m) => {
                const active = entry?.mood === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => upsert(key, { mood: m.value })}
                    className={clsx(
                      'flex flex-col items-center gap-1 rounded-xl border px-2 sm:px-4 py-2 sm:py-2.5 transition-all',
                      active
                        ? 'border-transparent text-white shadow-sm scale-[1.04]'
                        : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)] hover:-translate-y-[1px]',
                    )}
                    style={active ? { background: m.color } : undefined}
                  >
                    <span className="text-xl sm:text-2xl">{m.emoji}</span>
                    <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wide truncate max-w-full">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <PromptCard
            label="Three things I'm grateful for"
            value={entry?.gratitude || ''}
            placeholder="• ...\n• ...\n• ..."
            onChange={(v) => upsert(key, { gratitude: v })}
          />
          <PromptCard
            label="Highlights of the day"
            value={entry?.highlights || ''}
            placeholder="Wins, moments, things that mattered…"
            onChange={(v) => upsert(key, { highlights: v })}
          />
          <PromptCard
            label="Reflection"
            value={entry?.reflection || ''}
            placeholder="What did you learn? What's on your mind?"
            onChange={(v) => upsert(key, { reflection: v })}
            rows={6}
          />

          {entry && (
            <button
              onClick={() => {
                if (confirm('Delete this entry?')) del(entry.id);
              }}
              className="btn-ghost text-rose-500/80 hover:text-rose-500 !text-xs"
            >
              <Trash2 size={13} /> Delete entry
            </button>
          )}
        </div>

        {/* Recent entries */}
        <aside className="card p-4 h-fit">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2">
            Recent
          </h3>
          {recent.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">No entries yet. Start today.</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((j) => {
                const mood = MOODS.find((m) => m.value === j.mood);
                const d = fromISO(j.date);
                const active = j.date === key;
                return (
                  <li key={j.id}>
                    <button
                      onClick={() => setDate(d)}
                      className={clsx(
                        'w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                        active
                          ? 'bg-slate-900/[0.05] dark:bg-white/[0.05]'
                          : 'hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03]',
                      )}
                    >
                      <span className="text-lg">{mood?.emoji ?? '·'}</span>
                      <span className="flex-1 text-xs">
                        <div className="font-medium">{format(d, 'EEE, MMM d')}</div>
                        {j.highlights && (
                          <div className="text-slate-500 dark:text-slate-400 truncate">{j.highlights}</div>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </ModulePage>
  );
}

/**
 * The "day context" panel: a roll-up of everything else in the platform that
 * happened (or is scheduled to happen) on the selected journal date. Pulls
 * from events, habits, tasks, and trips so reflection can reference real data
 * rather than rely on the user's memory.
 *
 * Habits are interactive — toggling them here updates the global habit state
 * the same way the Habits module would, demonstrating the integration.
 */
function DayContextCard({
  context,
  use24h,
  onToggleHabit,
}: {
  context: ReturnType<typeof getDayContext>;
  use24h: boolean;
  onToggleHabit: (habitId: string) => void;
}) {
  const { events, habits, tasks, trips } = context;
  const empty = events.length === 0 && habits.length === 0 && tasks.length === 0 && trips.length === 0;
  if (empty) {
    return (
      <div className="card p-4 sm:p-5 text-center">
        <p className="text-xs text-slate-400 italic">Nothing tracked yet for this day.</p>
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5 space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        Day at a glance
      </h3>

      {trips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {trips.map((t) => (
            <span
              key={t.id}
              className="chip text-[11px]"
              style={{ background: `${t.color}1f`, color: t.color }}
            >
              <Plane size={11} />
              {t.title}
            </span>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            <CalendarDays size={11} /> Events
          </h4>
          <ul className="space-y-1">
            {events.slice(0, 6).map((e) => {
              const s = fromISO(e.start);
              return (
                <li key={e.id} className="flex items-baseline gap-2 text-[12px]">
                  <span className="tabular-nums text-slate-500 dark:text-slate-400 w-14 shrink-0">
                    {e.allDay ? 'All day' : formatTime(s, use24h)}
                  </span>
                  <span className="truncate">{e.title}</span>
                </li>
              );
            })}
            {events.length > 6 && (
              <li className="text-[11px] text-slate-400 italic">+{events.length - 6} more</li>
            )}
          </ul>
        </div>
      )}

      {habits.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            <Repeat size={11} /> Habits
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {habits.map(({ habit, done }) => (
              <button
                key={habit.id}
                onClick={() => onToggleHabit(habit.id)}
                className={clsx(
                  'chip text-[11px] transition-all',
                  done
                    ? 'text-white border-transparent'
                    : 'border border-[color:var(--border-strong)] text-slate-500 dark:text-slate-400 hover:border-current',
                )}
                style={done ? { background: habit.color } : undefined}
                title={done ? 'Click to undo' : 'Click to mark done'}
              >
                {habit.emoji && <span>{habit.emoji}</span>}
                {habit.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            <CheckSquare size={11} /> Tasks
          </h4>
          <ul className="space-y-1">
            {tasks.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-[12px]">
                <span
                  className={clsx(
                    'h-3 w-3 rounded-sm border shrink-0',
                    t.status === 'done'
                      ? 'border-transparent'
                      : 'border-[color:var(--border-strong)]',
                  )}
                  style={t.status === 'done' ? { background: 'var(--m-habits)' } : undefined}
                />
                <span className={clsx('truncate', t.status === 'done' && 'line-through text-slate-400')}>
                  {t.title}
                </span>
              </li>
            ))}
            {tasks.length > 6 && (
              <li className="text-[11px] text-slate-400 italic">+{tasks.length - 6} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface PromptCardProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  rows?: number;
}
function PromptCard({ label, value, placeholder, onChange, rows = 3 }: PromptCardProps) {
  return (
    <div className="card p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2">
        {label}
      </h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
