/**
 * Cross-feature integration helpers.
 *
 * The store keeps each domain (tasks, habits, goals, trips, journal) in its
 * own slice. This module is the *read-side* glue: it derives the views that
 * make the platform feel unified — virtual calendar events from tasks/trips,
 * goal progress rolled up from linked habits, day context for the journal,
 * etc.
 *
 * Design principles:
 *   1. **Derive, don't duplicate.** A task with `scheduledStart` should appear
 *      on the calendar without being copied into the `events` array. The
 *      task remains the source of truth.
 *   2. **Bidirectional via ids.** When something genuinely needs to be both a
 *      task and an event (e.g. a tripItem promoted to a calendar block), use
 *      `sourceRef` + `linkedEventId` so either side can navigate to the other.
 *   3. **Pure functions.** No store access here — callers pass in the slices
 *      they need. Keeps these testable and avoids subscription churn.
 */
import type {
  CalendarEvent,
  DoseStatus,
  Habit,
  Goal,
  JournalEntry,
  Meal,
  Medication,
  PlannerState,
  Task,
  Trip,
  TripItem,
  Workout,
} from '../types';
import { addMinutes, dayKey, fromISO, startOfDay, toISO } from './dates';

// ────────────────────────────────────────────────────────────
// Virtual events: tasks + trips appear on the calendar
// ────────────────────────────────────────────────────────────

const DEFAULT_TASK_DURATION = 30; // minutes
const DEFAULT_TRIP_ITEM_DURATION = 60;

/**
 * Build a calendar event from a task that has a `scheduledStart`. Returns null
 * if the task has no scheduled time (i.e. a pure todo with no calendar slot).
 *
 * The event is *virtual* — it uses a synthesised id (`task:<id>`) and a
 * `sourceRef` so consumers can detect it and (for example) make the title
 * read-only.
 */
export function taskToEvent(task: Task): CalendarEvent | null {
  if (!task.scheduledStart) return null;
  const start = fromISO(task.scheduledStart);
  const dur = task.durationMin ?? DEFAULT_TASK_DURATION;
  const end = addMinutes(start, dur);
  return {
    id: `task:${task.id}`,
    title: task.title,
    description: task.notes,
    start: toISO(start),
    end: toISO(end),
    categoryId: task.categoryId,
    tags: task.tags,
    sourceRef: { type: 'task', id: task.id },
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

/** Build a calendar event for a trip's overall date range (all-day block). */
export function tripToEvent(trip: Trip): CalendarEvent | null {
  if (!trip.startDate) return null;
  const start = startOfDay(fromISO(trip.startDate + 'T00:00:00'));
  const end = startOfDay(fromISO((trip.endDate || trip.startDate) + 'T00:00:00'));
  // Push end to end-of-day so the range covers the final travel day visually
  const endInclusive = addMinutes(end, 24 * 60 - 1);
  return {
    id: `trip:${trip.id}`,
    title: `✈ ${trip.title}`,
    description: trip.destination || trip.notes,
    location: trip.destination,
    start: toISO(start),
    end: toISO(endInclusive),
    allDay: true,
    sourceRef: { type: 'trip', id: trip.id },
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

/** Build a calendar event for a trip itinerary item that has a date+time. */
export function tripItemToEvent(item: TripItem): CalendarEvent | null {
  if (!item.date) return null;
  const dateOnly = !item.time;
  const base = fromISO(`${item.date}T${item.time || '09:00'}:00`);
  const start = base;
  const dur = item.durationMin ?? DEFAULT_TRIP_ITEM_DURATION;
  const end = dateOnly ? addMinutes(startOfDay(base), 24 * 60 - 1) : addMinutes(start, dur);
  return {
    id: `tripItem:${item.id}`,
    title: item.title,
    description: item.notes,
    location: item.location,
    start: toISO(start),
    end: toISO(end),
    allDay: dateOnly,
    sourceRef: { type: 'tripItem', id: item.id },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Returns the combined event list: real events + virtual events derived from
 * every other module's data — tasks, trips, trip items, medication doses,
 * meals, and workouts. Used by every calendar surface (week view, month view,
 * agenda, Today module).
 *
 * Virtual events whose source has been pushed to the calendar (linkedEventId
 * is set) are skipped to avoid double-rendering.
 */
export function allCalendarEvents(
  state: Pick<
    PlannerState,
    'events' | 'tasks' | 'trips' | 'tripItems' | 'medications' | 'meals' | 'workouts'
  >,
): CalendarEvent[] {
  const out: CalendarEvent[] = [...state.events];

  for (const task of state.tasks) {
    if (task.linkedEventId) continue; // already has a real event
    const ev = taskToEvent(task);
    if (ev) out.push(ev);
  }

  for (const trip of state.trips) {
    const ev = tripToEvent(trip);
    if (ev) out.push(ev);
  }

  for (const item of state.tripItems) {
    if (item.linkedEventId) continue;
    const ev = tripItemToEvent(item);
    if (ev) out.push(ev);
  }

  // Wellness: medications, meals, workouts. We expand med doses for the
  // surrounding window (today ± 14 days) — full schedules can be unbounded so
  // we never want to materialise them all at once.
  const today = new Date();
  const winStart = new Date(today);
  winStart.setDate(today.getDate() - 14);
  const winEnd = new Date(today);
  winEnd.setDate(today.getDate() + 60);

  for (const med of state.medications ?? []) {
    if (!med.active) continue;
    for (const ev of expandMedicationDoses(med, winStart, winEnd)) out.push(ev);
  }

  for (const meal of state.meals ?? []) {
    const ev = mealToEvent(meal);
    if (ev) out.push(ev);
  }

  for (const workout of state.workouts ?? []) {
    const ev = workoutToEvent(workout);
    if (ev) out.push(ev);
  }

  return out;
}

// ────────────────────────────────────────────────────────────
// Wellness virtual events
// ────────────────────────────────────────────────────────────

const DEFAULT_MEAL_DURATION = 30;
const DEFAULT_WORKOUT_DURATION = 45;
const DEFAULT_MED_DURATION = 5;

/**
 * Stable occurrence key for a single dose. Combines the medication id with the
 * yyyy-MM-ddTHH:mm of the dose so the same key indexes both the calendar
 * event and the `doses` log in the Medication entity.
 */
export function doseOccurrenceKey(date: Date, time: string): string {
  return `${dayKey(date)}T${time}`;
}

/**
 * Expand a medication schedule into virtual calendar events for each dose in
 * the given window. The medication may be daily, restricted to specific
 * weekdays, and bounded by `endDate`. The dose log (`taken | skipped | missed`)
 * is reflected in the event description so calendar tiles can render status.
 */
export function expandMedicationDoses(med: Medication, windowStart: Date, windowEnd: Date): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  if (!med.times || med.times.length === 0) return out;
  const start = fromISO(med.startDate + 'T00:00:00');
  const end = med.endDate ? fromISO(med.endDate + 'T23:59:59') : null;

  // Iterate the intersection of [med start, med end] with [windowStart, windowEnd].
  const iterStart = start > windowStart ? start : windowStart;
  const iterEnd = end && end < windowEnd ? end : windowEnd;

  const cursor = startOfDay(iterStart);
  while (cursor <= iterEnd) {
    const dow = cursor.getDay();
    const dowOk = !med.daysOfWeek || med.daysOfWeek.length === 0 || med.daysOfWeek.includes(dow);
    if (dowOk) {
      for (const t of med.times) {
        const [hh, mm] = t.split(':').map((n) => parseInt(n, 10));
        if (isNaN(hh) || isNaN(mm)) continue;
        const doseStart = new Date(cursor);
        doseStart.setHours(hh, mm, 0, 0);
        const doseEnd = addMinutes(doseStart, DEFAULT_MED_DURATION);
        const occKey = doseOccurrenceKey(cursor, t);
        const status = med.doses[occKey];
        out.push({
          id: `medication:${med.id}::${occKey}`,
          title: `${med.emoji ?? '💊'} ${med.name}${med.dosage ? ` — ${med.dosage}` : ''}`,
          description: med.instructions ?? med.notes,
          start: toISO(doseStart),
          end: toISO(doseEnd),
          categoryId: 'medication',
          reminders: med.reminderMinutesBefore != null
            ? [{ minutesBefore: med.reminderMinutesBefore }]
            : [{ minutesBefore: 10 }],
          sourceRef: { type: 'medication', id: `${med.id}::${occKey}` },
          tags: status ? [`dose:${status}`] : ['dose:pending'],
          createdAt: med.createdAt,
          updatedAt: med.updatedAt,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Decode the medication id + occurrence key from a virtual event id. */
export function parseDoseEventId(eventId: string): { medId: string; occurrenceKey: string } | null {
  if (!eventId.startsWith('medication:')) return null;
  const rest = eventId.slice('medication:'.length);
  const idx = rest.indexOf('::');
  if (idx < 0) return null;
  return { medId: rest.slice(0, idx), occurrenceKey: rest.slice(idx + 2) };
}

/** Build a calendar event for a planned or logged meal. */
export function mealToEvent(meal: Meal): CalendarEvent | null {
  if (!meal.date) return null;
  const time = meal.time || defaultMealTime(meal.type);
  const start = fromISO(`${meal.date}T${time}:00`);
  const end = addMinutes(start, DEFAULT_MEAL_DURATION);
  const mealEmoji = MEAL_EMOJI[meal.type] ?? '🍽';
  return {
    id: `meal:${meal.id}`,
    title: `${mealEmoji} ${meal.title}`,
    description: meal.notes,
    start: toISO(start),
    end: toISO(end),
    categoryId: 'meals',
    sourceRef: { type: 'meal', id: meal.id },
    tags: meal.logged ? ['meal:logged'] : ['meal:planned'],
    createdAt: meal.createdAt,
    updatedAt: meal.updatedAt,
  };
}

/** Build a calendar event for a planned or completed workout. */
export function workoutToEvent(workout: Workout): CalendarEvent | null {
  if (!workout.date) return null;
  const time = workout.time || '17:00';
  const start = fromISO(`${workout.date}T${time}:00`);
  const dur = workout.durationMin ?? DEFAULT_WORKOUT_DURATION;
  const end = addMinutes(start, dur);
  return {
    id: `workout:${workout.id}`,
    title: `${WORKOUT_EMOJI[workout.type] ?? '🏋️'} ${workout.name}`,
    description: workout.notes,
    start: toISO(start),
    end: toISO(end),
    categoryId: 'fitness',
    sourceRef: { type: 'workout', id: workout.id },
    tags: workout.completed ? ['workout:completed'] : ['workout:planned'],
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
  };
}

const MEAL_EMOJI: Record<Meal['type'], string> = {
  breakfast: '🥞',
  lunch: '🥗',
  dinner: '🍝',
  snack: '🍎',
};

const WORKOUT_EMOJI: Record<Workout['type'], string> = {
  cardio: '🏃',
  strength: '🏋️',
  flexibility: '🧘',
  sports: '⚽',
  other: '💪',
};

function defaultMealTime(type: Meal['type']): string {
  switch (type) {
    case 'breakfast':
      return '08:00';
    case 'lunch':
      return '12:30';
    case 'dinner':
      return '18:30';
    case 'snack':
      return '15:00';
  }
}

/** Convenience: read dose status for a medication occurrence (used by UI). */
export function getDoseStatus(med: Medication, occurrenceKey: string): DoseStatus | 'pending' {
  return med.doses[occurrenceKey] ?? 'pending';
}

// ────────────────────────────────────────────────────────────
// Goal progress: habits + tasks rolled up
// ────────────────────────────────────────────────────────────

export interface GoalRollup {
  habits: Habit[];
  /** Average completion rate of linked habits this week (0..1). */
  weeklyHabitRate: number;
  /** Tasks linked to this goal via sourceRef. */
  linkedTasks: Task[];
  /** Tasks completed (status === 'done'). */
  completedTasks: number;
}

/** Roll up a goal's progress from its linked habits and tasks. */
export function goalRollup(goal: Goal, habits: Habit[], tasks: Task[], weekStart: Date): GoalRollup {
  const linkedHabits = habits.filter((h) => h.goalId === goal.id);
  const linkedTasks = tasks.filter((t) => t.sourceRef?.type === 'goal' && t.sourceRef.id === goal.id);

  let totalDays = 0;
  let completedDays = 0;
  for (const h of linkedHabits) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const k = dayKey(d);
      totalDays += 1;
      if (h.completions[k]) completedDays += 1;
    }
  }
  const weeklyHabitRate = totalDays > 0 ? completedDays / totalDays : 0;

  return {
    habits: linkedHabits,
    weeklyHabitRate,
    linkedTasks,
    completedTasks: linkedTasks.filter((t) => t.status === 'done').length,
  };
}

// ────────────────────────────────────────────────────────────
// Day context: what happened (or will happen) on a single day
// ────────────────────────────────────────────────────────────

export interface DayContext {
  date: string; // yyyy-MM-dd
  events: CalendarEvent[];
  /** Habits with their completion state for the date. */
  habits: { habit: Habit; done: boolean }[];
  /** Tasks completed on this date or due on it. */
  tasks: Task[];
  /** Journal entry for the date (if any). */
  journal?: JournalEntry;
  /** Trips that span this date. */
  trips: Trip[];
}

/**
 * Build a unified day-context bundle used by the Journal day panel and the
 * Today module. Combines: real events + virtual events for the day, habit
 * completions, tasks due/completed, and any active trips.
 */
export function getDayContext(
  state: Pick<
    PlannerState,
    'events' | 'tasks' | 'habits' | 'journal' | 'trips' | 'tripItems' | 'medications' | 'meals' | 'workouts'
  >,
  date: Date,
): DayContext {
  const k = dayKey(date);
  const all = allCalendarEvents(state);

  const startMs = startOfDay(date).getTime();
  const endMs = startMs + 24 * 3600 * 1000 - 1;

  const eventsForDay = all.filter((e) => {
    const s = fromISO(e.start).getTime();
    const en = fromISO(e.end).getTime();
    return s <= endMs && en >= startMs;
  });

  const habits = state.habits.map((habit) => ({ habit, done: !!habit.completions[k] }));

  const tasks = state.tasks.filter((t) => {
    if (t.scheduledStart && dayKey(fromISO(t.scheduledStart)) === k) return true;
    if (t.dueDate && dayKey(fromISO(t.dueDate)) === k) return true;
    if (t.completedAt && dayKey(fromISO(t.completedAt)) === k) return true;
    return false;
  });

  const journal = state.journal.find((j) => j.date === k);

  const trips = state.trips.filter((t) => {
    if (!t.startDate) return false;
    const sd = t.startDate;
    const ed = t.endDate || t.startDate;
    return sd <= k && k <= ed;
  });

  return { date: k, events: eventsForDay, habits, tasks, journal, trips };
}

// ────────────────────────────────────────────────────────────
// Trip → tasks: generate a pre-trip checklist
// ────────────────────────────────────────────────────────────

/**
 * Default pre-trip checklist titles. Kept tight on purpose — users can add
 * more, but a long list out-of-the-box becomes noise.
 */
export const DEFAULT_TRIP_CHECKLIST = [
  'Check passport expiry',
  'Book ground transport',
  'Pack carry-on essentials',
  'Set out-of-office',
  'Notify bank of travel',
  'Download offline maps',
];

/** Build the task payloads for a trip's checklist. Caller persists. */
export function buildTripChecklistTasks(trip: Trip): Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] {
  return DEFAULT_TRIP_CHECKLIST.map((title) => ({
    title,
    status: 'todo' as const,
    priority: 'med' as const,
    dueDate: trip.startDate,
    sourceRef: { type: 'trip' as const, id: trip.id },
    tags: ['travel', trip.title],
  }));
}
