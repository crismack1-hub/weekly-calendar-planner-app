import { type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { useBreakpoint } from '../hooks/useMediaQuery';

interface SplitViewProps {
  /** Always-visible on tablet/desktop; toggles with detail on phone. */
  master: ReactNode;
  /** Shown beside master on tablet/desktop; full-screen on phone. */
  detail: ReactNode;
  /**
   * True when a row is selected. On phone, controls which pane is visible —
   * the master list collapses while a detail is open. On tablet/desktop both
   * stay visible side-by-side and this is only used to render the back chevron.
   */
  hasSelection: boolean;
  /** Called by the back-chevron on phone to clear selection. */
  onClearSelection: () => void;
  /**
   * Width of the master pane on tablet (and desktop) in Tailwind sizing.
   * Defaults to `18rem` which matches the existing NotesModule layout.
   */
  masterWidth?: string;
  /** Empty-state shown in the detail area when nothing is selected. */
  emptyState?: ReactNode;
  /** Optional id used for data-testid / aria hooks. */
  id?: string;
}

/**
 * Two-pane master/detail layout. Behaviour scales with breakpoint:
 *   - phone  : one pane at a time; selecting pushes detail; back chevron returns
 *   - tablet : narrow master (~18rem) + flexible detail (iPad-Mail style)
 *   - desktop: same as tablet but more generous breathing room
 *
 * The component is intentionally state-free — selection is owned by the parent
 * so each module can persist its own active row to URL, store, or localStorage.
 */
export function SplitView({
  master,
  detail,
  hasSelection,
  onClearSelection,
  masterWidth = '18rem',
  emptyState,
  id,
}: SplitViewProps) {
  const bp = useBreakpoint();
  const isPhone = bp === 'phone';

  if (isPhone) {
    return (
      <div data-split={id} className="flex h-full flex-col overflow-hidden">
        {hasSelection ? (
          <div className="flex h-full flex-col overflow-hidden">
            <button
              onClick={onClearSelection}
              className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 border-b border-[color:var(--border)] hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <div className="flex-1 overflow-hidden">{detail}</div>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">{master}</div>
        )}
      </div>
    );
  }

  return (
    <div
      data-split={id}
      className={clsx('grid h-full overflow-hidden')}
      style={{ gridTemplateColumns: `${masterWidth} 1fr` }}
    >
      <aside className="border-r border-[color:var(--border)] flex flex-col overflow-hidden">
        {master}
      </aside>
      <section className="flex flex-col overflow-hidden">
        {hasSelection ? detail : emptyState ?? <DefaultEmpty />}
      </section>
    </div>
  );
}

function DefaultEmpty() {
  return (
    <div className="flex-1 grid place-items-center text-sm text-slate-400 italic">
      Select an item from the list
    </div>
  );
}
