import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAutosave, type AutosaveStatus } from '../hooks/useAutosave';

/**
 * Tiny, unobtrusive autosave indicator. Renders the same across all
 * breakpoints (phone bottom-nav area, tablet, desktop top-bar) so users
 * always have a confirmation that their data is persisted.
 *
 * Positioned via `fixed` in the corner so it doesn't fight any module's
 * own layout. The chip stays muted by default and only flashes when an
 * actual save is in flight, keeping the UI calm.
 */
export function SaveIndicator() {
  const { status, lastSavedAt } = useAutosave();
  const label = useStatusLabel(status, lastSavedAt);
  const palette = STATUS_PALETTE[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'pointer-events-none fixed z-30 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition-all',
        // Sit above the phone bottom-nav, but tucked in the corner on tablet/desktop
        'bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-3',
        'sm:bottom-3 sm:right-3',
        palette.cls,
      )}
      style={palette.style}
    >
      {status === 'saving' ? (
        <Loader2 size={11} className="animate-spin" />
      ) : status === 'error' ? (
        <CloudOff size={11} />
      ) : status === 'saved' || status === 'idle' ? (
        <Check size={11} />
      ) : (
        <Cloud size={11} />
      )}
      <span className="tabular-nums">{label}</span>
    </div>
  );
}

const STATUS_PALETTE: Record<AutosaveStatus, { cls: string; style?: React.CSSProperties }> = {
  idle: {
    cls: 'border-[color:var(--border)] bg-white/70 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400',
  },
  pending: {
    cls: 'border-amber-400/30 bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  },
  saving: {
    cls: 'border-sky-400/30 bg-sky-100/70 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  },
  saved: {
    cls: 'border-emerald-400/30 bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  },
  error: {
    cls: 'border-rose-400/30 bg-rose-100/70 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  },
};

function useStatusLabel(status: AutosaveStatus, lastSavedAt: number | null): string {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Re-render the relative timestamp every 15s so "saved 2m ago" stays fresh
    if (status !== 'saved' || lastSavedAt == null) return;
    const id = window.setInterval(() => setTick((v) => v + 1), 15_000);
    return () => window.clearInterval(id);
  }, [status, lastSavedAt]);
  // Tick is referenced so React keeps the dependency live even though we
  // don't compute against it directly. Suppress unused-var warning explicitly.
  void tick;

  switch (status) {
    case 'idle':
      return 'Ready';
    case 'pending':
      return 'Editing…';
    case 'saving':
      return 'Saving…';
    case 'error':
      return 'Save failed';
    case 'saved':
      if (lastSavedAt == null) return 'Saved';
      return `Saved ${formatRelative(Date.now() - lastSavedAt)}`;
  }
}

function formatRelative(deltaMs: number): string {
  const s = Math.max(1, Math.round(deltaMs / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}
