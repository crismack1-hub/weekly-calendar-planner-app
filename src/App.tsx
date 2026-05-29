import { useEffect } from 'react';
import { usePlannerStore } from './store/plannerStore';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { EventModal } from './components/EventModal';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { AuthModal } from './components/AuthModal';
import { InstallApp } from './components/InstallApp';
import { ReminderToasts } from './components/ReminderToasts';
import { ShareModal } from './components/ShareModal';
import { InviteHandler } from './components/InviteHandler';
import { ModuleRail } from './components/ModuleRail';
import { BottomNav } from './components/BottomNav';
import { PersonalizeModal } from './components/PersonalizeModal';
import { SaveIndicator } from './components/SaveIndicator';
import { useBreakpoint } from './hooks/useMediaQuery';
import { expandAll } from './lib/recurrence';
import { fireReminders } from './lib/notifications';
import { useAuth } from './hooks/useAuth';
import { startSync, stopSync } from './lib/sync';
import { startEntitlements, stopEntitlements } from './lib/entitlements';

import { CalendarModule } from './components/modules/CalendarModule';
import { TodayModule } from './components/modules/TodayModule';
import { DashboardModule } from './components/modules/DashboardModule';
import { TasksModule } from './components/modules/TasksModule';
import { NotesModule } from './components/modules/NotesModule';
import { TravelModule } from './components/modules/TravelModule';
import { JournalModule } from './components/modules/JournalModule';
import { HabitsModule } from './components/modules/HabitsModule';
import { GoalsModule } from './components/modules/GoalsModule';
import { AnalyticsModule } from './components/modules/AnalyticsModule';
import { FinanceModule } from './components/modules/FinanceModule';
import { MedicationsModule } from './components/modules/MedicationsModule';
import { MealsModule } from './components/modules/MealsModule';
import { FitnessModule } from './components/modules/FitnessModule';
import { ReadingModule } from './components/modules/ReadingModule';
import { BucketModule } from './components/modules/BucketModule';
import { AIModule } from './components/modules/AIModule';
import { StubModule } from './components/modules/StubModule';

export default function App() {
  useTheme();
  useKeyboardShortcuts();
  const { user } = useAuth();

  const activeModule = usePlannerStore((s) => s.activeModule);
  const events = usePlannerStore((s) => s.events);
  const notificationsEnabled = usePlannerStore((s) => s.settings.notificationsEnabled);
  const activeOwnerId = usePlannerStore((s) => s.activeOwnerId);

  // Start / stop cloud sync + entitlements as auth changes
  useEffect(() => {
    if (user) {
      startSync(user.id, activeOwnerId || user.id);
      startEntitlements(user.id);
    } else {
      stopSync();
      stopEntitlements();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    const tick = () => {
      const now = new Date();
      const horizon = new Date(now.getTime() + 24 * 3600 * 1000);
      const inst = expandAll(events, now, horizon);
      fireReminders(inst);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [events, notificationsEnabled]);

  const bp = useBreakpoint();
  const isPhone = bp === 'phone';

  return (
    <div
      className={`h-screen overflow-hidden relative ${isPhone ? 'flex flex-col' : 'flex'}`}
      data-breakpoint={bp}
    >
      {/* Phone: bottom nav. Tablet/desktop: persistent side rail. */}
      {!isPhone && <ModuleRail />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <InstallApp variant="banner" />
        <main className="flex-1 overflow-hidden">
          {renderModule(activeModule)}
        </main>
      </div>

      {isPhone && <BottomNav />}

      <SaveIndicator />

      <EventModal />
      <CommandPalette />
      <SettingsModal />
      <PersonalizeModal />
      <ImportExportModal />
      <AuthModal />
      <ShareModal />
      <ReminderToasts />
      <InviteHandler />
    </div>
  );
}

function renderModule(id: ReturnType<typeof usePlannerStore.getState>['activeModule']): React.ReactNode {
  switch (id) {
    case 'today':
      return <TodayModule />;
    case 'dashboard':
      return <DashboardModule />;
    case 'calendar':
      return <CalendarModule />;
    case 'tasks':
      return <TasksModule />;
    case 'notes':
      return <NotesModule />;
    case 'travel':
      return <TravelModule />;
    case 'journal':
      return <JournalModule />;
    case 'habits':
      return <HabitsModule />;
    case 'goals':
      return <GoalsModule />;
    case 'analytics':
      return <AnalyticsModule />;
    case 'finance':
      return <FinanceModule />;
    case 'medications':
      return <MedicationsModule />;
    case 'meals':
      return <MealsModule />;
    case 'fitness':
      return <FitnessModule />;
    case 'reading':
      return <ReadingModule />;
    case 'bucket':
      return <BucketModule />;
    case 'ai':
      return <AIModule />;
    case 'vision':
      return (
        <StubModule
          id="vision"
          blurb="A canvas for the future you. Pin images, quotes, and goals so the long-term stays visible day to day."
          features={[
            'Image grid with drag-to-rearrange tiles',
            'Quote pinning with elegant typography',
            'Linked to long-term goals from the Goals tab',
            'Yearly snapshot saved to the Archive',
          ]}
        />
      );
    case 'archive':
      return (
        <StubModule
          id="archive"
          blurb="Past months, completed projects, and old notes — searchable but out of the way."
          features={[
            'Auto-archive completed projects and finished goals',
            'Full-text search across past notes and journal entries',
            'Year-in-review summaries',
            'Restore items back to active modules in one click',
          ]}
        />
      );
    default:
      return null;
  }
}
