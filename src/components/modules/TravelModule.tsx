import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Plane,
  Bus,
  Hotel,
  Camera,
  UtensilsCrossed,
  StickyNote,
  MapPin,
  Calendar,
  Check,
  ChevronLeft,
  ListChecks,
} from 'lucide-react';
import { buildTripChecklistTasks } from '../../lib/integration';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { format, fromISO } from '../../lib/dates';
import type { Trip, TripItem, TripItemType, TripStatus } from '../../types';

const TRIP_PALETTE = [
  '#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899',
  '#f43f5e', '#f97316', '#10b981', '#22c55e', '#eab308',
];

const STATUS_META: Record<TripStatus, { label: string; color: string }> = {
  idea: { label: 'Idea', color: '#94a3b8' },
  planning: { label: 'Planning', color: '#f59e0b' },
  booked: { label: 'Booked', color: '#0ea5e9' },
  active: { label: 'On trip', color: '#22c55e' },
  done: { label: 'Done', color: '#64748b' },
};

const ITEM_TYPE_META: Record<TripItemType, { label: string; icon: typeof Plane }> = {
  flight: { label: 'Flight', icon: Plane },
  transit: { label: 'Transit', icon: Bus },
  lodging: { label: 'Lodging', icon: Hotel },
  activity: { label: 'Activity', icon: Camera },
  food: { label: 'Food', icon: UtensilsCrossed },
  note: { label: 'Note', icon: StickyNote },
};

export function TravelModule() {
  const trips = usePlannerStore((s) => s.trips);
  const tripItems = usePlannerStore((s) => s.tripItems);
  const tasks = usePlannerStore((s) => s.tasks);
  const addTrip = usePlannerStore((s) => s.addTrip);
  const updateTrip = usePlannerStore((s) => s.updateTrip);
  const deleteTrip = usePlannerStore((s) => s.deleteTrip);
  const addTripItem = usePlannerStore((s) => s.addTripItem);
  const updateTripItem = usePlannerStore((s) => s.updateTripItem);
  const deleteTripItem = usePlannerStore((s) => s.deleteTripItem);
  const addTask = usePlannerStore((s) => s.addTask);
  const setActiveModule = usePlannerStore((s) => s.setActiveModule);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all');

  const visible = useMemo(() => {
    const list = statusFilter === 'all' ? trips : trips.filter((t) => t.status === statusFilter);
    return [...list].sort((a, b) => {
      // Upcoming (with startDate) first, then ideas, then done
      const aHas = !!a.startDate;
      const bHas = !!b.startDate;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (aHas && bHas) return (a.startDate || '').localeCompare(b.startDate || '');
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [trips, statusFilter]);

  useEffect(() => {
    // Ensure the selected trip still exists (handles deletes / sync drops)
    if (activeId && !trips.some((t) => t.id === activeId)) setActiveId(null);
  }, [trips, activeId]);

  const active = trips.find((t) => t.id === activeId) ?? null;

  const handleNewTrip = () => {
    const title = prompt('Where are you going?');
    if (!title?.trim()) return;
    const id = addTrip({
      title: title.trim(),
      status: 'planning',
      color: TRIP_PALETTE[trips.length % TRIP_PALETTE.length],
    });
    setActiveId(id);
  };

  const actions = (
    <button className="btn-primary !text-xs" onClick={handleNewTrip}>
      <Plus size={13} />
      <span className="hidden sm:inline">New trip</span>
    </button>
  );

  return (
    <ModulePage id="travel" actions={actions}>
      <div className="grid md:grid-cols-[20rem_1fr] h-full">
        {/* Trip list */}
        <aside
          className={clsx(
            'border-r border-[color:var(--border)] flex-col overflow-hidden',
            active ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="p-3 border-b border-[color:var(--border)] flex flex-wrap gap-1.5">
            <FilterChip
              label={`All (${trips.length})`}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              color="var(--m-travel)"
            />
            {(['planning', 'booked', 'active', 'idea', 'done'] as TripStatus[]).map((st) => {
              const count = trips.filter((t) => t.status === st).length;
              if (count === 0) return null;
              return (
                <FilterChip
                  key={st}
                  label={`${STATUS_META[st].label} (${count})`}
                  active={statusFilter === st}
                  onClick={() => setStatusFilter(st)}
                  color={STATUS_META[st].color}
                />
              );
            })}
          </div>
          <ul className="flex-1 overflow-y-auto calendar-scroll">
            {visible.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-slate-400 italic">
                No trips yet. Where do you want to go?
              </li>
            )}
            {visible.map((trip) => {
              const count = tripItems.filter((i) => i.tripId === trip.id).length;
              const status = STATUS_META[trip.status];
              return (
                <li key={trip.id}>
                  <button
                    onClick={() => setActiveId(trip.id)}
                    className={clsx(
                      'w-full px-3 py-3 text-left border-l-2 transition-all',
                      activeId === trip.id
                        ? 'bg-slate-900/[0.04] dark:bg-white/[0.04]'
                        : 'border-transparent hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.02]',
                    )}
                    style={
                      activeId === trip.id ? { borderLeftColor: trip.color } : undefined
                    }
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="h-9 w-9 grid place-items-center rounded-xl text-white text-sm font-bold shrink-0 mt-0.5"
                        style={{
                          background: `linear-gradient(135deg, ${trip.color}, color-mix(in srgb, ${trip.color} 60%, #000 0%))`,
                          boxShadow: `0 6px 14px -6px ${trip.color}66`,
                        }}
                      >
                        <Plane size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{trip.title}</div>
                        {trip.destination && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <MapPin size={9} /> {trip.destination}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                          <span className="chip" style={{ background: `${status.color}1f`, color: status.color }}>
                            {status.label}
                          </span>
                          {(trip.startDate || trip.endDate) && (
                            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                              {formatRange(trip.startDate, trip.endDate)}
                            </span>
                          )}
                          <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                            · {count} item{count === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Itinerary editor */}
        <section className={clsx('flex-col overflow-hidden', active ? 'flex' : 'hidden md:flex')}>
          {active ? (
            <TripEditor
              key={active.id}
              trip={active}
              items={tripItems.filter((i) => i.tripId === active.id)}
              checklistCount={tasks.filter((t) => t.sourceRef?.type === 'trip' && t.sourceRef.id === active.id).length}
              onBack={() => setActiveId(null)}
              onUpdate={(patch) => updateTrip(active.id, patch)}
              onDelete={() => {
                if (confirm(`Delete "${active.title}" and its itinerary?`)) {
                  deleteTrip(active.id);
                  setActiveId(null);
                }
              }}
              onAddItem={(item) => addTripItem({ ...item, tripId: active.id })}
              onUpdateItem={updateTripItem}
              onDeleteItem={deleteTripItem}
              onGenerateChecklist={() => {
                const seeds = buildTripChecklistTasks(active);
                for (const t of seeds) addTask(t);
                if (confirm(`Added ${seeds.length} tasks to your list. Jump to Tasks?`)) {
                  setActiveModule('tasks');
                }
              }}
            />
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-slate-400 p-6 text-center">
              {trips.length === 0
                ? 'Click "New trip" to start planning your first adventure.'
                : 'Select a trip to view or edit its itinerary.'}
            </div>
          )}
        </section>
      </div>
    </ModulePage>
  );
}

// ── Trip editor ───────────────────────────────────────────────

interface TripEditorProps {
  trip: Trip;
  items: TripItem[];
  /** Number of tasks already generated from this trip; gates the checklist button. */
  checklistCount: number;
  onBack: () => void;
  onUpdate: (patch: Partial<Trip>) => void;
  onDelete: () => void;
  onAddItem: (item: Omit<TripItem, 'id' | 'createdAt' | 'updatedAt' | 'tripId'>) => void;
  onUpdateItem: (id: string, patch: Partial<TripItem>) => void;
  onDeleteItem: (id: string) => void;
  /** Generate a pre-trip checklist of tasks linked to this trip. */
  onGenerateChecklist: () => void;
}

function TripEditor({
  trip,
  items,
  checklistCount,
  onBack,
  onUpdate,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onGenerateChecklist,
}: TripEditorProps) {
  // Group itinerary items by date; undated items live in their own bucket
  const byDay = useMemo(() => {
    const map = new Map<string, TripItem[]>();
    const undated: TripItem[] = [];
    for (const item of items) {
      if (!item.date) undated.push(item);
      else {
        if (!map.has(item.date)) map.set(item.date, []);
        map.get(item.date)!.push(item);
      }
    }
    // Sort each day's items by time
    for (const [, list] of map) list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const days = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { days, undated };
  }, [items]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Trip header */}
      <div
        className="px-3 sm:px-5 py-3 border-b border-[color:var(--border)]"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${trip.color} 14%, transparent), transparent 65%)`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <button onClick={onBack} className="btn-ghost p-1.5 md:hidden" aria-label="Back to list">
            <ChevronLeft size={14} />
          </button>
          <input
            value={trip.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Trip title"
            className="flex-1 min-w-0 bg-transparent text-base sm:text-lg font-semibold tracking-tight outline-none placeholder:text-slate-400"
          />
          <button
            onClick={onDelete}
            className="btn-ghost p-1.5 text-rose-500/80 hover:text-rose-500 shrink-0"
            title="Delete trip"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Field
            label="Destination"
            value={trip.destination || ''}
            onChange={(v) => onUpdate({ destination: v || undefined })}
            placeholder="City, country…"
          />
          <Field
            label="Start"
            type="date"
            value={trip.startDate || ''}
            onChange={(v) => onUpdate({ startDate: v || undefined })}
          />
          <Field
            label="End"
            type="date"
            value={trip.endDate || ''}
            onChange={(v) => onUpdate({ endDate: v || undefined })}
          />
          <div>
            <label className="label">Status</label>
            <select
              className="input !py-1.5 !text-xs"
              value={trip.status}
              onChange={(e) => onUpdate({ status: e.target.value as TripStatus })}
            >
              {Object.entries(STATUS_META).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Color swatch row */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Color</span>
          {TRIP_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              className={clsx(
                'h-5 w-5 rounded-full transition-all',
                trip.color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100',
              )}
              style={{ background: c, ['--tw-ring-color' as string]: c } as React.CSSProperties}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto calendar-scroll p-3 sm:p-5 space-y-4">
        {/* Integration callouts — the trip is already visible on the calendar
            via the integration layer, but we surface the bidirectional links
            here so the user discovers them. */}
        <div className="flex flex-wrap items-center gap-2">
          {trip.startDate && (
            <span
              className="chip text-[11px]"
              style={{ background: 'color-mix(in srgb, var(--m-calendar) 16%, transparent)', color: 'var(--m-calendar)' }}
              title="This trip appears on your calendar automatically"
            >
              <Calendar size={11} /> On calendar
            </span>
          )}
          <button
            onClick={onGenerateChecklist}
            disabled={checklistCount > 0}
            className={clsx(
              'chip text-[11px] transition-all',
              checklistCount > 0
                ? 'opacity-60 cursor-not-allowed'
                : 'border border-[color:var(--border-strong)] hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]',
            )}
            title={checklistCount > 0 ? 'Checklist already generated' : 'Create a pre-trip checklist of tasks linked to this trip'}
          >
            <ListChecks size={11} />
            {checklistCount > 0 ? `${checklistCount} checklist tasks` : 'Generate checklist'}
          </button>
        </div>

        {/* Add-item toolbar */}
        <div className="card p-2 sm:p-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
            Add to itinerary
          </span>
          {(Object.keys(ITEM_TYPE_META) as TripItemType[]).map((type) => {
            const meta = ITEM_TYPE_META[type];
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => {
                  const title = prompt(`${meta.label} title`);
                  if (!title?.trim()) return;
                  onAddItem({
                    type,
                    title: title.trim(),
                    date: trip.startDate,
                  });
                }}
                className="chip border border-[color:var(--border-strong)] hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]"
              >
                <Icon size={11} /> {meta.label}
              </button>
            );
          })}
        </div>

        {/* Notes */}
        <div className="card p-3">
          <label className="label">Notes</label>
          <textarea
            value={trip.notes || ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Packing list, reminders, links…"
            rows={3}
            className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Itinerary by day */}
        {items.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-400 italic">
            No itinerary items yet. Pick a category above to add a flight, hotel, or activity.
          </div>
        ) : (
          <>
            {byDay.days.map(([date, list]) => (
              <DayBlock
                key={date}
                date={date}
                items={list}
                accent={trip.color}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
              />
            ))}
            {byDay.undated.length > 0 && (
              <DayBlock
                date=""
                items={byDay.undated}
                accent={trip.color}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DayBlock({
  date,
  items,
  accent,
  onUpdateItem,
  onDeleteItem,
}: {
  date: string;
  items: TripItem[];
  accent: string;
  onUpdateItem: (id: string, patch: Partial<TripItem>) => void;
  onDeleteItem: (id: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div
        className="px-3 sm:px-4 py-2 border-b border-[color:var(--border)] flex items-baseline gap-2"
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 10%, transparent), transparent 80%)`,
        }}
      >
        {date ? (
          <>
            <Calendar size={12} style={{ color: accent }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
              {format(fromISO(date + 'T00:00:00'), 'EEE, MMM d')}
            </span>
          </>
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            No date yet
          </span>
        )}
        <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="divide-y divide-[color:var(--border)]">
        {items.map((item) => (
          <ItineraryRow
            key={item.id}
            item={item}
            onUpdate={(patch) => onUpdateItem(item.id, patch)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ItineraryRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: TripItem;
  onUpdate: (patch: Partial<TripItem>) => void;
  onDelete: () => void;
}) {
  const meta = ITEM_TYPE_META[item.type];
  const Icon = meta.icon;
  return (
    <li className="group flex items-start gap-3 px-3 sm:px-4 py-2.5">
      <button
        onClick={() => onUpdate({ done: !item.done })}
        className={clsx(
          'h-7 w-7 grid place-items-center rounded-lg shrink-0 transition-colors',
          item.done ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.05]',
        )}
        style={item.done ? { background: 'var(--m-habits)' } : undefined}
        title={meta.label}
      >
        {item.done ? <Check size={14} /> : <Icon size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <input
          value={item.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className={clsx(
            'w-full bg-transparent text-sm font-medium outline-none',
            item.done && 'line-through text-slate-400',
          )}
        />
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <input
            type="time"
            value={item.time || ''}
            onChange={(e) => onUpdate({ time: e.target.value || undefined })}
            className="bg-transparent outline-none tabular-nums w-20 border-b border-dashed border-transparent hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)]"
          />
          <input
            value={item.location || ''}
            onChange={(e) => onUpdate({ location: e.target.value || undefined })}
            placeholder="Location"
            className="bg-transparent outline-none flex-1 min-w-0 border-b border-dashed border-transparent hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)]"
          />
          {item.confirmationCode && (
            <span className="chip text-[10px] bg-slate-900/[0.05] dark:bg-white/[0.05]">
              #{item.confirmationCode}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{item.notes}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 mt-1 shrink-0"
        aria-label="Delete"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}

// ── Small helpers ─────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input !py-1.5 !text-xs"
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'chip border whitespace-nowrap transition-all',
        active
          ? 'text-white border-transparent'
          : 'border-[color:var(--border-strong)] text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]',
      )}
      style={active ? { background: color } : undefined}
    >
      {label}
    </button>
  );
}

function formatRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  const fmt = (s: string) => {
    try {
      return format(fromISO(s + 'T00:00:00'), 'MMM d');
    } catch {
      return s;
    }
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end || '');
}
