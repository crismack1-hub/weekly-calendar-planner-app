import { TopBar } from '../TopBar';
import { Sidebar } from '../Sidebar';
import { WeekView } from '../WeekView';
import { MonthView } from '../MonthView';
import { AgendaView } from '../AgendaView';
import { usePlannerStore } from '../../store/plannerStore';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { fromISO } from '../../lib/dates';

export function CalendarModule() {
  const view = usePlannerStore((s) => s.view);
  const currentDate = usePlannerStore((s) => s.currentDate);
  const sidebarOpen = usePlannerStore((s) => s.sidebarOpen);
  const toggleSidebar = usePlannerStore((s) => s.toggleSidebar);
  const isMobile = useIsMobile();

  const ref = fromISO(currentDate);

  return (
    <div className="flex h-full overflow-hidden">
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden animate-fade-in"
              onClick={toggleSidebar}
              aria-hidden
            />
          )}
          <div
            className={`fixed inset-y-0 left-14 z-50 w-72 transform transition-transform duration-200 md:hidden ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar onCloseMobile={toggleSidebar} />
          </div>
        </>
      ) : (
        sidebarOpen && <Sidebar />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          {/* On mobile, "Week" collapses to a single-day timeline so users
              can actually read their schedule. Users can still navigate
              day-by-day with the chevrons, or pick Agenda/Month for an
              overview. */}
          {view === 'week' && <WeekView referenceDate={ref} singleDay={isMobile} />}
          {view === 'day' && <WeekView referenceDate={ref} singleDay />}
          {view === 'month' && <MonthView referenceDate={ref} />}
          {view === 'agenda' && <AgendaView referenceDate={ref} />}
        </main>
      </div>
    </div>
  );
}
