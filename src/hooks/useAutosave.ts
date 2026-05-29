import { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { saveState } from '../lib/storage';
import type { PlannerState } from '../types';

const AUTOSAVE_INTERVAL_MS = 3_000;

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface AutosaveState {
  status: AutosaveStatus;
  /** When the last successful save completed (ms epoch), null until first save. */
  lastSavedAt: number | null;
}

/**
 * Periodic autosave for the planner state. Runs on every breakpoint — phone,
 * tablet, and desktop — and ticks every {@link AUTOSAVE_INTERVAL_MS}.
 *
 * The store already saves synchronously on each commit, so this is best
 * understood as:
 *   1. **A safety net** for state paths that don't route through commit
 *      (mostly UI state and some sync mutations).
 *   2. **A user-visible signal** that data has landed — the small "Saved 2s
 *      ago" pip is the surface that proves it.
 *
 * Subscribes via `usePlannerStore.subscribe` so we only re-save when the
 * underlying data actually changed, not on every interval tick.
 */
export function useAutosave(): AutosaveState {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // We snapshot the last-saved data identity (via JSON length + a cheap hash)
  // so we don't write to localStorage every 3s when nothing has changed.
  const dirtyRef = useRef(false);
  const lastSerializedRef = useRef<string>('');

  useEffect(() => {
    const unsub = usePlannerStore.subscribe((state, prev) => {
      // Only mark dirty when one of the persisted data slices actually
      // changed. We compare by reference — zustand creates a new array/object
      // for each commit, so this is cheap and correct.
      const dataKeys: (keyof PlannerState)[] = [
        'events',
        'categories',
        'goals',
        'habits',
        'tasks',
        'projects',
        'notes',
        'journal',
        'transactions',
        'books',
        'bucket',
        'trips',
        'tripItems',
        'medications',
        'meals',
        'workouts',
        'settings',
      ];
      for (const k of dataKeys) {
        if (state[k] !== prev[k]) {
          dirtyRef.current = true;
          setStatus((cur) => (cur === 'saving' ? cur : 'pending'));
          return;
        }
      }
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!dirtyRef.current) return;
      const store = usePlannerStore.getState();
      const snap: PlannerState = {
        events: store.events,
        categories: store.categories,
        goals: store.goals,
        habits: store.habits,
        tasks: store.tasks,
        projects: store.projects,
        notes: store.notes,
        journal: store.journal,
        transactions: store.transactions,
        books: store.books,
        bucket: store.bucket,
        trips: store.trips,
        tripItems: store.tripItems,
        medications: store.medications,
        meals: store.meals,
        workouts: store.workouts,
        settings: store.settings,
      };
      // Serialize once for the dedup check + the write — JSON.stringify is the
      // hot path here so we want exactly one pass.
      const serialized = JSON.stringify(snap);
      if (serialized === lastSerializedRef.current) {
        dirtyRef.current = false;
        return;
      }
      setStatus('saving');
      try {
        saveState(snap, store.activeOwnerId);
        lastSerializedRef.current = serialized;
        dirtyRef.current = false;
        setStatus('saved');
        setLastSavedAt(Date.now());
      } catch (e) {
        console.error('Autosave failed', e);
        setStatus('error');
      }
    }, AUTOSAVE_INTERVAL_MS);

    // Save once on tab hide so we don't lose the last few seconds of edits.
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden' || !dirtyRef.current) return;
      const store = usePlannerStore.getState();
      const snap: PlannerState = {
        events: store.events,
        categories: store.categories,
        goals: store.goals,
        habits: store.habits,
        tasks: store.tasks,
        projects: store.projects,
        notes: store.notes,
        journal: store.journal,
        transactions: store.transactions,
        books: store.books,
        bucket: store.bucket,
        trips: store.trips,
        tripItems: store.tripItems,
        medications: store.medications,
        meals: store.meals,
        workouts: store.workouts,
        settings: store.settings,
      };
      saveState(snap, store.activeOwnerId);
      lastSerializedRef.current = JSON.stringify(snap);
      dirtyRef.current = false;
      setLastSavedAt(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { status, lastSavedAt };
}
