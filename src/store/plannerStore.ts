import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  BucketItem,
  Book,
  CalendarEvent,
  Category,
  DoseStatus,
  Goal,
  Habit,
  JournalEntry,
  Meal,
  Medication,
  ModuleId,
  Note,
  PlannerState,
  Project,
  Settings,
  Task,
  Transaction,
  Trip,
  TripItem,
  ViewMode,
  Workout,
  Workspace,
} from '../types';
import { loadState, readActiveOwner, saveState, writeActiveOwner } from '../lib/storage';
import { dayKey, toISO, addDays, setTime } from '../lib/dates';
import { allCalendarEvents } from '../lib/integration';

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: '#6366f1',
  bgTheme: 'aurora',
  weekStartsOn: 1,
  workDayStart: 7,
  workDayEnd: 22,
  slotMinutes: 30,
  notificationsEnabled: false,
  showWeekends: true,
  use24HourClock: false,
  currency: 'USD',
  displayName: '',
  avatarEmoji: '✨',
  focusAreas: [],
  visibleModules: [], // empty = show all
  wellness: {},
  onboardingCompleted: false,
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Work', color: '#6366f1' },
  { id: 'personal', name: 'Personal', color: '#10b981' },
  { id: 'health', name: 'Health', color: '#f43f5e' },
  { id: 'learning', name: 'Learning', color: '#f59e0b' },
  { id: 'social', name: 'Social', color: '#8b5cf6' },
  { id: 'meals', name: 'Meals', color: '#fb923c' },
  { id: 'fitness', name: 'Fitness', color: '#22c55e' },
  { id: 'medication', name: 'Medication', color: '#e11d48' },
];

function seedEvents(): CalendarEvent[] {
  const now = new Date();
  const monday = setTime(addDays(now, -((now.getDay() + 6) % 7)), 9, 0);
  const mk = (offsetDays: number, hour: number, dur: number, title: string, cat: string): CalendarEvent => {
    const s = setTime(addDays(monday, offsetDays), hour, 0);
    const e = setTime(addDays(monday, offsetDays), hour + dur, 0);
    return {
      id: nanoid(),
      title,
      start: toISO(s),
      end: toISO(e),
      categoryId: cat,
      createdAt: toISO(now),
      updatedAt: toISO(now),
    };
  };
  return [
    mk(0, 9, 1, 'Team Standup', 'work'),
    mk(0, 14, 2, 'Deep Work — Roadmap', 'work'),
    mk(1, 7, 1, 'Morning Run', 'health'),
    mk(1, 10, 1, 'Design Review', 'work'),
    mk(2, 18, 1, 'Spanish Class', 'learning'),
    mk(3, 12, 1, 'Lunch with Alex', 'social'),
    mk(4, 16, 1, 'Yoga', 'health'),
  ];
}

function seedTasks(): Task[] {
  const now = toISO(new Date());
  const mk = (title: string, status: Task['status'], priority: Task['priority']): Task => ({
    id: nanoid(),
    title,
    status,
    priority,
    createdAt: now,
    updatedAt: now,
  });
  return [
    mk('Draft Q3 roadmap', 'doing', 'high'),
    mk('Reply to onboarding emails', 'todo', 'med'),
    mk('Read "Atomic Habits" — ch.3', 'todo', 'low'),
    mk('Schedule dentist', 'todo', 'med'),
    mk('Ship analytics dashboard', 'done', 'high'),
  ];
}

function seedProjects(): Project[] {
  const now = toISO(new Date());
  return [
    { id: 'inbox', name: 'Inbox', color: '#6366f1', createdAt: now, updatedAt: now },
    { id: 'personal', name: 'Personal', color: '#10b981', createdAt: now, updatedAt: now },
    { id: 'work', name: 'Work', color: '#0ea5e9', createdAt: now, updatedAt: now },
  ];
}

function seedNotes(): Note[] {
  const now = toISO(new Date());
  return [
    {
      id: nanoid(),
      title: 'Welcome to your workspace',
      body: 'This is your notes hub. Capture ideas, meeting notes, and reference material here. Use **markdown-style** formatting if you like — or just write plainly.\n\nTip: pin a note to keep it at the top.',
      pinned: true,
      tags: ['welcome'],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function seedTrips(): { trips: Trip[]; tripItems: TripItem[] } {
  // Empty by default — travel is an opt-in module. A sample trip would
  // muddy the calendar/dashboard for users who don't travel.
  return { trips: [], tripItems: [] };
}

function defaultState(): PlannerState {
  return {
    events: seedEvents(),
    categories: DEFAULT_CATEGORIES,
    goals: [],
    habits: [
      { id: nanoid(), name: 'Read', emoji: '📚', color: '#f59e0b', target: 5, completions: {}, createdAt: toISO(new Date()) },
      { id: nanoid(), name: 'Exercise', emoji: '💪', color: '#f43f5e', target: 4, completions: {}, createdAt: toISO(new Date()) },
      { id: nanoid(), name: 'Meditate', emoji: '🧘', color: '#10b981', target: 7, completions: {}, createdAt: toISO(new Date()) },
    ],
    tasks: seedTasks(),
    projects: seedProjects(),
    notes: seedNotes(),
    journal: [],
    transactions: [],
    books: [],
    bucket: [],
    ...seedTrips(),
    medications: [],
    meals: [],
    workouts: [],
    settings: DEFAULT_SETTINGS,
  };
}

interface PlannerStore extends PlannerState {
  // ui state
  view: ViewMode;
  activeModule: ModuleId;
  currentDate: string;
  selectedEventId: string | null;
  isEventModalOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isImportExportOpen: boolean;
  isAuthModalOpen: boolean;
  isShareModalOpen: boolean;
  isPersonalizeOpen: boolean;
  sidebarOpen: boolean;
  searchQuery: string;
  filteredCategoryIds: string[] | null;

  // workspace state
  activeOwnerId: string | null;
  workspaces: Workspace[];

  // undo/redo
  history: PlannerState[];
  future: PlannerState[];

  // actions — data
  addEvent: (e: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  addOccurrenceException: (id: string, occurrenceDate: Date) => void;
  duplicateEvent: (id: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;

  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'completions'>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  toggleHabitDay: (id: string, day: Date) => void;
  deleteHabit: (id: string) => void;

  // tasks
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: Task['status']) => void;

  // projects
  addProject: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // notes
  addNote: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // journal
  upsertJournal: (date: string, patch: Partial<JournalEntry>) => void;
  deleteJournal: (id: string) => void;

  // transactions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteTransaction: (id: string) => void;

  // books
  addBook: (b: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
  deleteBook: (id: string) => void;

  // bucket
  addBucketItem: (b: Omit<BucketItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBucketItem: (id: string, patch: Partial<BucketItem>) => void;
  deleteBucketItem: (id: string) => void;

  // trips + itinerary items (Travel module)
  addTrip: (t: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  addTripItem: (i: Omit<TripItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTripItem: (id: string, patch: Partial<TripItem>) => void;
  deleteTripItem: (id: string) => void;

  // wellness — medications
  addMedication: (m: Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'doses'>) => string;
  updateMedication: (id: string, patch: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  /** Mark a single dose occurrence (medId + 'yyyy-MM-ddTHH:mm') with a status. Pass null to clear. */
  logDose: (medId: string, occurrenceKey: string, status: DoseStatus | null) => void;

  // wellness — meals
  addMeal: (m: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;

  // wellness — workouts
  addWorkout: (w: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateWorkout: (id: string, patch: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;

  setSettings: (patch: Partial<Settings>) => void;
  importEvents: (events: CalendarEvent[]) => void;
  resetAll: () => void;

  // module nav
  setActiveModule: (m: ModuleId) => void;

  // actions — ui
  setView: (v: ViewMode) => void;
  setCurrentDate: (d: Date) => void;
  goToToday: () => void;
  navigate: (direction: 1 | -1) => void;
  openEventModal: (eventId?: string | null) => void;
  closeEventModal: () => void;
  toggleCommandPalette: (open?: boolean) => void;
  toggleSettings: (open?: boolean) => void;
  toggleImportExport: (open?: boolean) => void;
  toggleAuthModal: (open?: boolean) => void;
  toggleShareModal: (open?: boolean) => void;
  togglePersonalize: (open?: boolean) => void;
  toggleSidebar: () => void;

  // workspace
  setActiveOwner: (ownerId: string | null) => void;
  setWorkspaces: (ws: Workspace[]) => void;
  swapDataset: (next: PlannerState) => void;

  // remote sync: apply incoming changes without pushing to history
  _applyRemote: (mutator: (snap: PlannerState) => PlannerState) => void;
  setSearchQuery: (q: string) => void;
  toggleCategoryFilter: (id: string) => void;
  clearCategoryFilter: () => void;

  // undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function pickDataSnapshot(s: PlannerStore): PlannerState {
  return {
    events: s.events,
    categories: s.categories,
    goals: s.goals,
    habits: s.habits,
    tasks: s.tasks,
    projects: s.projects,
    notes: s.notes,
    journal: s.journal,
    transactions: s.transactions,
    books: s.books,
    bucket: s.bucket,
    trips: s.trips,
    tripItems: s.tripItems,
    medications: s.medications,
    meals: s.meals,
    workouts: s.workouts,
    settings: s.settings,
  };
}

const HISTORY_LIMIT = 50;

function backfill(s: PlannerState): PlannerState {
  // Existing users already have a populated `settings` object — treat them as
  // having completed onboarding so we don't interrupt them. New users (no
  // persisted state) go through `defaultState()` and start with the wizard.
  const hadPriorSettings = s.settings && Object.keys(s.settings).length > 0;
  const mergedSettings: Settings = { ...DEFAULT_SETTINGS, ...s.settings };
  if (hadPriorSettings && mergedSettings.onboardingCompleted === false) {
    mergedSettings.onboardingCompleted = true;
  }
  const withUpdated = <T extends { createdAt: string; updatedAt?: string }>(arr: T[] | undefined): T[] =>
    (arr ?? []).map((x) => (x.updatedAt ? x : { ...x, updatedAt: x.createdAt }));
  return {
    ...s,
    tasks: s.tasks ?? seedTasks(),
    projects: withUpdated<Project>(s.projects ?? seedProjects()),
    notes: s.notes ?? seedNotes(),
    journal: s.journal ?? [],
    transactions: withUpdated<Transaction>(s.transactions ?? []),
    books: withUpdated<Book>(s.books ?? []),
    bucket: withUpdated<BucketItem>(s.bucket ?? []),
    trips: s.trips ?? [],
    tripItems: s.tripItems ?? [],
    medications: withUpdated<Medication>(s.medications ?? []),
    meals: withUpdated<Meal>(s.meals ?? []),
    workouts: withUpdated<Workout>(s.workouts ?? []),
    settings: mergedSettings,
  };
}

export const usePlannerStore = create<PlannerStore>((set, get) => {
  const activeOwnerId = readActiveOwner();
  const loaded = loadState(activeOwnerId);
  const initial = loaded ? backfill(loaded) : defaultState();

  function commit(mutator: (snap: PlannerState) => PlannerState) {
    const prev = pickDataSnapshot(get());
    const next = mutator(prev);
    const newHistory = [...get().history, prev].slice(-HISTORY_LIMIT);
    set({ ...next, history: newHistory, future: [] });
    saveState(next, get().activeOwnerId);
  }

  return {
    ...initial,
    view: 'week',
    activeModule: 'today' as ModuleId,
    currentDate: toISO(new Date()),
    selectedEventId: null,
    isEventModalOpen: false,
    isCommandPaletteOpen: false,
    isSettingsOpen: false,
    isImportExportOpen: false,
    isAuthModalOpen: false,
    isShareModalOpen: false,
    isPersonalizeOpen: !initial.settings.onboardingCompleted,
    sidebarOpen: true,
    searchQuery: '',
    filteredCategoryIds: null,
    history: [],
    future: [],
    activeOwnerId,
    workspaces: [],

    addEvent: (e) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        events: [...s.events, { ...e, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    updateEvent: (id, patch) => {
      commit((s) => ({
        ...s,
        events: s.events.map((ev) =>
          ev.id === id ? { ...ev, ...patch, updatedAt: toISO(new Date()) } : ev,
        ),
      }));
    },
    deleteEvent: (id) => {
      commit((s) => ({ ...s, events: s.events.filter((ev) => ev.id !== id) }));
    },
    addOccurrenceException: (id, date) => {
      commit((s) => ({
        ...s,
        events: s.events.map((ev) =>
          ev.id === id
            ? { ...ev, recurrenceExceptions: [...(ev.recurrenceExceptions || []), dayKey(date)] }
            : ev,
        ),
      }));
    },
    duplicateEvent: (id) => {
      const orig = get().events.find((e) => e.id === id);
      if (!orig) return;
      const now = toISO(new Date());
      const copy: CalendarEvent = {
        ...orig,
        id: nanoid(),
        title: `${orig.title} (copy)`,
        createdAt: now,
        updatedAt: now,
      };
      commit((s) => ({ ...s, events: [...s.events, copy] }));
    },

    addCategory: (c) => {
      commit((s) => ({ ...s, categories: [...s.categories, { ...c, id: nanoid() }] }));
    },
    updateCategory: (id, patch) => {
      commit((s) => ({
        ...s,
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    deleteCategory: (id) => {
      commit((s) => ({
        ...s,
        categories: s.categories.filter((c) => c.id !== id),
        events: s.events.map((e) => (e.categoryId === id ? { ...e, categoryId: undefined } : e)),
      }));
    },

    addGoal: (g) => {
      commit((s) => ({
        ...s,
        goals: [...s.goals, { ...g, id: nanoid(), createdAt: toISO(new Date()) }],
      }));
    },
    toggleGoal: (id) => {
      commit((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
      }));
    },
    deleteGoal: (id) => {
      commit((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
    },

    addHabit: (h) => {
      commit((s) => ({
        ...s,
        habits: [
          ...s.habits,
          { ...h, id: nanoid(), createdAt: toISO(new Date()), completions: {} },
        ],
      }));
    },
    updateHabit: (id, patch) => {
      commit((s) => ({
        ...s,
        habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      }));
    },
    toggleHabitDay: (id, day) => {
      const k = dayKey(day);
      commit((s) => ({
        ...s,
        habits: s.habits.map((h) =>
          h.id === id ? { ...h, completions: { ...h.completions, [k]: !h.completions[k] } } : h,
        ),
      }));
    },
    deleteHabit: (id) => {
      commit((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
    },

    // ── Tasks ─────────────────────────────────────────────────
    addTask: (t) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        tasks: [...s.tasks, { ...t, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    updateTask: (id, patch) => {
      commit((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: toISO(new Date()) } : t,
        ),
      }));
    },
    deleteTask: (id) => {
      commit((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
    },
    setTaskStatus: (id, status) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, status, updatedAt: now, completedAt: status === 'done' ? now : undefined }
            : t,
        ),
      }));
    },

    // ── Projects ──────────────────────────────────────────────
    addProject: (p) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        projects: [...s.projects, { ...p, id: nanoid(), createdAt: now, updatedAt: now }],
      }));
    },
    updateProject: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now } : p)),
      }));
    },
    deleteProject: (id) => {
      commit((s) => ({
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
      }));
    },

    // ── Notes ─────────────────────────────────────────────────
    addNote: (n) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({ ...s, notes: [...s.notes, { ...n, id, createdAt: now, updatedAt: now }] }));
      return id;
    },
    updateNote: (id, patch) => {
      commit((s) => ({
        ...s,
        notes: s.notes.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: toISO(new Date()) } : n,
        ),
      }));
    },
    deleteNote: (id) => {
      commit((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
    },

    // ── Journal ───────────────────────────────────────────────
    upsertJournal: (date, patch) => {
      const now = toISO(new Date());
      commit((s) => {
        const existing = s.journal.find((j) => j.date === date);
        if (existing) {
          return {
            ...s,
            journal: s.journal.map((j) =>
              j.id === existing.id ? { ...j, ...patch, updatedAt: now } : j,
            ),
          };
        }
        return {
          ...s,
          journal: [
            ...s.journal,
            { id: nanoid(), date, createdAt: now, updatedAt: now, ...patch },
          ],
        };
      });
    },
    deleteJournal: (id) => {
      commit((s) => ({ ...s, journal: s.journal.filter((j) => j.id !== id) }));
    },

    // ── Transactions ──────────────────────────────────────────
    addTransaction: (t) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        transactions: [
          ...s.transactions,
          { ...t, id: nanoid(), createdAt: now, updatedAt: now },
        ],
      }));
    },
    deleteTransaction: (id) => {
      commit((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
    },

    // ── Books ─────────────────────────────────────────────────
    addBook: (b) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        books: [...s.books, { ...b, id: nanoid(), createdAt: now, updatedAt: now }],
      }));
    },
    updateBook: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        books: s.books.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now } : b)),
      }));
    },
    deleteBook: (id) => {
      commit((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));
    },

    // ── Bucket list ───────────────────────────────────────────
    addBucketItem: (b) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        bucket: [...s.bucket, { ...b, id: nanoid(), createdAt: now, updatedAt: now }],
      }));
    },
    updateBucketItem: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        bucket: s.bucket.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now } : b)),
      }));
    },
    deleteBucketItem: (id) => {
      commit((s) => ({ ...s, bucket: s.bucket.filter((b) => b.id !== id) }));
    },

    // ── Trips + itinerary items ───────────────────────────────
    addTrip: (t) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        trips: [...s.trips, { ...t, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    updateTrip: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t)),
      }));
    },
    deleteTrip: (id) => {
      commit((s) => ({
        ...s,
        trips: s.trips.filter((t) => t.id !== id),
        // Cascade: remove itinerary items for the deleted trip
        tripItems: s.tripItems.filter((i) => i.tripId !== id),
      }));
    },
    addTripItem: (item) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        tripItems: [...s.tripItems, { ...item, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    updateTripItem: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        tripItems: s.tripItems.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now } : i)),
      }));
    },
    deleteTripItem: (id) => {
      commit((s) => ({ ...s, tripItems: s.tripItems.filter((i) => i.id !== id) }));
    },

    // ── Wellness: Medications ─────────────────────────────────
    addMedication: (m) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        medications: [
          ...s.medications,
          { ...m, id, doses: {}, createdAt: now, updatedAt: now },
        ],
      }));
      return id;
    },
    updateMedication: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        medications: s.medications.map((m) =>
          m.id === id ? { ...m, ...patch, updatedAt: now } : m,
        ),
      }));
    },
    deleteMedication: (id) => {
      commit((s) => ({ ...s, medications: s.medications.filter((m) => m.id !== id) }));
    },
    logDose: (medId, occurrenceKey, status) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        medications: s.medications.map((m) => {
          if (m.id !== medId) return m;
          const next = { ...m.doses };
          if (status === null) delete next[occurrenceKey];
          else next[occurrenceKey] = status;
          return { ...m, doses: next, updatedAt: now };
        }),
      }));
    },

    // ── Wellness: Meals ───────────────────────────────────────
    addMeal: (m) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        meals: [...s.meals, { ...m, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    updateMeal: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: now } : m)),
      }));
    },
    deleteMeal: (id) => {
      commit((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) }));
    },

    // ── Wellness: Workouts ────────────────────────────────────
    addWorkout: (w) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        workouts: [...s.workouts, { ...w, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    updateWorkout: (id, patch) => {
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: now } : w)),
      }));
    },
    deleteWorkout: (id) => {
      commit((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
    },

    setActiveModule: (m) => set({ activeModule: m }),

    setSettings: (patch) => {
      commit((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    },
    importEvents: (events) => {
      commit((s) => ({ ...s, events: [...s.events, ...events] }));
    },
    resetAll: () => {
      const fresh = defaultState();
      const prev = pickDataSnapshot(get());
      set({ ...fresh, history: [...get().history, prev].slice(-HISTORY_LIMIT), future: [] });
      saveState(fresh, get().activeOwnerId);
    },

    setView: (v) => set({ view: v }),
    setCurrentDate: (d) => set({ currentDate: toISO(d) }),
    goToToday: () => set({ currentDate: toISO(new Date()) }),
    navigate: (direction) => {
      const { view, currentDate } = get();
      const d = new Date(currentDate);
      let step = 1;
      if (view === 'week' || view === 'agenda') step = 7;
      else if (view === 'month') {
        const next = new Date(d);
        next.setMonth(d.getMonth() + direction);
        set({ currentDate: toISO(next) });
        return;
      }
      set({ currentDate: toISO(addDays(d, direction * step)) });
    },
    openEventModal: (eventId = null) => set({ selectedEventId: eventId, isEventModalOpen: true }),
    closeEventModal: () => set({ isEventModalOpen: false, selectedEventId: null }),
    toggleCommandPalette: (open) =>
      set((s) => ({ isCommandPaletteOpen: open ?? !s.isCommandPaletteOpen })),
    toggleSettings: (open) => set((s) => ({ isSettingsOpen: open ?? !s.isSettingsOpen })),
    toggleImportExport: (open) => set((s) => ({ isImportExportOpen: open ?? !s.isImportExportOpen })),
    toggleAuthModal: (open) => set((s) => ({ isAuthModalOpen: open ?? !s.isAuthModalOpen })),
    toggleShareModal: (open) => set((s) => ({ isShareModalOpen: open ?? !s.isShareModalOpen })),
    togglePersonalize: (open) => set((s) => ({ isPersonalizeOpen: open ?? !s.isPersonalizeOpen })),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    setActiveOwner: (ownerId) => {
      // Persist the current dataset under its current owner key before swapping.
      const cur = get();
      const curSnap = pickDataSnapshot(cur);
      saveState(curSnap, cur.activeOwnerId);
      // Load the target dataset (or empty defaults).
      const loaded = loadState(ownerId);
      const next = loaded ? backfill(loaded) : defaultState();
      writeActiveOwner(ownerId);
      set({
        ...next,
        activeOwnerId: ownerId,
        history: [],
        future: [],
      });
      saveState(next, ownerId);
    },
    setWorkspaces: (ws) => set({ workspaces: ws }),
    swapDataset: (next) => {
      const ownerId = get().activeOwnerId;
      set({ ...next, history: [], future: [] });
      saveState(next, ownerId);
    },

    _applyRemote: (mutator) => {
      const snap = pickDataSnapshot(get());
      const next = mutator(snap);
      set({ ...next });
      saveState(next, get().activeOwnerId);
    },
    setSearchQuery: (q) => set({ searchQuery: q }),
    toggleCategoryFilter: (id) =>
      set((s) => {
        const cur = s.filteredCategoryIds || [];
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        return { filteredCategoryIds: next.length ? next : null };
      }),
    clearCategoryFilter: () => set({ filteredCategoryIds: null }),

    undo: () => {
      const { history } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      const cur = pickDataSnapshot(get());
      set({
        ...prev,
        history: history.slice(0, -1),
        future: [cur, ...get().future].slice(0, HISTORY_LIMIT),
      });
      saveState(prev, get().activeOwnerId);
    },
    redo: () => {
      const { future } = get();
      if (future.length === 0) return;
      const next = future[0];
      const cur = pickDataSnapshot(get());
      set({
        ...next,
        future: future.slice(1),
        history: [...get().history, cur].slice(-HISTORY_LIMIT),
      });
      saveState(next, get().activeOwnerId);
    },
    canUndo: () => get().history.length > 0,
    canRedo: () => get().future.length > 0,
  };
});

export function selectFilteredEvents(s: PlannerStore): CalendarEvent[] {
  // Includes virtual events derived from scheduled tasks, trips, and trip
  // items — the calendar surfaces all "things that happen at a time" without
  // each module needing to know about the others.
  let evs = allCalendarEvents(s);
  if (s.filteredCategoryIds && s.filteredCategoryIds.length) {
    evs = evs.filter((e) => e.categoryId && s.filteredCategoryIds!.includes(e.categoryId));
  }
  if (s.searchQuery.trim()) {
    const q = s.searchQuery.toLowerCase();
    evs = evs.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q),
    );
  }
  return evs;
}
