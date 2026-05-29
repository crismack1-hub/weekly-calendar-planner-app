import type { ModuleId } from '../types';

/**
 * The Today platform is conceptually:
 *   • One **Core** — always-on essentials shared across the workspace
 *     (Agenda, Dashboard, AI assistant, Settings)
 *   • Four **Apps** — themed collections of modules a user opts into
 *
 * This file is the SINGLE SOURCE OF TRUTH for the Core + Apps layout. It is
 * consumed by:
 *   - the ModuleRail (visual grouping + ordering)
 *   - the PersonalizeModal (bulk + per-module toggles)
 *   - the Today launchpad (4-tile entry points)
 *   - the sync layer (does not care, but stays consistent)
 *
 * To add a new module:
 *   1. Append the id to `ModuleId` in `src/types.ts`
 *   2. Add an entry to `MODULE_META` + `ITEMS` in `src/components/ModuleRail.tsx`
 *      (display name, icon, accent CSS var)
 *   3. Add the module id to the appropriate `APPS[*].modules` array below
 *   4. Add a `case` in `renderModule()` inside `src/App.tsx`
 *   5. (Optional) Add a `--m-<id>` accent token in `src/index.css`
 *   6. (Optional) Add Supabase tables + sync mappers if the module persists data
 */
export interface AppDef {
  id: 'plan' | 'grow' | 'live' | 'dream';
  label: string;
  tagline: string;
  /** Hex (or CSS var) used as the app's identity color */
  color: string;
  modules: ModuleId[];
}

export const CORE_MODULES: ModuleId[] = ['today', 'dashboard', 'ai'];

export const APPS: AppDef[] = [
  {
    id: 'plan',
    label: 'Plan',
    tagline: 'Schedule, prioritize, capture, and travel',
    color: '#0ea5e9', // sky
    modules: ['calendar', 'tasks', 'notes', 'travel'],
  },
  {
    id: 'grow',
    label: 'Grow',
    tagline: 'Build routines, track progress, reflect',
    color: '#22c55e', // green
    modules: ['habits', 'goals', 'journal', 'analytics'],
  },
  {
    id: 'live',
    label: 'Live',
    tagline: 'Take care of body, money, and mind',
    color: '#f43f5e', // rose
    modules: ['medications', 'meals', 'fitness', 'finance', 'reading'],
  },
  {
    id: 'dream',
    label: 'Dream',
    tagline: 'Long-term inspiration and memory',
    color: '#a855f7', // purple
    modules: ['vision', 'bucket', 'archive'],
  },
];

/** Convenience: every module that belongs to a user-toggleable app */
export const APP_MODULES: ModuleId[] = APPS.flatMap((a) => a.modules);

/** All known modules (core + apps), in display order */
export const ALL_MODULES: ModuleId[] = [...CORE_MODULES.slice(0, 2), ...APP_MODULES, 'ai'];

/** Look up which app a module belongs to (returns undefined for core modules) */
export function appForModule(id: ModuleId): AppDef | undefined {
  return APPS.find((a) => a.modules.includes(id));
}
