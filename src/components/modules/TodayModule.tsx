import { useMemo } from 'react';
import {
  Sun,
  Calendar,
  CheckSquare,
  Repeat,
  Target,
  BookHeart,
  ArrowRight,
  Sparkles,
  MapPin,
  Plus,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import {
  dayKey,
  endOfDay,
  format,
  formatTime,
  fromISO,
  isSameDay,
  startOfDay,
  startOfWeek,
} from '../../lib/dates';
import { expandAll } from '../../lib/recurrence';
import { APPS } from '../../lib/apps';
import type { EventInstance } from '../../types';

/**
 * Bucket events + habit toggles + journal moment into morning / afternoon /
 * evening so the day reads chronologically.
 */
type Slot = 'morning' | 'afternoon' | 'evening';

function slotFor(hour: number): Slot {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const SLOT_META: Record<Slot, { label: string; range: string; accent: string }> = {
  morning: { label: 'Morning', range: '5:00 – 12:00', accent: '#fb923c' },
  afternoon: { label: 'Afternoon', range: '12:00 – 17:00', accent: '#f97316' },
  evening: { label: 'Evening', range: '17:00 – 22:00', accent: '#8b5cf6' },
};

export function TodayModule() {
  const events = usePlannerStore((s) => s.events);
  const categories = usePlannerStore((s) => s.categories);
  const tasks = usePlannerStore((s) => s.tasks);
  const habits = usePlannerStore((s) => s.habits);
  const goals = usePlannerStore((s) => s.goals);
  const journal = usePlannerStore((s) => s.journal);
  const settings = usePlannerStore((s) => s.settings);
  const setActiveModule = usePlannerStore((s) => s.setActiveModule);
  const toggleHabitDay = usePlannerStore((s) => s.toggleHabitDay);
  const setTaskStatus = usePlannerStore((s) => s.setTaskStatus);
  const openEventModal = usePlannerStore((s) => s.openEventModal);

  const now = new Date();
  const todayKey = dayKey(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // ── Today's events (expanded for recurring rules) ──────────────────────
  const todaysEvents = useMemo(() => {
    return expandAll(events, todayStart, todayEnd)
      .filter((i) => isSameDay(i.start, now))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events]);

  const allDayEvents = todaysEvents.filter((i) => i.event.allDay);
  const timedEvents = todaysEvents.filter((i) => !i.event.allDay);

  // ── Tasks: due today, completed today, plus a short "later" tail ──────
  const dueToday = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status === 'done') return false;
        if (!t.dueDate) return false;
        return isSameDay(fromISO(t.dueDate), now);
      }),
    [tasks],
  );
  const otherOpen = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && !dueToday.includes(t)).slice(0, 6),
    [tasks, dueToday],
  );
  const completedToday = useMemo(
    () =>
      tasks.filter(
        (t) => t.status === 'done' && t.completedAt && isSameDay(fromISO(t.completedAt), now),
      ),
    [tasks],
  );

  // ── Habits ─────────────────────────────────────────────────────────────
  const habitsToday = useMemo(
    () => habits.map((h) => ({ ...h, done: !!h.completions[todayKey] })),
    [habits, todayKey],
  );
  const habitsDone = habitsToday.filter((h) => h.done).length;

  // ── Weekly goals (current week) ────────────────────────────────────────
  const weekStartKey = dayKey(
    startOfWeek(now, { weekStartsOn: settings.weekStartsOn }),
  );
  const weekGoals = goals.filter((g) => g.weekStart === weekStartKey);
  const goalsDone = weekGoals.filter((g) => g.done).length;

  // ── Journal ────────────────────────────────────────────────────────────
  const journalToday = journal.find((j) => j.date === todayKey);

  // ── 4-app launchpad ────────────────────────────────────────────────────
  // Only show apps where the user hasn't hidden every module. Each tile
  // counts how many entry points are still enabled.
  const visibleModules = settings.visibleModules;
  const isVisible = (id: typeof APPS[number]['modules'][number]) =>
    visibleModules.length === 0 || visibleModules.includes(id);
  const appTiles = APPS.map((app) => ({
    app,
    enabledModules: app.modules.filter((m) => isVisible(m)),
  })).filter((t) => t.enabledModules.length > 0);

  // ── Group timed events by slot ─────────────────────────────────────────
  const eventsBySlot = useMemo(() => {
    const m: Record<Slot, EventInstance[]> = { morning: [], afternoon: [], evening: [] };
    for (const e of timedEvents) m[slotFor(e.start.getHours())].push(e);
    return m;
  }, [timedEvents]);

  // ── Plan summary ───────────────────────────────────────────────────────
  const totalItems =
    todaysEvents.length + dueToday.length + habits.length + (journalToday ? 0 : 1);

  const fmtTime = (d: Date) => formatTime(d, settings.use24HourClock);

  return (
    <ModulePage
      id="today"
      title={format(now, 'EEEE, MMM d')}
      subtitle={summarize({
        events: todaysEvents.length,
        tasksDue: dueToday.length,
        habitsTotal: habits.length,
        habitsDone,
        goalsOpen: weekGoals.length - goalsDone,
      })}
    >
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-4xl mx-auto">
        {/* Hero summary */}
        <section
          className="card relative overflow-hidden p-4 sm:p-5"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--m-today) 14%, transparent), transparent 65%)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="module-icon-bubble" style={{ ['--m' as string]: 'var(--m-today)' }}>
              <Sun size={16} strokeWidth={2.3} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-semibold">Your day, all in one place</div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Everything you scheduled or planned — calendar events, due tasks, habits, weekly goals, and your journal — rolled up for {format(now, 'EEEE')}.
              </p>
            </div>
          </div>

          {/* At-a-glance pill row */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <SummaryPill
              icon={<Calendar size={12} />}
              label="Events"
              value={todaysEvents.length}
              accent="var(--m-calendar)"
              onClick={() => setActiveModule('calendar')}
            />
            <SummaryPill
              icon={<CheckSquare size={12} />}
              label="Tasks due"
              value={dueToday.length}
              accent="var(--m-tasks)"
              onClick={() => setActiveModule('tasks')}
            />
            <SummaryPill
              icon={<Repeat size={12} />}
              label="Habits"
              value={`${habitsDone}/${habits.length}`}
              accent="var(--m-habits)"
              onClick={() => setActiveModule('habits')}
            />
            <SummaryPill
              icon={<Target size={12} />}
              label="Goals"
              value={`${goalsDone}/${weekGoals.length}`}
              accent="var(--m-goals)"
              onClick={() => setActiveModule('goals')}
            />
          </div>
        </section>

        {/* 4-app launchpad — single core, four focused apps */}
        {appTiles.length > 0 && (
          <section>
            <SectionHeader
              title="Your apps"
              accent="var(--m-today)"
              icon={<Sun size={12} />}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {appTiles.map(({ app, enabledModules }) => (
                <button
                  key={app.id}
                  onClick={() => setActiveModule(enabledModules[0])}
                  className="relative overflow-hidden rounded-2xl border border-[color:var(--border-strong)] p-3 text-left transition-all hover:-translate-y-[2px] hover:shadow-lg group min-w-0"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${app.color} 16%, transparent), transparent 70%)`,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, ${app.color} 6%, transparent), transparent 80%)`,
                    }}
                  />
                  <div className="relative">
                    <div
                      className="inline-grid h-8 w-8 place-items-center rounded-lg text-white text-xs font-bold shadow-sm mb-2"
                      style={{
                        background: `linear-gradient(135deg, ${app.color}, color-mix(in srgb, ${app.color} 55%, #ec4899))`,
                        boxShadow: `0 8px 18px -8px ${app.color}66`,
                      }}
                    >
                      {app.label[0]}
                    </div>
                    <div className="text-sm font-semibold tracking-tight" style={{ color: app.color }}>
                      {app.label}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 min-h-[2em]">
                      {app.tagline}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {enabledModules.slice(0, 4).map((m) => (
                        <span
                          key={m}
                          className="text-[9px] uppercase tracking-wider rounded-md border border-[color:var(--border)] bg-white/70 dark:bg-white/[0.04] px-1.5 py-0.5 text-slate-600 dark:text-slate-300"
                        >
                          {labelFor(m)}
                        </span>
                      ))}
                      {enabledModules.length > 4 && (
                        <span className="text-[9px] uppercase tracking-wider text-slate-400">
                          +{enabledModules.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* All-day events strip */}
        {allDayEvents.length > 0 && (
          <section>
            <SectionHeader title="All day" accent="var(--m-calendar)" icon={<Calendar size={12} />} />
            <div className="card p-2 sm:p-3 flex flex-wrap gap-1.5">
              {allDayEvents.map((i) => {
                const color = categories.find((c) => c.id === i.event.categoryId)?.color || '#64748b';
                return (
                  <button
                    key={i.occurrenceKey}
                    onClick={() => openEventModal(i.event.id)}
                    className="chip text-white"
                    style={{
                      background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, #000 0%))`,
                    }}
                  >
                    {i.event.title}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Habits — small, actionable strip at the top of the day */}
        {habits.length > 0 && (
          <section>
            <SectionHeader
              title="Habits today"
              accent="var(--m-habits)"
              icon={<Repeat size={12} />}
              onMore={() => setActiveModule('habits')}
              count={`${habitsDone}/${habits.length}`}
            />
            <div className="card p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {habitsToday.map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleHabitDay(h.id, now)}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all min-w-0',
                    h.done
                      ? 'border-transparent text-white'
                      : 'border-[color:var(--border-strong)] hover:-translate-y-[1px]',
                  )}
                  style={
                    h.done
                      ? {
                          background: `linear-gradient(135deg, ${h.color}, color-mix(in srgb, ${h.color} 65%, #000 0%))`,
                          boxShadow: `0 6px 14px -6px ${h.color}55`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-lg text-sm shrink-0"
                    style={{
                      background: h.done ? 'rgba(255,255,255,0.22)' : `${h.color}1f`,
                      color: h.done ? '#fff' : h.color,
                    }}
                  >
                    {h.done ? <Check size={14} /> : h.emoji || '✦'}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{h.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Timeline — chronological by slot */}
        <section>
          <SectionHeader
            title="Schedule"
            accent="var(--m-calendar)"
            icon={<Calendar size={12} />}
            onMore={() => setActiveModule('calendar')}
            count={`${timedEvents.length} event${timedEvents.length === 1 ? '' : 's'}`}
          />
          <div className="space-y-3">
            {(Object.keys(SLOT_META) as Slot[]).map((slot) => {
              const meta = SLOT_META[slot];
              const list = eventsBySlot[slot];
              return (
                <SlotBlock
                  key={slot}
                  slot={slot}
                  label={meta.label}
                  range={meta.range}
                  accent={meta.accent}
                  events={list}
                  fmtTime={fmtTime}
                  onOpenEvent={(id) => openEventModal(id)}
                  categories={categories}
                />
              );
            })}
            {timedEvents.length === 0 && (
              <div className="card p-5 text-sm text-slate-400 italic text-center">
                Nothing scheduled today. A blank canvas.
              </div>
            )}
          </div>
        </section>

        {/* Tasks: due today + open + completed today */}
        {(dueToday.length > 0 || otherOpen.length > 0 || completedToday.length > 0) && (
          <section>
            <SectionHeader
              title="Tasks"
              accent="var(--m-tasks)"
              icon={<CheckSquare size={12} />}
              onMore={() => setActiveModule('tasks')}
              count={`${dueToday.length} due · ${completedToday.length} done`}
            />
            <div className="card divide-y divide-[color:var(--border)]">
              {dueToday.length > 0 && (
                <TaskGroup label="Due today" tasks={dueToday} onToggle={(t) => setTaskStatus(t.id, 'done')} accent="var(--m-tasks)" />
              )}
              {otherOpen.length > 0 && (
                <TaskGroup label="Open · pick a few" tasks={otherOpen} onToggle={(t) => setTaskStatus(t.id, 'done')} accent="var(--m-tasks)" muted />
              )}
              {completedToday.length > 0 && (
                <TaskGroup
                  label="Completed today"
                  tasks={completedToday}
                  onToggle={(t) => setTaskStatus(t.id, 'todo')}
                  accent="var(--m-habits)"
                  done
                />
              )}
            </div>
          </section>
        )}

        {/* Weekly goals — context for today */}
        {weekGoals.length > 0 && (
          <section>
            <SectionHeader
              title="This week's goals"
              accent="var(--m-goals)"
              icon={<Target size={12} />}
              onMore={() => setActiveModule('goals')}
              count={`${goalsDone}/${weekGoals.length}`}
            />
            <ul className="card divide-y divide-[color:var(--border)]">
              {weekGoals.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
                  <span
                    className={clsx(
                      'h-4 w-4 rounded-md border shrink-0',
                      g.done ? 'border-transparent' : 'border-[color:var(--border-strong)]',
                    )}
                    style={g.done ? { background: 'var(--m-goals)' } : undefined}
                  />
                  <span className={clsx('text-sm flex-1', g.done && 'line-through text-slate-400')}>
                    {g.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Journal moment */}
        <section>
          <SectionHeader
            title="Journal"
            accent="var(--m-journal)"
            icon={<BookHeart size={12} />}
            onMore={() => setActiveModule('journal')}
          />
          {journalToday ? (
            <div className="card p-4">
              <div className="flex items-baseline gap-2 mb-2">
                {journalToday.mood && <span className="text-xl leading-none">{moodEmoji(journalToday.mood)}</span>}
                <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saved today
                </span>
              </div>
              {journalToday.highlights && (
                <p className="text-sm leading-relaxed line-clamp-3">{journalToday.highlights}</p>
              )}
              {!journalToday.highlights && journalToday.reflection && (
                <p className="text-sm leading-relaxed line-clamp-3 text-slate-500 dark:text-slate-400">
                  {journalToday.reflection}
                </p>
              )}
              <button
                onClick={() => setActiveModule('journal')}
                className="mt-3 text-[11px] inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Edit entry <ArrowRight size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveModule('journal')}
              className="card-hover w-full p-4 flex items-center gap-3 text-left"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--m-journal) 10%, transparent), transparent 65%)',
              }}
            >
              <div className="module-icon-bubble" style={{ ['--m' as string]: 'var(--m-journal)' }}>
                <BookHeart size={14} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Reflect on today</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Capture a mood, three highlights, and a moment of gratitude.
                </div>
              </div>
              <Plus size={14} className="text-slate-400" />
            </button>
          )}
        </section>

        {/* AI hand-off */}
        <button
          onClick={() => setActiveModule('ai')}
          className="card-hover w-full p-3 flex items-center gap-3 text-left"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--m-ai) 10%, transparent), transparent 65%)',
          }}
        >
          <div className="module-icon-bubble" style={{ ['--m' as string]: 'var(--m-ai)' }}>
            <Sparkles size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Help me plan {totalItems > 6 ? 'this busy day' : 'today'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Ask the AI to suggest an order, find focus blocks, or summarize.
            </div>
          </div>
          <ArrowRight size={14} className="text-slate-400" />
        </button>
      </div>
    </ModulePage>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function summarize(p: {
  events: number;
  tasksDue: number;
  habitsTotal: number;
  habitsDone: number;
  goalsOpen: number;
}): string {
  const parts: string[] = [];
  parts.push(`${p.events} event${p.events === 1 ? '' : 's'}`);
  parts.push(`${p.tasksDue} task${p.tasksDue === 1 ? '' : 's'} due`);
  if (p.habitsTotal) parts.push(`${p.habitsDone}/${p.habitsTotal} habits`);
  if (p.goalsOpen > 0) parts.push(`${p.goalsOpen} weekly goal${p.goalsOpen === 1 ? '' : 's'} open`);
  return parts.join(' · ');
}

function moodEmoji(mood: number): string {
  return ['', '😞', '😕', '😐', '🙂', '😄'][mood] || '';
}

// Compact label for module chips on the app tile (e.g. "Bucket list" → "Bucket")
const MODULE_SHORT: Record<string, string> = {
  calendar: 'Calendar',
  tasks: 'Tasks',
  notes: 'Notes',
  travel: 'Travel',
  habits: 'Habits',
  goals: 'Goals',
  journal: 'Journal',
  analytics: 'Stats',
  finance: 'Finance',
  meals: 'Meals',
  fitness: 'Fitness',
  reading: 'Reading',
  vision: 'Vision',
  bucket: 'Bucket',
  archive: 'Archive',
};
function labelFor(id: string): string {
  return MODULE_SHORT[id] ?? id;
}

interface SummaryPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  onClick?: () => void;
}
function SummaryPill({ icon, label, value, accent, onClick }: SummaryPillProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-white dark:bg-white/[0.02] px-2.5 py-2 text-left transition-all hover:-translate-y-[1px] hover:border-[color:var(--border-strong)]"
    >
      <span
        className="grid h-7 w-7 place-items-center rounded-lg shrink-0"
        style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
        <span className="block text-sm font-semibold tabular-nums">{value}</span>
      </span>
    </button>
  );
}

interface SectionHeaderProps {
  title: string;
  accent: string;
  icon: React.ReactNode;
  count?: string;
  onMore?: () => void;
}
function SectionHeader({ title, accent, icon, count, onMore }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-1.5 px-1">
      <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
        <span style={{ color: accent }}>{icon}</span>
        {title}
        {count && (
          <span className="font-normal normal-case tracking-normal text-[10px] text-slate-400 dark:text-slate-500 ml-1">
            {count}
          </span>
        )}
      </h2>
      {onMore && (
        <button
          onClick={onMore}
          className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
        >
          Open <ArrowRight size={10} />
        </button>
      )}
    </div>
  );
}

interface SlotBlockProps {
  slot: Slot;
  label: string;
  range: string;
  accent: string;
  events: EventInstance[];
  fmtTime: (d: Date) => string;
  onOpenEvent: (id: string) => void;
  categories: { id: string; color: string; name?: string }[];
}
function SlotBlock({ label, range, accent, events, fmtTime, onOpenEvent, categories }: SlotBlockProps) {
  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-baseline justify-between px-3 sm:px-4 py-2 border-b border-[color:var(--border)]"
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 10%, transparent), transparent 80%)`,
        }}
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
            {label}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{range}</span>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          {events.length === 0 ? '—' : `${events.length} event${events.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="px-3 sm:px-4 py-3 text-xs text-slate-400 italic">No events scheduled</div>
      ) : (
        <ul className="divide-y divide-[color:var(--border)]">
          {events.map((inst) => {
            const color = categories.find((c) => c.id === inst.event.categoryId)?.color || '#64748b';
            return (
              <li key={inst.occurrenceKey}>
                <button
                  onClick={() => onOpenEvent(inst.event.id)}
                  className="w-full flex items-start gap-3 px-3 sm:px-4 py-2.5 text-left hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-[11px] font-mono tabular-nums w-16 text-slate-500 dark:text-slate-400 shrink-0 pt-0.5">
                    {fmtTime(inst.start)}
                  </span>
                  <span
                    className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                    style={{
                      background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 70%, #000 0%))`,
                      boxShadow: `0 0 8px ${color}55`,
                    }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{inst.event.title}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {fmtTime(inst.start)} – {fmtTime(inst.end)}
                      {inst.event.location && (
                        <>
                          {' · '}
                          <MapPin size={9} className="inline -mt-0.5" /> {inst.event.location}
                        </>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface TaskGroupProps {
  label: string;
  tasks: { id: string; title: string; priority?: string; status: string }[];
  onToggle: (t: { id: string; status: string }) => void;
  accent: string;
  done?: boolean;
  muted?: boolean;
}
function TaskGroup({ label, tasks, onToggle, accent, done, muted }: TaskGroupProps) {
  return (
    <div>
      <div className="px-3 sm:px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <ul>
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 sm:px-4 py-2">
            <button
              onClick={() => onToggle(t)}
              className={clsx(
                'h-4 w-4 rounded-md border grid place-items-center shrink-0 transition-colors',
                done
                  ? 'border-transparent text-white'
                  : 'border-[color:var(--border-strong)] hover:border-[color:var(--m-tasks)]',
              )}
              style={done ? { background: accent } : undefined}
              aria-label="Toggle"
            >
              {done && <Check size={10} />}
            </button>
            <span
              className={clsx(
                'text-sm flex-1 truncate',
                done && 'line-through text-slate-400',
                muted && 'text-slate-500 dark:text-slate-400',
              )}
            >
              {t.title}
            </span>
            {t.priority && (t.priority === 'high' || t.priority === 'urgent') && (
              <span
                className="chip text-[10px]"
                style={{
                  background: t.priority === 'urgent' ? '#ef44441f' : '#f59e0b1f',
                  color: t.priority === 'urgent' ? '#ef4444' : '#f59e0b',
                }}
              >
                {t.priority}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
