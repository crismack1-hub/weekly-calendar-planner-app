import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { usePlannerStore } from '../store/plannerStore';
import type {
  Book,
  BucketItem,
  CalendarEvent,
  Category,
  Goal,
  Habit,
  JournalEntry,
  Note,
  PlannerState,
  Project,
  Settings,
  Task,
  Transaction,
  Trip,
  TripItem,
} from '../types';

// ── Tiny observable for sync status ────────────────────────────
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

class Observable<T> {
  value: T;
  private listeners = new Set<(v: T) => void>();
  constructor(initial: T) {
    this.value = initial;
  }
  set(v: T) {
    this.value = v;
    this.listeners.forEach((l) => l(v));
  }
  subscribe(l: (v: T) => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const syncStatus = new Observable<SyncStatus>('idle');

// ── Row <-> domain mappers ────────────────────────────────────
function rowToEvent(r: any): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    location: r.location ?? undefined,
    start: r.start,
    end: r.end,
    allDay: r.all_day ?? false,
    categoryId: r.category_id ?? undefined,
    tags: r.tags ?? undefined,
    recurrence: r.recurrence ?? undefined,
    recurrenceExceptions: r.recurrence_exceptions ?? undefined,
    reminders: r.reminders ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function eventToRow(e: CalendarEvent, ownerId: string) {
  return {
    id: e.id,
    user_id: ownerId,
    title: e.title,
    description: e.description ?? null,
    location: e.location ?? null,
    start: e.start,
    end: e.end,
    all_day: !!e.allDay,
    category_id: e.categoryId ?? null,
    tags: e.tags ?? null,
    recurrence: e.recurrence ?? null,
    recurrence_exceptions: e.recurrenceExceptions ?? null,
    reminders: e.reminders ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
function rowToCategory(r: any): Category {
  return { id: r.id, name: r.name, color: r.color };
}
function categoryToRow(c: Category, ownerId: string) {
  return { id: c.id, user_id: ownerId, name: c.name, color: c.color, updated_at: new Date().toISOString() };
}
function rowToGoal(r: any): Goal {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    weekStart: r.week_start,
    done: r.done,
    createdAt: r.created_at,
  };
}
function goalToRow(g: Goal, ownerId: string) {
  return {
    id: g.id,
    user_id: ownerId,
    title: g.title,
    description: g.description ?? null,
    week_start: g.weekStart,
    done: g.done,
    created_at: g.createdAt,
    updated_at: new Date().toISOString(),
  };
}
function rowToHabit(r: any): Habit {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji ?? undefined,
    color: r.color,
    target: r.target,
    completions: r.completions ?? {},
    createdAt: r.created_at,
  };
}
function habitToRow(h: Habit, ownerId: string) {
  return {
    id: h.id,
    user_id: ownerId,
    name: h.name,
    emoji: h.emoji ?? null,
    color: h.color,
    target: h.target,
    completions: h.completions,
    created_at: h.createdAt,
    updated_at: new Date().toISOString(),
  };
}

// ── Mappers for v2 modules (tasks, projects, notes, journal,
//    transactions, books, bucket) ─────────────────────────────
function rowToTask(r: any): Task {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes ?? undefined,
    status: r.status,
    priority: r.priority ?? undefined,
    dueDate: r.due_date ?? undefined,
    tags: r.tags ?? undefined,
    projectId: r.project_id ?? undefined,
    categoryId: r.category_id ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function taskToRow(t: Task, ownerId: string) {
  return {
    id: t.id,
    user_id: ownerId,
    title: t.title,
    notes: t.notes ?? null,
    status: t.status,
    priority: t.priority ?? null,
    due_date: t.dueDate ?? null,
    tags: t.tags ?? null,
    project_id: t.projectId ?? null,
    category_id: t.categoryId ?? null,
    completed_at: t.completedAt ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function rowToProject(r: any): Project {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    description: r.description ?? undefined,
    archived: r.archived ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function projectToRow(p: Project, ownerId: string) {
  return {
    id: p.id,
    user_id: ownerId,
    name: p.name,
    color: p.color,
    description: p.description ?? null,
    archived: !!p.archived,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function rowToNote(r: any): Note {
  return {
    id: r.id,
    title: r.title ?? '',
    body: r.body ?? '',
    tags: r.tags ?? undefined,
    pinned: r.pinned ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function noteToRow(n: Note, ownerId: string) {
  return {
    id: n.id,
    user_id: ownerId,
    title: n.title,
    body: n.body,
    tags: n.tags ?? null,
    pinned: !!n.pinned,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
  };
}

function rowToJournal(r: any): JournalEntry {
  return {
    id: r.id,
    date: r.date,
    mood: r.mood ?? undefined,
    gratitude: r.gratitude ?? undefined,
    reflection: r.reflection ?? undefined,
    highlights: r.highlights ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function journalToRow(j: JournalEntry, ownerId: string) {
  return {
    id: j.id,
    user_id: ownerId,
    date: j.date,
    mood: j.mood ?? null,
    gratitude: j.gratitude ?? null,
    reflection: j.reflection ?? null,
    highlights: j.highlights ?? null,
    created_at: j.createdAt,
    updated_at: j.updatedAt,
  };
}

function rowToTransaction(r: any): Transaction {
  return {
    id: r.id,
    kind: r.kind,
    amount: Number(r.amount),
    category: r.category,
    note: r.note ?? undefined,
    date: r.date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function transactionToRow(t: Transaction, ownerId: string) {
  return {
    id: t.id,
    user_id: ownerId,
    kind: t.kind,
    amount: t.amount,
    category: t.category,
    note: t.note ?? null,
    date: t.date,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function rowToBook(r: any): Book {
  return {
    id: r.id,
    title: r.title,
    author: r.author ?? undefined,
    status: r.status,
    progress: r.progress ?? undefined,
    rating: r.rating ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function bookToRow(b: Book, ownerId: string) {
  return {
    id: b.id,
    user_id: ownerId,
    title: b.title,
    author: b.author ?? null,
    status: b.status,
    progress: b.progress ?? null,
    rating: b.rating ?? null,
    notes: b.notes ?? null,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

function rowToBucket(r: any): BucketItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    imageUrl: r.image_url ?? undefined,
    done: r.done ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function bucketToRow(b: BucketItem, ownerId: string) {
  return {
    id: b.id,
    user_id: ownerId,
    title: b.title,
    description: b.description ?? null,
    image_url: b.imageUrl ?? null,
    done: !!b.done,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

function rowToTrip(r: any): Trip {
  return {
    id: r.id,
    title: r.title,
    destination: r.destination ?? undefined,
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    status: r.status,
    color: r.color,
    notes: r.notes ?? undefined,
    imageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function tripToRow(t: Trip, ownerId: string) {
  return {
    id: t.id,
    user_id: ownerId,
    title: t.title,
    destination: t.destination ?? null,
    start_date: t.startDate ?? null,
    end_date: t.endDate ?? null,
    status: t.status,
    color: t.color,
    notes: t.notes ?? null,
    image_url: t.imageUrl ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function rowToTripItem(r: any): TripItem {
  return {
    id: r.id,
    tripId: r.trip_id,
    type: r.type,
    title: r.title,
    date: r.date ?? undefined,
    time: r.time ?? undefined,
    location: r.location ?? undefined,
    notes: r.notes ?? undefined,
    confirmationCode: r.confirmation_code ?? undefined,
    cost: r.cost != null ? Number(r.cost) : undefined,
    done: r.done ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function tripItemToRow(i: TripItem, ownerId: string) {
  return {
    id: i.id,
    user_id: ownerId,
    trip_id: i.tripId,
    type: i.type,
    title: i.title,
    date: i.date ?? null,
    time: i.time ?? null,
    location: i.location ?? null,
    notes: i.notes ?? null,
    confirmation_code: i.confirmationCode ?? null,
    cost: i.cost ?? null,
    done: !!i.done,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
  };
}

// ── Loop guard + state ────────────────────────────────────────
let isApplyingRemote = false;
let ownerId: string | null = null;
let selfId: string | null = null;
let storeUnsubscribe: (() => void) | null = null;
let channel: RealtimeChannel | null = null;
let last: PlannerState | null = null;
let pushTimer: number | null = null;

function pickSnap(): PlannerState {
  const s = usePlannerStore.getState();
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

// ── Diff helpers ──────────────────────────────────────────────
function indexById<T extends { id: string }>(arr: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
}
function diffById<T extends { id: string; updatedAt?: string }>(
  prev: T[],
  cur: T[],
): { upserts: T[]; deletes: string[] } {
  const prevMap = indexById(prev);
  const curMap = indexById(cur);
  const upserts: T[] = [];
  const deletes: string[] = [];
  for (const [id, c] of curMap) {
    const p = prevMap.get(id);
    if (!p || (p.updatedAt && c.updatedAt && p.updatedAt !== c.updatedAt) || p !== c) {
      // Shallow check — Zustand creates new refs on mutation, so identity != fine
      if (!p || JSON.stringify(p) !== JSON.stringify(c)) upserts.push(c);
    }
  }
  for (const id of prevMap.keys()) if (!curMap.has(id)) deletes.push(id);
  return { upserts, deletes };
}

// ── Push pipeline (debounced) ─────────────────────────────────
function schedulePush() {
  if (!supabase || !ownerId || isApplyingRemote) return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(pushNow, 400);
}

async function pushNow() {
  if (!supabase || !ownerId) return;
  const cur = pickSnap();
  if (!last) {
    last = cur;
    return;
  }
  syncStatus.set('syncing');
  try {
    const evDiff = diffById(last.events, cur.events);
    const catDiff = diffById(last.categories, cur.categories);
    const goalDiff = diffById(last.goals, cur.goals);
    const habDiff = diffById(last.habits, cur.habits);
    const taskDiff = diffById(last.tasks, cur.tasks);
    const projDiff = diffById(last.projects, cur.projects);
    const noteDiff = diffById(last.notes, cur.notes);
    const journalDiff = diffById(last.journal, cur.journal);
    const txnDiff = diffById(last.transactions, cur.transactions);
    const bookDiff = diffById(last.books, cur.books);
    const bucketDiff = diffById(last.bucket, cur.bucket);
    const tripDiff = diffById(last.trips, cur.trips);
    const tripItemDiff = diffById(last.tripItems, cur.tripItems);

    const ops: PromiseLike<unknown>[] = [];
    if (evDiff.upserts.length)
      ops.push(supabase.from('events').upsert(evDiff.upserts.map((e) => eventToRow(e, ownerId!))));
    if (evDiff.deletes.length)
      ops.push(supabase.from('events').delete().in('id', evDiff.deletes));
    if (catDiff.upserts.length)
      ops.push(supabase.from('categories').upsert(catDiff.upserts.map((c) => categoryToRow(c, ownerId!))));
    if (catDiff.deletes.length)
      ops.push(supabase.from('categories').delete().in('id', catDiff.deletes));
    if (goalDiff.upserts.length)
      ops.push(supabase.from('goals').upsert(goalDiff.upserts.map((g) => goalToRow(g, ownerId!))));
    if (goalDiff.deletes.length)
      ops.push(supabase.from('goals').delete().in('id', goalDiff.deletes));
    if (habDiff.upserts.length)
      ops.push(supabase.from('habits').upsert(habDiff.upserts.map((h) => habitToRow(h, ownerId!))));
    if (habDiff.deletes.length)
      ops.push(supabase.from('habits').delete().in('id', habDiff.deletes));

    // v2 modules
    if (taskDiff.upserts.length)
      ops.push(supabase.from('tasks').upsert(taskDiff.upserts.map((t) => taskToRow(t, ownerId!))));
    if (taskDiff.deletes.length)
      ops.push(supabase.from('tasks').delete().in('id', taskDiff.deletes));
    if (projDiff.upserts.length)
      ops.push(supabase.from('projects').upsert(projDiff.upserts.map((p) => projectToRow(p, ownerId!))));
    if (projDiff.deletes.length)
      ops.push(supabase.from('projects').delete().in('id', projDiff.deletes));
    if (noteDiff.upserts.length)
      ops.push(supabase.from('notes').upsert(noteDiff.upserts.map((n) => noteToRow(n, ownerId!))));
    if (noteDiff.deletes.length)
      ops.push(supabase.from('notes').delete().in('id', noteDiff.deletes));
    if (journalDiff.upserts.length)
      ops.push(supabase.from('journal_entries').upsert(journalDiff.upserts.map((j) => journalToRow(j, ownerId!))));
    if (journalDiff.deletes.length)
      ops.push(supabase.from('journal_entries').delete().in('id', journalDiff.deletes));
    if (txnDiff.upserts.length)
      ops.push(supabase.from('transactions').upsert(txnDiff.upserts.map((t) => transactionToRow(t, ownerId!))));
    if (txnDiff.deletes.length)
      ops.push(supabase.from('transactions').delete().in('id', txnDiff.deletes));
    if (bookDiff.upserts.length)
      ops.push(supabase.from('books').upsert(bookDiff.upserts.map((b) => bookToRow(b, ownerId!))));
    if (bookDiff.deletes.length)
      ops.push(supabase.from('books').delete().in('id', bookDiff.deletes));
    if (bucketDiff.upserts.length)
      ops.push(supabase.from('bucket_items').upsert(bucketDiff.upserts.map((b) => bucketToRow(b, ownerId!))));
    if (bucketDiff.deletes.length)
      ops.push(supabase.from('bucket_items').delete().in('id', bucketDiff.deletes));
    if (tripDiff.upserts.length)
      ops.push(supabase.from('trips').upsert(tripDiff.upserts.map((t) => tripToRow(t, ownerId!))));
    if (tripDiff.deletes.length)
      ops.push(supabase.from('trips').delete().in('id', tripDiff.deletes));
    if (tripItemDiff.upserts.length)
      ops.push(supabase.from('trip_items').upsert(tripItemDiff.upserts.map((i) => tripItemToRow(i, ownerId!))));
    if (tripItemDiff.deletes.length)
      ops.push(supabase.from('trip_items').delete().in('id', tripItemDiff.deletes));

    if (JSON.stringify(last.settings) !== JSON.stringify(cur.settings)) {
      ops.push(
        supabase.from('user_settings').upsert({
          user_id: ownerId,
          data: cur.settings,
          updated_at: new Date().toISOString(),
        }),
      );
    }

    const results = (await Promise.all(ops)) as Array<{ error?: { message: string } } | unknown>;
    const errResult = results.find((r) => (r as any)?.error) as { error?: { message: string } } | undefined;
    if (errResult?.error) throw errResult.error;
    last = cur;
    syncStatus.set('synced');
  } catch (e) {
    console.error('Sync push failed', e);
    syncStatus.set(navigator.onLine ? 'error' : 'offline');
  }
}

// ── Pull / merge ──────────────────────────────────────────────
async function pullFromCloud() {
  if (!supabase || !ownerId) return;
  syncStatus.set('syncing');
  try {
    const [events, categories, goals, habits, tasks, projects, notes, journal, transactions, books, bucket, trips, tripItems, settings] = await Promise.all([
      supabase.from('events').select('*').eq('user_id', ownerId),
      supabase.from('categories').select('*').eq('user_id', ownerId),
      supabase.from('goals').select('*').eq('user_id', ownerId),
      supabase.from('habits').select('*').eq('user_id', ownerId),
      supabase.from('tasks').select('*').eq('user_id', ownerId),
      supabase.from('projects').select('*').eq('user_id', ownerId),
      supabase.from('notes').select('*').eq('user_id', ownerId),
      supabase.from('journal_entries').select('*').eq('user_id', ownerId),
      supabase.from('transactions').select('*').eq('user_id', ownerId),
      supabase.from('books').select('*').eq('user_id', ownerId),
      supabase.from('bucket_items').select('*').eq('user_id', ownerId),
      supabase.from('trips').select('*').eq('user_id', ownerId),
      supabase.from('trip_items').select('*').eq('user_id', ownerId),
      supabase.from('user_settings').select('*').eq('user_id', ownerId).maybeSingle(),
    ]);
    if (events.error) throw events.error;
    if (categories.error) throw categories.error;
    if (goals.error) throw goals.error;
    if (habits.error) throw habits.error;
    // Be tolerant of v2 tables missing on older Supabase projects — log + continue.
    for (const [name, res] of [
      ['tasks', tasks], ['projects', projects], ['notes', notes],
      ['journal_entries', journal], ['transactions', transactions],
      ['books', books], ['bucket_items', bucket],
      ['trips', trips], ['trip_items', tripItems],
    ] as const) {
      if (res.error) console.warn(`sync: ${name} pull failed`, res.error);
    }

    const local = pickSnap();
    const apply = usePlannerStore.getState()._applyRemote;

    isApplyingRemote = true;
    apply((snap) => mergeIntoLocal(snap, {
      events: (events.data ?? []).map(rowToEvent),
      categories: (categories.data ?? []).map(rowToCategory),
      goals: (goals.data ?? []).map(rowToGoal),
      habits: (habits.data ?? []).map(rowToHabit),
      tasks: (tasks.data ?? []).map(rowToTask),
      projects: (projects.data ?? []).map(rowToProject),
      notes: (notes.data ?? []).map(rowToNote),
      journal: (journal.data ?? []).map(rowToJournal),
      transactions: (transactions.data ?? []).map(rowToTransaction),
      books: (books.data ?? []).map(rowToBook),
      bucket: (bucket.data ?? []).map(rowToBucket),
      trips: (trips.data ?? []).map(rowToTrip),
      tripItems: (tripItems.data ?? []).map(rowToTripItem),
      settings: settings.data?.data as Settings | undefined,
    }));
    isApplyingRemote = false;
    last = pickSnap();

    // After merge, push anything local-newer or local-only to cloud
    last = local; // pretend we never had cloud
    await pushNow();
    syncStatus.set('synced');
  } catch (e) {
    console.error('Sync pull failed', e);
    syncStatus.set(navigator.onLine ? 'error' : 'offline');
  }
}

interface CloudData {
  events: CalendarEvent[];
  categories: Category[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  journal: JournalEntry[];
  transactions: Transaction[];
  books: Book[];
  bucket: BucketItem[];
  trips: Trip[];
  tripItems: TripItem[];
  settings?: Settings;
}
function mergeIntoLocal(local: PlannerState, cloud: CloudData): PlannerState {
  const pickNewer = <T extends { id: string; updatedAt?: string; createdAt?: string }>(
    a: T[],
    b: T[],
  ): T[] => {
    const map = new Map<string, T>();
    for (const x of a) map.set(x.id, x);
    for (const x of b) {
      const cur = map.get(x.id);
      if (!cur) map.set(x.id, x);
      else {
        const aTs = cur.updatedAt || cur.createdAt || '';
        const bTs = x.updatedAt || x.createdAt || '';
        map.set(x.id, bTs > aTs ? x : cur);
      }
    }
    return Array.from(map.values());
  };
  return {
    ...local,
    events: pickNewer(local.events, cloud.events),
    categories: pickNewer(local.categories, cloud.categories),
    goals: pickNewer(local.goals, cloud.goals),
    habits: pickNewer(local.habits, cloud.habits),
    tasks: pickNewer(local.tasks, cloud.tasks),
    projects: pickNewer(local.projects, cloud.projects),
    notes: pickNewer(local.notes, cloud.notes),
    journal: pickNewer(local.journal, cloud.journal),
    transactions: pickNewer(local.transactions, cloud.transactions),
    books: pickNewer(local.books, cloud.books),
    bucket: pickNewer(local.bucket, cloud.bucket),
    trips: pickNewer(local.trips, cloud.trips),
    tripItems: pickNewer(local.tripItems, cloud.tripItems),
    settings: cloud.settings ?? local.settings,
  };
}

// ── Realtime subscription ─────────────────────────────────────
function applySingleRow(table: string, op: 'INSERT' | 'UPDATE' | 'DELETE', row: any) {
  const apply = usePlannerStore.getState()._applyRemote;
  isApplyingRemote = true;
  apply((snap) => {
    // Generic upsert helper that picks the row with the newer updatedAt.
    const upsert = <T extends { id: string; updatedAt?: string }>(arr: T[], next: T): T[] => {
      const idx = arr.findIndex((x) => x.id === next.id);
      if (idx < 0) return [...arr, next];
      const cur = arr[idx];
      if (cur.updatedAt && next.updatedAt && cur.updatedAt > next.updatedAt) return arr;
      return arr.map((x) => (x.id === next.id ? next : x));
    };
    const removeById = <T extends { id: string }>(arr: T[], id: string) => arr.filter((x) => x.id !== id);

    if (op === 'DELETE') {
      switch (table) {
        case 'events': return { ...snap, events: removeById(snap.events, row.id) };
        case 'categories': return { ...snap, categories: removeById(snap.categories, row.id) };
        case 'goals': return { ...snap, goals: removeById(snap.goals, row.id) };
        case 'habits': return { ...snap, habits: removeById(snap.habits, row.id) };
        case 'tasks': return { ...snap, tasks: removeById(snap.tasks, row.id) };
        case 'projects': return { ...snap, projects: removeById(snap.projects, row.id) };
        case 'notes': return { ...snap, notes: removeById(snap.notes, row.id) };
        case 'journal_entries': return { ...snap, journal: removeById(snap.journal, row.id) };
        case 'transactions': return { ...snap, transactions: removeById(snap.transactions, row.id) };
        case 'books': return { ...snap, books: removeById(snap.books, row.id) };
        case 'bucket_items': return { ...snap, bucket: removeById(snap.bucket, row.id) };
        case 'trips':
          return {
            ...snap,
            trips: removeById(snap.trips, row.id),
            // Cascade: drop itinerary items belonging to the deleted trip
            tripItems: snap.tripItems.filter((i) => i.tripId !== row.id),
          };
        case 'trip_items': return { ...snap, tripItems: removeById(snap.tripItems, row.id) };
        default: return snap;
      }
    }
    switch (table) {
      case 'events': return { ...snap, events: upsert(snap.events, rowToEvent(row)) };
      case 'categories': return { ...snap, categories: upsert(snap.categories, rowToCategory(row)) };
      case 'goals': return { ...snap, goals: upsert(snap.goals, rowToGoal(row)) };
      case 'habits': return { ...snap, habits: upsert(snap.habits, rowToHabit(row)) };
      case 'tasks': return { ...snap, tasks: upsert(snap.tasks, rowToTask(row)) };
      case 'projects': return { ...snap, projects: upsert(snap.projects, rowToProject(row)) };
      case 'notes': return { ...snap, notes: upsert(snap.notes, rowToNote(row)) };
      case 'journal_entries': return { ...snap, journal: upsert(snap.journal, rowToJournal(row)) };
      case 'transactions': return { ...snap, transactions: upsert(snap.transactions, rowToTransaction(row)) };
      case 'books': return { ...snap, books: upsert(snap.books, rowToBook(row)) };
      case 'bucket_items': return { ...snap, bucket: upsert(snap.bucket, rowToBucket(row)) };
      case 'trips': return { ...snap, trips: upsert(snap.trips, rowToTrip(row)) };
      case 'trip_items': return { ...snap, tripItems: upsert(snap.tripItems, rowToTripItem(row)) };
      case 'user_settings':
        if (row?.data) return { ...snap, settings: row.data as Settings };
        return snap;
      default: return snap;
    }
  });
  isApplyingRemote = false;
  last = pickSnap();
}

// All tables the realtime channel subscribes to (per owner_id).
const REALTIME_TABLES: readonly string[] = [
  'events', 'categories', 'goals', 'habits', 'user_settings',
  'tasks', 'projects', 'notes', 'journal_entries',
  'transactions', 'books', 'bucket_items',
  'trips', 'trip_items',
];

function subscribeRealtime() {
  if (!supabase || !ownerId) return;
  channel?.unsubscribe();
  let ch = supabase.channel(`planner-${ownerId}`);
  for (const table of REALTIME_TABLES) {
    ch = ch.on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table, filter: `user_id=eq.${ownerId}` },
      (payload: any) =>
        applySingleRow(table, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE', payload.new ?? payload.old),
    );
  }
  channel = ch.subscribe();
}

// ── Public API ────────────────────────────────────────────────
export async function startSync(self: string, owner?: string | null) {
  if (!supabase) return;
  selfId = self;
  ownerId = owner ?? self;
  last = pickSnap();
  storeUnsubscribe?.();
  storeUnsubscribe = usePlannerStore.subscribe((state, prev) => {
    if (isApplyingRemote) return;
    // Only react to data changes, not UI state. Zustand creates new refs on
    // mutation, so identity equality is enough to detect real changes.
    if (
      state.events === prev.events &&
      state.categories === prev.categories &&
      state.goals === prev.goals &&
      state.habits === prev.habits &&
      state.tasks === prev.tasks &&
      state.projects === prev.projects &&
      state.notes === prev.notes &&
      state.journal === prev.journal &&
      state.transactions === prev.transactions &&
      state.books === prev.books &&
      state.bucket === prev.bucket &&
      state.trips === prev.trips &&
      state.tripItems === prev.tripItems &&
      state.settings === prev.settings
    ) return;
    schedulePush();
  });
  subscribeRealtime();
  await pullFromCloud();
  setupOnlineWatcher();
}

export function stopSync() {
  ownerId = null;
  selfId = null;
  storeUnsubscribe?.();
  storeUnsubscribe = null;
  channel?.unsubscribe();
  channel = null;
  last = null;
  syncStatus.set('idle');
}

export async function switchOwner(newOwnerId: string) {
  if (!selfId) return;
  // The store handles dataset swap (saves current under old key, loads new key).
  usePlannerStore.getState().setActiveOwner(newOwnerId);
  ownerId = newOwnerId;
  last = pickSnap();
  channel?.unsubscribe();
  subscribeRealtime();
  await pullFromCloud();
}

export function triggerFullSync() {
  if (!ownerId) return;
  pullFromCloud();
}

function setupOnlineWatcher() {
  const handleOnline = () => {
    if (ownerId) {
      syncStatus.set('syncing');
      pushNow();
    }
  };
  const handleOffline = () => syncStatus.set('offline');
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}
