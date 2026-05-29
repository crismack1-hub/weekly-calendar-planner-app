import { useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  Repeat,
  Target,
  ArrowRight,
  Sun,
  Sparkles,
} from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { fromISO, isSameDay, format, startOfWeek, dayKey, addDays } from '../../lib/dates';
import { expandAll } from '../../lib/recurrence';
import { formatTime } from '../../lib/dates';

export function DashboardModule() {
  const events = usePlannerStore((s) => s.events);
  const tasks = usePlannerStore((s) => s.tasks);
  const habits = usePlannerStore((s) => s.habits);
  const goals = usePlannerStore((s) => s.goals);
  const settings = usePlannerStore((s) => s.settings);
  const setActiveModule = usePlannerStore((s) => s.setActiveModule);
  const setTaskStatus = usePlannerStore((s) => s.setTaskStatus);
  const toggleHabitDay = usePlannerStore((s) => s.toggleHabitDay);

  const now = new Date();
  const todayEvents = useMemo(() => {
    const horizon = addDays(now, 1);
    const inst = expandAll(events, now, horizon);
    return inst
      .filter((i) => isSameDay(i.start, now))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events]);

  // Next 3 days (excluding today) for the "Coming up" preview.
  const upcomingByDay = useMemo(() => {
    const start = addDays(now, 1);
    const horizon = addDays(now, 4);
    const inst = expandAll(events, start, horizon)
      .filter((i) => i.start >= start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    const buckets: { day: Date; events: typeof inst }[] = [];
    for (let i = 1; i <= 3; i++) {
      const day = addDays(now, i);
      buckets.push({ day, events: inst.filter((e) => isSameDay(e.start, day)) });
    }
    return buckets;
  }, [events]);

  const dueOrOpen = useMemo(
    () => tasks.filter((t) => t.status !== 'done').slice(0, 6),
    [tasks],
  );
  const doneToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === 'done' &&
          t.completedAt &&
          isSameDay(fromISO(t.completedAt), now),
      ).length,
    [tasks],
  );

  const todayKey = dayKey(now);
  const habitsDoneToday = habits.filter((h) => h.completions[todayKey]).length;

  const weekStart = startOfWeek(now, { weekStartsOn: settings.weekStartsOn });
  const wkKey = dayKey(weekStart);
  const weekGoals = goals.filter((g) => g.weekStart === wkKey);
  const goalsDone = weekGoals.filter((g) => g.done).length;

  const hours = now.getHours();
  const greet = hours < 5 ? 'Late night' : hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : hours < 22 ? 'Good evening' : 'Late night';
  const firstName = settings.displayName.trim().split(/\s+/)[0];
  const title = firstName ? `${greet}, ${firstName}` : greet;
  const focus = settings.focusAreas;

  return (
    <ModulePage
      id="dashboard"
      title={title}
      subtitle={format(now, 'EEEE, MMMM d')}
      avatarEmoji={settings.avatarEmoji}
    >
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-6xl mx-auto">
        {focus.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
              Focus
            </span>
            {focus.map((f) => (
              <span
                key={f}
                className="chip text-white max-w-full truncate"
                style={{
                  background: `linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #ec4899))`,
                }}
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Top stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard
            icon={<Calendar size={16} />}
            label="Events today"
            value={todayEvents.length}
            accent="var(--m-calendar)"
            onClick={() => setActiveModule('calendar')}
          />
          <StatCard
            icon={<CheckSquare size={16} />}
            label="Tasks open"
            value={dueOrOpen.length}
            sub={`${doneToday} done today`}
            accent="var(--m-tasks)"
            onClick={() => setActiveModule('tasks')}
          />
          <StatCard
            icon={<Repeat size={16} />}
            label="Habits today"
            value={`${habitsDoneToday}/${habits.length}`}
            accent="var(--m-habits)"
            onClick={() => setActiveModule('habits')}
          />
          <StatCard
            icon={<Target size={16} />}
            label="Weekly goals"
            value={`${goalsDone}/${weekGoals.length}`}
            accent="var(--m-goals)"
            onClick={() => setActiveModule('goals')}
          />
        </div>

        {/* Today's schedule + focus task */}
        <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
          <section className="card p-4 sm:p-5 lg:col-span-2">
            <Header
              title="Today's schedule"
              accent="var(--m-calendar)"
              icon={<Sun size={14} />}
              onMore={() => setActiveModule('calendar')}
            />
            {todayEvents.length === 0 ? (
              <Empty text="No events scheduled. A blank canvas." />
            ) : (
              <ul className="mt-3 space-y-1.5">
                {todayEvents.map((inst) => (
                  <li
                    key={inst.occurrenceKey}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-[11px] font-mono tabular-nums w-16 text-slate-500 dark:text-slate-400">
                      {formatTime(inst.start, settings.use24HourClock)}
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: 'var(--m-calendar)' }} />
                    <span className="text-sm flex-1 truncate">{inst.event.title}</span>
                    {inst.event.location && (
                      <span className="text-[11px] text-slate-400 truncate max-w-32">{inst.event.location}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4 sm:p-5">
            <Header
              title="Quick tasks"
              accent="var(--m-tasks)"
              icon={<CheckSquare size={14} />}
              onMore={() => setActiveModule('tasks')}
            />
            {dueOrOpen.length === 0 ? (
              <Empty text="Inbox zero. Nice." />
            ) : (
              <ul className="mt-3 space-y-1">
                {dueOrOpen.slice(0, 5).map((t) => (
                  <li key={t.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03]">
                    <button
                      onClick={() => setTaskStatus(t.id, 'done')}
                      className="h-4 w-4 rounded-md border border-slate-300 dark:border-slate-600 hover:border-[color:var(--m-tasks)] transition-colors"
                      aria-label="Complete"
                    />
                    <span className="text-sm flex-1 truncate">{t.title}</span>
                    {t.priority === 'high' || t.priority === 'urgent' ? (
                      <span className="chip" style={{ background: 'rgba(244,63,94,0.12)', color: '#e11d48' }}>
                        {t.priority}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Coming up — next 3 days */}
        {upcomingByDay.some((b) => b.events.length > 0) && (
          <section className="card p-4 sm:p-5">
            <Header
              title="Coming up"
              accent="var(--m-calendar)"
              icon={<Calendar size={14} />}
              onMore={() => setActiveModule('calendar')}
            />
            <div className="mt-3 space-y-3">
              {upcomingByDay.map((bucket) => (
                <div key={bucket.day.toISOString()}>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--m-calendar)' }}>
                      {format(bucket.day, 'EEE')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {format(bucket.day, 'MMM d')}
                    </span>
                    {bucket.events.length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">nothing scheduled</span>
                    )}
                  </div>
                  {bucket.events.length > 0 && (
                    <ul className="space-y-1 pl-0">
                      {bucket.events.slice(0, 4).map((inst) => (
                        <li
                          key={inst.occurrenceKey}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                        >
                          <span className="text-[11px] font-mono tabular-nums w-14 text-slate-500 dark:text-slate-400 shrink-0">
                            {inst.event.allDay ? 'all day' : formatTime(inst.start, settings.use24HourClock)}
                          </span>
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: 'var(--m-calendar)' }}
                          />
                          <span className="text-sm flex-1 truncate">{inst.event.title}</span>
                        </li>
                      ))}
                      {bucket.events.length > 4 && (
                        <li className="pl-[68px] text-[11px] text-slate-400">
                          + {bucket.events.length - 4} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Habits row */}
        <section className="card p-4 sm:p-5">
          <Header
            title="Habit pulse"
            accent="var(--m-habits)"
            icon={<Repeat size={14} />}
            onMore={() => setActiveModule('habits')}
          />
          {habits.length === 0 ? (
            <Empty text="No habits yet. Add one to start a streak." />
          ) : (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {habits.map((h) => {
                const done = !!h.completions[todayKey];
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHabitDay(h.id, now)}
                    className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-[1px]"
                    style={{
                      borderColor: done ? h.color : 'var(--border)',
                      background: done
                        ? `color-mix(in srgb, ${h.color} 14%, transparent)`
                        : 'transparent',
                    }}
                  >
                    <span
                      className="grid h-7 w-7 place-items-center rounded-lg text-base"
                      style={{
                        background: done ? h.color : `${h.color}22`,
                        color: done ? 'white' : h.color,
                      }}
                    >
                      {h.emoji || '✦'}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate">{h.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Spotlight */}
        <section
          className="card p-4 sm:p-5 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--m-ai) 10%, transparent), transparent 60%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="module-icon-bubble" style={{ ['--m' as string]: 'var(--m-ai)' }}>
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Need a hand planning?</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Ask the AI to summarize your week, suggest goals, or draft a plan.
              </p>
            </div>
            <button
              onClick={() => setActiveModule('ai')}
              className="btn-secondary !text-xs shrink-0"
            >
              <span className="hidden sm:inline">Open AI</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </section>
      </div>
    </ModulePage>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  onClick?: () => void;
}
function StatCard({ icon, label, value, sub, accent, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="stat-card !p-3 sm:!p-5 text-left transition-all hover:-translate-y-[1px] min-w-0"
      style={{ ['--m' as string]: accent }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 truncate">
        <span style={{ color: accent }} className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{sub}</div>}
    </button>
  );
}

interface HeaderProps {
  title: string;
  accent: string;
  icon: React.ReactNode;
  onMore?: () => void;
}
function Header({ title, accent, icon, onMore }: HeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span style={{ color: accent }}>{icon}</span>
        {title}
      </h2>
      {onMore && (
        <button
          onClick={onMore}
          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
        >
          Open <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-3 text-sm text-slate-400 dark:text-slate-500 italic">{text}</p>;
}
