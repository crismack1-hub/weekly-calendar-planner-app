import { useMemo, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { format, fromISO, dayKey } from '../../lib/dates';
import type { TxnKind } from '../../types';

// Common currencies — users can also type any ISO 4217 code via "Other…".
const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'NZD', label: 'New Zealand Dollar' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'CNY', label: 'Chinese Yuan' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'HKD', label: 'Hong Kong Dollar' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'NOK', label: 'Norwegian Krone' },
  { code: 'DKK', label: 'Danish Krone' },
  { code: 'PLN', label: 'Polish Zloty' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'MXN', label: 'Mexican Peso' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'AED', label: 'UAE Dirham' },
];

export function FinanceModule() {
  const transactions = usePlannerStore((s) => s.transactions);
  const addTransaction = usePlannerStore((s) => s.addTransaction);
  const deleteTransaction = usePlannerStore((s) => s.deleteTransaction);
  const currency = usePlannerStore((s) => s.settings.currency);
  const setSettings = usePlannerStore((s) => s.setSettings);

  const [draft, setDraft] = useState({ amount: '', category: '', kind: 'expense' as TxnKind, note: '' });

  const fmt = useMemo(() => makeFormatter(currency), [currency]);

  const onCurrencyChange = (value: string) => {
    if (value === '__custom__') {
      const code = prompt('ISO currency code (e.g. THB, ARS, ILS):', currency);
      if (!code) return;
      const upper = code.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(upper)) {
        alert('Please enter a valid 3-letter ISO 4217 code.');
        return;
      }
      try {
        // Validate by attempting a format
        new Intl.NumberFormat(undefined, { style: 'currency', currency: upper }).format(0);
      } catch {
        alert(`"${upper}" isn't a currency code your browser recognizes.`);
        return;
      }
      setSettings({ currency: upper });
      return;
    }
    setSettings({ currency: value });
  };

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.kind === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [transactions]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      if (t.kind !== 'expense') continue;
      m.set(t.category || 'Other', (m.get(t.category || 'Other') || 0) + t.amount);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const recent = useMemo(
    () => [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 15),
    [transactions],
  );

  const knownInList = CURRENCIES.some((c) => c.code === currency);
  const actions = (
    <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-full">
      <span className="hidden md:inline">Currency</span>
      <select
        value={knownInList ? currency : '__custom_selected__'}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="input !py-1 !pr-6 !text-xs !w-auto !max-w-[10rem]"
        aria-label="Currency"
      >
        {!knownInList && (
          <option value="__custom_selected__">{currency} — custom</option>
        )}
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.label}
          </option>
        ))}
        <option value="__custom__">Other…</option>
      </select>
    </label>
  );

  return (
    <ModulePage id="finance" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatBox label="Income" value={fmt(totals.income)} accent="#10b981" icon={<TrendingUp size={14} />} />
          <StatBox label="Spent" value={fmt(totals.expense)} accent="#f43f5e" icon={<TrendingDown size={14} />} />
          <StatBox
            label="Net"
            value={fmt(totals.net)}
            accent={totals.net >= 0 ? '#10b981' : '#f43f5e'}
            icon={<Wallet size={14} />}
          />
        </div>

        {/* Add */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const amt = parseFloat(draft.amount);
            if (!amt || amt <= 0) return;
            addTransaction({
              amount: amt,
              kind: draft.kind,
              category: draft.category.trim() || 'Other',
              note: draft.note.trim() || undefined,
              date: dayKey(new Date()),
            });
            setDraft({ amount: '', category: '', kind: 'expense', note: '' });
          }}
          className="card p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-12 gap-2"
        >
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as TxnKind })}
            className="input !py-1.5 sm:col-span-2"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            placeholder="Amount"
            className="input !py-1.5 sm:col-span-2"
          />
          <input
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            placeholder="Category"
            className="input !py-1.5 col-span-2 sm:col-span-3"
          />
          <input
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="Note (optional)"
            className="input !py-1.5 col-span-2 sm:col-span-3"
          />
          <button className="btn-primary !text-xs col-span-2 sm:col-span-2">
            <Plus size={13} /> Add
          </button>
        </form>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="card p-5">
            <h3 className="text-sm font-semibold mb-3">Spending by category</h3>
            {byCategory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No expenses yet</p>
            ) : (
              <div className="space-y-2.5">
                {byCategory.map(([cat, amt]) => {
                  const pct = (amt / totals.expense) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{cat}</span>
                        <span className="tabular-nums text-slate-500">{fmt(amt)} · {Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full" style={{ width: `${pct}%`, background: 'var(--m-finance)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h3 className="text-sm font-semibold mb-3">Recent transactions</h3>
            {recent.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nothing logged yet.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--border)]">
                {recent.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 py-2">
                    <span
                      className="h-7 w-7 grid place-items-center rounded-lg text-xs"
                      style={{
                        background: t.kind === 'income' ? '#10b9811f' : '#f43f5e1f',
                        color: t.kind === 'income' ? '#10b981' : '#f43f5e',
                      }}
                    >
                      {t.kind === 'income' ? '+' : '−'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{t.category}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {format(fromISO(t.date), 'MMM d')}{t.note ? ` · ${t.note}` : ''}
                      </div>
                    </div>
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: t.kind === 'income' ? '#10b981' : 'inherit' }}
                    >
                      {t.kind === 'income' ? '+' : '−'}{fmt(t.amount)}
                    </span>
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </ModulePage>
  );
}

function StatBox({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="stat-card" style={{ ['--m' as string]: accent }}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function makeFormatter(currency: string) {
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  return (n: number) => formatter.format(n);
}
