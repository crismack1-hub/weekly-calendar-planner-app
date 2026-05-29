import { useState } from 'react';
import { Sun, CalendarDays, CheckSquare, MoreHorizontal, Sparkles, X, Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';
import type { ModuleId } from '../types';
import { usePlannerStore } from '../store/plannerStore';
import { MODULE_META } from './ModuleRail';
import { APPS, CORE_MODULES } from '../lib/apps';

// Four anchor tabs at the bottom of the phone layout. Everything else lives in
// the "More" sheet so the bar stays thumb-reachable.
const PRIMARY: { id: ModuleId; label: string; Icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', Icon: Sun },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', Icon: CheckSquare },
  { id: 'ai', label: 'AI', Icon: Sparkles },
];

export function BottomNav() {
  const active = usePlannerStore((s) => s.activeModule);
  const setActiveModule = usePlannerStore((s) => s.setActiveModule);
  const toggleSettings = usePlannerStore((s) => s.toggleSettings);
  const visibleModules = usePlannerStore((s) => s.settings.visibleModules);
  const [moreOpen, setMoreOpen] = useState(false);

  const isVisible = (id: ModuleId) =>
    !visibleModules || visibleModules.length === 0 || visibleModules.includes(id) || CORE_MODULES.includes(id);

  const moreActive = !PRIMARY.some((p) => p.id === active);

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="grid grid-cols-5 gap-1 border-t border-[color:var(--border)] bg-[color:var(--bg-card)] px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {PRIMARY.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => setActiveModule(id)}
              data-active={isActive}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors"
              style={{ ['--m' as string]: `var(--m-${id})` }}
              aria-label={label}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 2}
                style={{ color: isActive ? `var(--m-${id})` : undefined }}
              />
              <span
                className={clsx(
                  'text-[10px] font-medium leading-none',
                  isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors"
          aria-label="More"
        >
          <MoreHorizontal
            size={20}
            strokeWidth={moreActive ? 2.4 : 2}
            style={{ color: moreActive ? 'var(--accent)' : undefined }}
          />
          <span
            className={clsx(
              'text-[10px] font-medium leading-none',
              moreActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400',
            )}
          >
            More
          </span>
        </button>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-label="More modules"
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[color:var(--bg-card)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)] animate-slide-up calendar-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">All modules</h2>
              <button onClick={() => setMoreOpen(false)} className="btn-ghost p-1.5" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Dashboard tile */}
            <ModuleTile
              id="dashboard"
              active={active === 'dashboard'}
              onSelect={() => {
                setActiveModule('dashboard');
                setMoreOpen(false);
              }}
            />

            {APPS.map((app) => {
              const items = app.modules.filter(isVisible);
              if (items.length === 0) return null;
              return (
                <section key={app.id} className="mt-4">
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: app.color, boxShadow: `0 0 6px ${app.color}99` }}
                    />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {app.label}
                    </h3>
                    <span className="text-[11px] text-slate-400">{app.tagline}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((id) => (
                      <ModuleTile
                        key={id}
                        id={id}
                        active={active === id}
                        onSelect={() => {
                          setActiveModule(id);
                          setMoreOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            <button
              onClick={() => {
                toggleSettings(true);
                setMoreOpen(false);
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] py-3 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              <SettingsIcon size={15} /> Settings
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ModuleTile({
  id,
  active,
  onSelect,
}: {
  id: ModuleId;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = MODULE_META[id];
  const Icon = meta.icon;
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-all',
        active
          ? 'border-transparent text-white shadow-md'
          : 'border-[color:var(--border)] bg-white dark:bg-white/[0.03] hover:border-[color:var(--border-strong)]',
      )}
      style={active ? { background: meta.cssVar } : { ['--m' as string]: meta.cssVar }}
    >
      <Icon
        size={20}
        strokeWidth={2.2}
        style={{ color: active ? '#fff' : (meta.cssVar as string) }}
      />
      <span className="text-[11px] font-medium leading-none">{meta.label}</span>
    </button>
  );
}
