import { useMemo, useState } from 'react';
import { Plus, Trash2, Pill, Check, X as XIcon, Clock, AlertCircle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { addDays, dayKey, format, fromISO, formatTime } from '../../lib/dates';
import { doseOccurrenceKey, expandMedicationDoses } from '../../lib/integration';
import type { DoseStatus, Medication } from '../../types';

const MED_PALETTE = ['#e11d48', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#0ea5e9', '#7c3aed'];

const STATUS_META: Record<DoseStatus | 'pending', { icon: typeof Check; bg: string; color: string; label: string }> = {
  taken: { icon: Check, bg: 'var(--m-habits)', color: '#fff', label: 'Taken' },
  skipped: { icon: XIcon, bg: '#94a3b8', color: '#fff', label: 'Skipped' },
  missed: { icon: AlertCircle, bg: '#ef4444', color: '#fff', label: 'Missed' },
  pending: { icon: Clock, bg: 'transparent', color: '#64748b', label: 'Pending' },
};

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MedicationsModule() {
  const medications = usePlannerStore((s) => s.medications);
  const addMed = usePlannerStore((s) => s.addMedication);
  const updateMed = usePlannerStore((s) => s.updateMedication);
  const deleteMed = usePlannerStore((s) => s.deleteMedication);
  const logDose = usePlannerStore((s) => s.logDose);
  const use24h = usePlannerStore((s) => s.settings.use24HourClock);

  const [dayOffset, setDayOffset] = useState(0);
  const day = useMemo(() => addDays(new Date(), dayOffset), [dayOffset]);
  const dayLabel = useMemo(() => format(day, 'EEEE, MMM d'), [day]);

  // Today's doses across all active medications. We re-use the integration
  // expander so this view is always in sync with what the calendar shows.
  const todayDoses = useMemo(() => {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    const rows: { med: Medication; time: string; occKey: string; status: DoseStatus | 'pending' }[] = [];
    for (const med of medications) {
      if (!med.active) continue;
      const events = expandMedicationDoses(med, start, end);
      for (const ev of events) {
        const evDate = fromISO(ev.start);
        const time = `${String(evDate.getHours()).padStart(2, '0')}:${String(evDate.getMinutes()).padStart(2, '0')}`;
        const occKey = doseOccurrenceKey(evDate, time);
        rows.push({ med, time, occKey, status: med.doses[occKey] ?? 'pending' });
      }
    }
    rows.sort((a, b) => a.time.localeCompare(b.time));
    return rows;
  }, [medications, day]);

  const actions = (
    <button className="btn-primary !text-xs" onClick={() => handleNewMed(addMed)}>
      <Plus size={13} />
      <span className="hidden sm:inline">New medication</span>
    </button>
  );

  return (
    <ModulePage id="medications" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-5xl mx-auto">
        {/* Day nav for the schedule */}
        <div className="card flex items-center gap-2 p-2 sm:p-3">
          <button onClick={() => setDayOffset((v) => v - 1)} className="btn-ghost p-1.5" aria-label="Previous day">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-sm sm:text-base font-semibold">{dayLabel}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : dayOffset === -1 ? 'Yesterday' : `${dayOffset > 0 ? '+' : ''}${dayOffset} days`}
            </p>
          </div>
          <button onClick={() => setDayOffset((v) => v + 1)} className="btn-ghost p-1.5" aria-label="Next day">
            <ChevronRight size={16} />
          </button>
          {dayOffset !== 0 && (
            <button onClick={() => setDayOffset(0)} className="btn-secondary !text-xs">Today</button>
          )}
        </div>

        {/* Today's dose timeline */}
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center gap-2">
            <Calendar size={11} /> Dose schedule
            <span className="ml-auto text-[10px] text-slate-400 tabular-nums">
              {todayDoses.filter((d) => d.status === 'taken').length} / {todayDoses.length} taken
            </span>
          </h3>
          {todayDoses.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-400 italic">
              {medications.length === 0
                ? 'No medications yet. Click "New medication" to add one — doses appear here and on your calendar.'
                : 'No doses scheduled for this day.'}
            </div>
          ) : (
            <ul className="card divide-y divide-[color:var(--border)]">
              {todayDoses.map(({ med, time, occKey, status }) => (
                <DoseRow
                  key={`${med.id}:${occKey}`}
                  med={med}
                  time={time}
                  status={status}
                  use24h={use24h}
                  onMark={(s) => logDose(med.id, occKey, s)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Medication list */}
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2 px-1">
            My medications
          </h3>
          {medications.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-400 italic">
              No medications added yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              {medications.map((med) => (
                <MedicationCard
                  key={med.id}
                  med={med}
                  onUpdate={(patch) => updateMed(med.id, patch)}
                  onDelete={() => {
                    if (confirm(`Delete "${med.name}" and its dose history?`)) deleteMed(med.id);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </ModulePage>
  );
}

function handleNewMed(addMed: (m: Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'doses'>) => string) {
  const name = prompt('Medication name (e.g. "Lipitor")');
  if (!name?.trim()) return;
  const dosage = prompt('Dosage (e.g. "10mg" — optional)') || undefined;
  const timesStr = prompt('Times of day (24h, comma-separated). Example: 08:00, 20:00', '08:00');
  if (!timesStr) return;
  const times = timesStr
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    .map((t) => {
      const [h, m] = t.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    });
  if (times.length === 0) {
    alert('At least one time is required (format HH:mm).');
    return;
  }
  addMed({
    name: name.trim(),
    dosage,
    color: MED_PALETTE[Math.floor(Math.random() * MED_PALETTE.length)],
    emoji: '💊',
    times,
    startDate: dayKey(new Date()),
    reminderMinutesBefore: 10,
    active: true,
  });
}

function DoseRow({
  med,
  time,
  status,
  use24h,
  onMark,
}: {
  med: Medication;
  time: string;
  status: DoseStatus | 'pending';
  use24h: boolean;
  onMark: (s: DoseStatus | null) => void;
}) {
  const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
  const d = new Date();
  d.setHours(hh, mm, 0, 0);

  return (
    <li className="flex items-center gap-3 px-3 sm:px-4 py-3">
      <span
        className="h-9 w-9 grid place-items-center rounded-xl shrink-0"
        style={{
          background: `linear-gradient(135deg, ${med.color}, color-mix(in srgb, ${med.color} 60%, #000 0%))`,
          color: '#fff',
        }}
      >
        <span className="text-lg leading-none">{med.emoji ?? '💊'}</span>
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold truncate">{med.name}</span>
          {med.dosage && <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{med.dosage}</span>}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums flex items-center gap-1">
          <Clock size={10} /> {formatTime(d, use24h)}
          {status !== 'pending' && (
            <span
              className="ml-1 chip text-[10px]"
              style={{ background: `${STATUS_META[status].bg}1f`, color: STATUS_META[status].bg }}
            >
              {STATUS_META[status].label}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <DoseActionButton
          label="Taken"
          active={status === 'taken'}
          color="var(--m-habits)"
          onClick={() => onMark(status === 'taken' ? null : 'taken')}
        >
          <Check size={14} />
        </DoseActionButton>
        <DoseActionButton
          label="Skip"
          active={status === 'skipped'}
          color="#94a3b8"
          onClick={() => onMark(status === 'skipped' ? null : 'skipped')}
        >
          <XIcon size={14} />
        </DoseActionButton>
      </div>
    </li>
  );
}

function DoseActionButton({
  active,
  color,
  onClick,
  label,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={clsx(
        'h-8 w-8 grid place-items-center rounded-lg border transition-all',
        active ? 'border-transparent text-white' : 'border-[color:var(--border-strong)] text-slate-500 hover:text-slate-900 dark:hover:text-white',
      )}
      style={active ? { background: color } : undefined}
    >
      {children}
    </button>
  );
}

function MedicationCard({
  med,
  onUpdate,
  onDelete,
}: {
  med: Medication;
  onUpdate: (patch: Partial<Medication>) => void;
  onDelete: () => void;
}) {
  const daysOfWeek = med.daysOfWeek && med.daysOfWeek.length > 0 ? med.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
  const totalDosesLogged = Object.values(med.doses).length;
  const takenCount = Object.values(med.doses).filter((s) => s === 'taken').length;
  const adherence = totalDosesLogged ? Math.round((takenCount / totalDosesLogged) * 100) : null;

  return (
    <div
      className="card p-3 sm:p-4 space-y-2.5 group relative"
      style={{
        borderColor: `${med.color}33`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="h-10 w-10 grid place-items-center rounded-xl shrink-0 text-xl"
          style={{
            background: `linear-gradient(135deg, ${med.color}1f, ${med.color}0a)`,
            color: med.color,
          }}
        >
          <Pill size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={med.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
          <input
            value={med.dosage || ''}
            onChange={(e) => onUpdate({ dosage: e.target.value || undefined })}
            placeholder="dosage"
            className="w-full bg-transparent text-[11px] text-slate-500 dark:text-slate-400 outline-none"
          />
        </div>
        <button
          onClick={() => onUpdate({ active: !med.active })}
          className={clsx(
            'chip text-[10px] shrink-0',
            med.active ? 'text-white' : 'border border-[color:var(--border-strong)] text-slate-400',
          )}
          style={med.active ? { background: 'var(--m-habits)' } : undefined}
        >
          {med.active ? 'Active' : 'Paused'}
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {med.times.map((t, i) => (
          <span key={`${t}-${i}`} className="chip text-[10px] bg-slate-900/[0.04] dark:bg-white/[0.06]">
            <Clock size={9} /> {t}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {DAYS_SHORT.map((d, idx) => {
          const on = daysOfWeek.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => {
                const cur = med.daysOfWeek && med.daysOfWeek.length > 0 ? med.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
                const next = cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx].sort();
                onUpdate({ daysOfWeek: next.length === 7 ? [] : next });
              }}
              className={clsx(
                'h-6 w-6 rounded-md text-[10px] font-bold transition-colors',
                on ? 'text-white' : 'border border-[color:var(--border-strong)] text-slate-400',
              )}
              style={on ? { background: med.color } : undefined}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span>From {format(fromISO(med.startDate + 'T00:00:00'), 'MMM d')}</span>
        {med.endDate && <span>· until {format(fromISO(med.endDate + 'T00:00:00'), 'MMM d')}</span>}
        {adherence != null && (
          <span
            className="ml-auto tabular-nums font-medium"
            style={{ color: adherence >= 80 ? 'var(--m-habits)' : adherence >= 50 ? 'var(--m-tasks)' : '#ef4444' }}
          >
            {adherence}% adherence
          </span>
        )}
      </div>
    </div>
  );
}
