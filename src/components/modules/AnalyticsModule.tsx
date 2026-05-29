import { useMemo } from 'react';
import { CheckCircle2, Calendar, Repeat, TrendingUp } from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { addDays, dayKey, format, fromISO, isAfter } from '../../lib/dates';

export function AnalyticsModule() {
  const tasks = usePlannerStore((s) => s.tasks);
  const events = usePlannerStore((s) => s.events);
  const habits = usePlannerStore((s) => s.habits);
  const categories = usePlannerStore((s) => s.categories);

  const today = new Date();
  const last30 = useMemo(() => {
    const start = addDays(today, -29);
    return Array.from({ length: 30 }, (_, i) => addDays(start, i));
  }, []);

  // Tasks completed per day (last 30)
  const tasksByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of last30) m.set(dayKey(d), 0);
    for (const t of tasks) {
      if (t.status === 'done' && t.completedAt) {
        const k = dayKey(fromISO(t.completedAt));
        if (m.has(k)) m.set(k, (m.get(k) || 0) + 1);
      }
    }
    return last30.map((d) => ({ date: d, count: m.get(dayKey(d)) || 0 }));
  }, [tasks, last30]);

  const totalCompleted = tasks.filter((t) => t.status === 'done').length;
  const totalOpen = tasks.filter((t) => t.status !== 'done').length;
  const completionRate = totalCompleted + totalOpen > 0
    ? Math.round((totalCompleted / (totalCompleted + totalOpen)) * 100)
    : 0;

  // Events per category
  const eventsByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const key = e.categoryId || 'uncategorized';
      m.set(key, (m.get(key) || 0) + 1);
    }
    const items = Array.from(m.entries()).map(([id, count]) => {
      const cat = categories.find((c) => c.id === id);
      return { id, name: cat?.name ?? 'Uncategorized', color: cat?.color ?? '#94a3b8', count };
    });
    items.sort((a, b) => b.count - a.count);
    return items;
  }, [events, categories]);

  // Habit consistency (last 30 days)
  const habitConsistency = useMemo(() => {
    return habits.map((h) => {
      const completed = last30.filter((d) => h.completions[dayKey(d)]).length;
      return { ...h, completed, pct: Math.round((completed / 30) * 100) };
    });
  }, [habits, last30]);

  const max = Math.max(1, ...tasksByDay.map((t) => t.count));

  // Upcoming load
  const next7 = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < 7; i++) m.set(dayKey(addDays(today, i)), 0);
    for (const e of events) {
      const start = fromISO(e.start);
      const k = dayKey(start);
      if (m.has(k) && isAfter(start, addDays(today, -1))) m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries()).map(([k, count]) => ({ date: fromISO(k), count }));
  }, [events]);

  return (
    <ModulePage id="analytics">
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-6xl mx-auto">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Kpi icon={<CheckCircle2 size={16} />} label="Tasks done" value={totalCompleted} accent="var(--m-tasks)" />
          <Kpi icon={<TrendingUp size={16} />} label="Completion rate" value={`${completionRate}%`} accent="var(--m-habits)" />
          <Kpi icon={<Calendar size={16} />} label="Events" value={events.length} accent="var(--m-calendar)" />
          <Kpi icon={<Repeat size={16} />} label="Habits tracked" value={habits.length} accent="var(--m-journal)" />
        </div>

        {/* Tasks completed sparkline */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold mb-1">Tasks completed — last 30 days</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Total: {tasksByDay.reduce((a, b) => a + b.count, 0)}
          </p>
          <div className="flex items-end gap-0.5 h-32">
            {tasksByDay.map((d) => (
              <div
                key={d.date.toISOString()}
                className="flex-1 rounded-sm transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(2, (d.count / max) * 100)}%`,
                  background: d.count
                    ? 'linear-gradient(180deg, var(--m-tasks), color-mix(in srgb, var(--m-tasks) 60%, transparent))'
                    : 'color-mix(in srgb, currentColor 8%, transparent)',
                }}
                title={`${format(d.date, 'MMM d')}: ${d.count}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-slate-400 tabular-nums">
            <span>{format(last30[0], 'MMM d')}</span>
            <span>{format(last30[15], 'MMM d')}</span>
            <span>{format(last30[29], 'MMM d')}</span>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Time by category */}
          <section className="card p-5">
            <h3 className="text-sm font-semibold mb-3">Events by category</h3>
            {eventsByCategory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No events yet</p>
            ) : (
              <div className="space-y-2.5">
                {eventsByCategory.map((c) => {
                  const total = events.length;
                  const pct = (c.count / total) * 100;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                        <span className="text-slate-500 tabular-nums">{c.count} · {Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: c.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Habit consistency */}
          <section className="card p-5">
            <h3 className="text-sm font-semibold mb-3">Habit consistency · 30d</h3>
            {habitConsistency.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No habits tracked yet</p>
            ) : (
              <div className="space-y-2.5">
                {habitConsistency.map((h) => (
                  <div key={h.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-2">
                        <span>{h.emoji}</span>
                        {h.name}
                      </span>
                      <span className="text-slate-500 tabular-nums">{h.completed}/30 · {h.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${h.pct}%`, background: h.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Upcoming load */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold mb-3">Schedule load — next 7 days</h3>
          <div className="grid grid-cols-7 gap-2">
            {next7.map((d) => (
              <div key={d.date.toISOString()} className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">{format(d.date, 'EEE')}</div>
                <div
                  className="mt-1 h-16 rounded-lg flex items-end justify-center transition-all"
                  style={{
                    background:
                      d.count > 0
                        ? `linear-gradient(180deg, transparent, color-mix(in srgb, var(--m-calendar) ${Math.min(60, 20 + d.count * 12)}%, transparent))`
                        : 'color-mix(in srgb, currentColor 5%, transparent)',
                  }}
                >
                  <span className="text-xs font-semibold pb-1.5 tabular-nums">{d.count || ''}</span>
                </div>
                <div className="text-[10px] mt-0.5 text-slate-500">{format(d.date, 'd')}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ModulePage>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="stat-card" style={{ ['--m' as string]: accent }}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
