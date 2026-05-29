import {
  LayoutDashboard,
  Sun,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Plane,
  BookHeart,
  Repeat,
  Target,
  BarChart3,
  Wallet,
  UtensilsCrossed,
  Dumbbell,
  Pill,
  BookOpen,
  Image as ImageIcon,
  ListChecks,
  Archive,
  Sparkles,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId } from '../types';
import { usePlannerStore } from '../store/plannerStore';
import { LogoMark } from './Logo';
import { APPS, CORE_MODULES } from '../lib/apps';

type Item = {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  cssVar: string;
};

// Module → Item lookup, built from MODULE_META below
const ITEMS: Record<ModuleId, Item> = {
  today: { id: 'today', label: 'Agenda', icon: Sun, cssVar: 'var(--m-today)' },
  dashboard: { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, cssVar: 'var(--m-dashboard)' },
  calendar: { id: 'calendar', label: 'Calendar', icon: CalendarDays, cssVar: 'var(--m-calendar)' },
  tasks: { id: 'tasks', label: 'Tasks', icon: CheckSquare, cssVar: 'var(--m-tasks)' },
  notes: { id: 'notes', label: 'Notes', icon: StickyNote, cssVar: 'var(--m-notes)' },
  travel: { id: 'travel', label: 'Travel', icon: Plane, cssVar: 'var(--m-travel)' },
  habits: { id: 'habits', label: 'Habits', icon: Repeat, cssVar: 'var(--m-habits)' },
  goals: { id: 'goals', label: 'Goals', icon: Target, cssVar: 'var(--m-goals)' },
  journal: { id: 'journal', label: 'Journal', icon: BookHeart, cssVar: 'var(--m-journal)' },
  analytics: { id: 'analytics', label: 'Analytics', icon: BarChart3, cssVar: 'var(--m-analytics)' },
  finance: { id: 'finance', label: 'Finance', icon: Wallet, cssVar: 'var(--m-finance)' },
  medications: { id: 'medications', label: 'Medications', icon: Pill, cssVar: 'var(--m-medications)' },
  meals: { id: 'meals', label: 'Meals', icon: UtensilsCrossed, cssVar: 'var(--m-meals)' },
  fitness: { id: 'fitness', label: 'Fitness', icon: Dumbbell, cssVar: 'var(--m-fitness)' },
  reading: { id: 'reading', label: 'Reading', icon: BookOpen, cssVar: 'var(--m-reading)' },
  vision: { id: 'vision', label: 'Vision', icon: ImageIcon, cssVar: 'var(--m-vision)' },
  bucket: { id: 'bucket', label: 'Bucket list', icon: ListChecks, cssVar: 'var(--m-bucket)' },
  archive: { id: 'archive', label: 'Archive', icon: Archive, cssVar: 'var(--m-archive)' },
  ai: { id: 'ai', label: 'AI Assistant', icon: Sparkles, cssVar: 'var(--m-ai)' },
};

// Modules that can't be hidden by the user (always-on essentials)
const REQUIRED: ModuleId[] = ['today', 'dashboard', 'ai'];

export function ModuleRail() {
  const active = usePlannerStore((s) => s.activeModule);
  const setActiveModule = usePlannerStore((s) => s.setActiveModule);
  const toggleSettings = usePlannerStore((s) => s.toggleSettings);
  const visibleModules = usePlannerStore((s) => s.settings.visibleModules);

  const isVisible = (id: ModuleId): boolean => {
    if (REQUIRED.includes(id)) return true;
    if (!visibleModules || visibleModules.length === 0) return true;
    return visibleModules.includes(id);
  };

  // Core (top): today + dashboard. AI lives at the bottom of the rail.
  const coreItems = CORE_MODULES.filter((id) => id !== 'ai').map((id) => ITEMS[id]).filter((i) => isVisible(i.id));
  // Apps: each one becomes a group. Filter out apps whose modules are all hidden.
  const appGroups = APPS.map((app) => ({
    app,
    items: app.modules.map((id) => ITEMS[id]).filter((i) => isVisible(i.id)),
  })).filter((g) => g.items.length > 0);

  return (
    <nav
      aria-label="Workspace modules"
      className="rail flex h-full w-12 sm:w-14 shrink-0 flex-col items-center gap-1 border-r border-[color:var(--border)] py-2 sm:py-3 overflow-y-auto calendar-scroll"
    >
      <button
        onClick={() => setActiveModule('dashboard')}
        className="grid h-10 w-10 place-items-center rounded-xl transition-transform hover:scale-105 active:scale-95"
        title="Today — Home"
        aria-label="Today home"
      >
        <LogoMark size={28} />
      </button>

      <div
        className="my-2 h-px w-7"
        style={{
          background:
            'linear-gradient(90deg, transparent, color-mix(in srgb, var(--m-dashboard) 30%, transparent), color-mix(in srgb, var(--m-journal) 30%, transparent), transparent)',
        }}
      />

      {/* Core (Today + Dashboard) sits above the app groups */}
      {coreItems.length > 0 && <RailGroup items={coreItems} active={active} onSelect={setActiveModule} />}

      {/* Each app is its own grouped section. The label appears as a tiny
          colored dot above the group so the rail stays narrow on phones. */}
      {appGroups.map(({ app, items }, idx) => (
        <div key={app.id} className="flex flex-col items-center gap-1">
          {(idx > 0 || coreItems.length > 0) && (
            <div
              className="my-1.5 h-px w-7"
              style={{
                background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${app.color} 35%, transparent), transparent)`,
              }}
            />
          )}
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: app.color, boxShadow: `0 0 6px ${app.color}99` }}
            title={`${app.label} — ${app.tagline}`}
            aria-hidden
          />
          <RailGroup items={items} active={active} onSelect={setActiveModule} />
        </div>
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <button
          onClick={() => setActiveModule('ai')}
          data-active={active === 'ai'}
          className="rail-btn"
          style={{ ['--m' as string]: 'var(--m-ai)' }}
          title="AI Assistant"
          aria-label="AI Assistant"
        >
          <Sparkles size={18} strokeWidth={2.3} />
        </button>
        <button
          onClick={() => toggleSettings(true)}
          className="rail-btn"
          style={{ ['--m' as string]: '#64748b' }}
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon size={18} strokeWidth={2.3} />
        </button>
      </div>
    </nav>
  );
}

interface RailGroupProps {
  items: Item[];
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}

function RailGroup({ items, active, onSelect }: RailGroupProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            data-active={active === item.id}
            className="rail-btn group"
            style={{ ['--m' as string]: item.cssVar }}
            title={item.label}
            aria-label={item.label}
          >
            <Icon size={18} strokeWidth={2.3} />
          </button>
        );
      })}
    </div>
  );
}

export const MODULE_META: Record<
  ModuleId,
  { label: string; icon: LucideIcon; cssVar: string; subtitle: string }
> = {
  today: { label: 'Agenda', icon: Sun, cssVar: 'var(--m-today)', subtitle: 'Your full day, in one place' },
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, cssVar: 'var(--m-dashboard)', subtitle: "Today at a glance" },
  calendar: { label: 'Calendar', icon: CalendarDays, cssVar: 'var(--m-calendar)', subtitle: 'Schedule & events' },
  tasks: { label: 'Tasks', icon: CheckSquare, cssVar: 'var(--m-tasks)', subtitle: 'Master list & Kanban' },
  notes: { label: 'Notes', icon: StickyNote, cssVar: 'var(--m-notes)', subtitle: 'Capture & reference' },
  travel: { label: 'Travel', icon: Plane, cssVar: 'var(--m-travel)', subtitle: 'Trips & itineraries' },
  journal: { label: 'Journal', icon: BookHeart, cssVar: 'var(--m-journal)', subtitle: 'Daily reflection' },
  habits: { label: 'Habits', icon: Repeat, cssVar: 'var(--m-habits)', subtitle: 'Streaks & routines' },
  goals: { label: 'Goals', icon: Target, cssVar: 'var(--m-goals)', subtitle: 'Long-term direction' },
  analytics: { label: 'Analytics', icon: BarChart3, cssVar: 'var(--m-analytics)', subtitle: 'Patterns & progress' },
  finance: { label: 'Finance', icon: Wallet, cssVar: 'var(--m-finance)', subtitle: 'Budgets & spend' },
  medications: { label: 'Medications', icon: Pill, cssVar: 'var(--m-medications)', subtitle: 'Doses & reminders' },
  meals: { label: 'Meals', icon: UtensilsCrossed, cssVar: 'var(--m-meals)', subtitle: 'Plan the week' },
  fitness: { label: 'Fitness', icon: Dumbbell, cssVar: 'var(--m-fitness)', subtitle: 'Body & energy' },
  reading: { label: 'Reading', icon: BookOpen, cssVar: 'var(--m-reading)', subtitle: 'Books & progress' },
  vision: { label: 'Vision board', icon: ImageIcon, cssVar: 'var(--m-vision)', subtitle: 'Inspiration & images' },
  bucket: { label: 'Bucket list', icon: ListChecks, cssVar: 'var(--m-bucket)', subtitle: 'Dreams & experiences' },
  archive: { label: 'Archive', icon: Archive, cssVar: 'var(--m-archive)', subtitle: 'Past & completed' },
  ai: { label: 'AI Assistant', icon: Sparkles, cssVar: 'var(--m-ai)', subtitle: 'Plan smarter, faster' },
};
