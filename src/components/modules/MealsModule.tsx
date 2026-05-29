import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Flame, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { addDays, dayKey, format, fromISO, formatTime } from '../../lib/dates';
import type { Meal, MealType } from '../../types';

const TYPE_META: Record<MealType, { label: string; emoji: string; defaultTime: string; color: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🥞', defaultTime: '08:00', color: '#f97316' },
  lunch: { label: 'Lunch', emoji: '🥗', defaultTime: '12:30', color: '#10b981' },
  dinner: { label: 'Dinner', emoji: '🍝', defaultTime: '18:30', color: '#a855f7' },
  snack: { label: 'Snack', emoji: '🍎', defaultTime: '15:00', color: '#0ea5e9' },
};

const TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function MealsModule() {
  const meals = usePlannerStore((s) => s.meals);
  const addMeal = usePlannerStore((s) => s.addMeal);
  const updateMeal = usePlannerStore((s) => s.updateMeal);
  const deleteMeal = usePlannerStore((s) => s.deleteMeal);
  const use24h = usePlannerStore((s) => s.settings.use24HourClock);

  const [offset, setOffset] = useState(0);
  const date = useMemo(() => addDays(new Date(), offset), [offset]);
  const dKey = dayKey(date);

  const todayMeals = useMemo(
    () => meals.filter((m) => m.date === dKey).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    [meals, dKey],
  );

  const totalCalories = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const loggedCount = todayMeals.filter((m) => m.logged).length;

  const actions = (
    <button className="btn-primary !text-xs" onClick={() => quickAddMeal(addMeal, dKey)}>
      <Plus size={13} />
      <span className="hidden sm:inline">Plan meal</span>
    </button>
  );

  return (
    <ModulePage id="meals" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-5xl mx-auto">
        {/* Day nav + summary */}
        <div className="card flex items-center gap-2 sm:gap-3 p-2 sm:p-3">
          <button onClick={() => setOffset((v) => v - 1)} className="btn-ghost p-1.5">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1">
            <h2 className="text-sm sm:text-base font-semibold">{format(date, 'EEEE, MMM d')}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {loggedCount}/{todayMeals.length} logged
              {totalCalories > 0 && <span className="ml-2">· {totalCalories} kcal planned</span>}
            </p>
          </div>
          <button onClick={() => setOffset((v) => v + 1)} className="btn-ghost p-1.5">
            <ChevronRight size={16} />
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="btn-secondary !text-xs">Today</button>
          )}
        </div>

        {/* Type-grouped slots */}
        <div className="grid sm:grid-cols-2 gap-3">
          {TYPE_ORDER.map((type) => {
            const items = todayMeals.filter((m) => m.type === type);
            const meta = TYPE_META[type];
            return (
              <section
                key={type}
                className="card overflow-hidden"
                style={{ borderColor: `${meta.color}33` }}
              >
                <header
                  className="px-3 py-2 border-b border-[color:var(--border)] flex items-center gap-2"
                  style={{ background: `linear-gradient(90deg, ${meta.color}14, transparent 80%)` }}
                >
                  <span className="text-lg leading-none">{meta.emoji}</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                    {meta.label}
                  </h3>
                  <span className="ml-auto text-[10px] text-slate-400 tabular-nums">{items.length}</span>
                  <button
                    onClick={() =>
                      addMeal({
                        title: '',
                        type,
                        date: dKey,
                        time: meta.defaultTime,
                      })
                    }
                    className="btn-ghost p-1"
                    aria-label={`Add ${meta.label}`}
                  >
                    <Plus size={13} />
                  </button>
                </header>
                <ul className="divide-y divide-[color:var(--border)]">
                  {items.length === 0 ? (
                    <li className="px-3 py-3 text-[11px] text-slate-400 italic">No {meta.label.toLowerCase()} planned</li>
                  ) : (
                    items.map((m) => (
                      <MealRow
                        key={m.id}
                        meal={m}
                        use24h={use24h}
                        onUpdate={(patch) => updateMeal(m.id, patch)}
                        onDelete={() => deleteMeal(m.id)}
                      />
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center flex items-center justify-center gap-1.5">
          <CalendarIcon size={11} /> Meals appear on your calendar automatically.
        </p>
      </div>
    </ModulePage>
  );
}

function quickAddMeal(addMeal: (m: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>) => string, date: string) {
  const title = prompt('What are you eating?');
  if (!title?.trim()) return;
  const types = TYPE_ORDER.map((t) => TYPE_META[t].label).join(', ');
  const typeStr = (prompt(`Type? (${types})`, 'lunch') || 'lunch').toLowerCase();
  const type = (TYPE_ORDER.find((t) => t === typeStr) ?? 'lunch') as MealType;
  const time = prompt('Time (HH:mm)', TYPE_META[type].defaultTime) || TYPE_META[type].defaultTime;
  addMeal({ title: title.trim(), type, date, time });
}

function MealRow({
  meal,
  use24h,
  onUpdate,
  onDelete,
}: {
  meal: Meal;
  use24h: boolean;
  onUpdate: (patch: Partial<Meal>) => void;
  onDelete: () => void;
}) {
  const t = (meal.time || TYPE_META[meal.type].defaultTime).split(':');
  const d = new Date();
  d.setHours(parseInt(t[0], 10), parseInt(t[1], 10), 0, 0);

  return (
    <li className="group flex items-center gap-2 px-3 py-2.5">
      <button
        onClick={() => onUpdate({ logged: !meal.logged })}
        className={clsx(
          'h-5 w-5 grid place-items-center rounded-md border shrink-0 transition-all',
          meal.logged ? 'border-transparent text-white' : 'border-[color:var(--border-strong)] hover:border-[color:var(--m-habits)]',
        )}
        style={meal.logged ? { background: 'var(--m-habits)' } : undefined}
      >
        {meal.logged && <Check size={11} />}
      </button>
      <div className="flex-1 min-w-0">
        <input
          value={meal.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="What are you eating?"
          className={clsx(
            'w-full bg-transparent text-sm outline-none',
            meal.logged && 'line-through text-slate-400',
          )}
        />
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          <input
            type="time"
            value={meal.time || ''}
            onChange={(e) => onUpdate({ time: e.target.value || undefined })}
            className="bg-transparent outline-none w-20 border-b border-dashed border-transparent hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)]"
          />
          <span>· {formatTime(d, use24h)}</span>
          {(meal.calories || 0) > 0 && (
            <span className="chip text-[10px] bg-slate-900/[0.04] dark:bg-white/[0.06]">
              <Flame size={9} /> {meal.calories} kcal
            </span>
          )}
        </div>
      </div>
      <input
        type="number"
        value={meal.calories ?? ''}
        onChange={(e) => onUpdate({ calories: e.target.value ? parseInt(e.target.value, 10) : undefined })}
        placeholder="kcal"
        className="w-16 text-right text-[11px] bg-transparent outline-none tabular-nums border-b border-dashed border-transparent hover:border-[color:var(--border-strong)] focus:border-[color:var(--accent)]"
      />
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
        aria-label="Delete"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}
