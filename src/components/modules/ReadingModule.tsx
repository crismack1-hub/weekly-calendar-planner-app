import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import type { BookStatus } from '../../types';

const STATUSES: { id: BookStatus; label: string; color: string }[] = [
  { id: 'wishlist', label: 'Wishlist', color: '#94a3b8' },
  { id: 'reading', label: 'Reading', color: 'var(--m-reading)' },
  { id: 'done', label: 'Read', color: 'var(--m-habits)' },
];

export function ReadingModule() {
  const books = usePlannerStore((s) => s.books);
  const addBook = usePlannerStore((s) => s.addBook);
  const updateBook = usePlannerStore((s) => s.updateBook);
  const deleteBook = usePlannerStore((s) => s.deleteBook);

  const [filter, setFilter] = useState<BookStatus | 'all'>('all');

  const filtered = filter === 'all' ? books : books.filter((b) => b.status === filter);

  const actions = (
    <button
      className="btn-primary !text-xs"
      onClick={() => {
        const title = prompt('Book title?');
        if (!title?.trim()) return;
        const author = prompt('Author? (optional)') || undefined;
        addBook({ title: title.trim(), author, status: 'wishlist', progress: 0 });
      }}
    >
      <Plus size={13} /> Add book
    </button>
  );

  return (
    <ModulePage id="reading" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-3 sm:space-y-4 max-w-5xl mx-auto">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label={`All (${books.length})`} active={filter === 'all'} onClick={() => setFilter('all')} color="var(--m-reading)" />
          {STATUSES.map((s) => (
            <FilterChip
              key={s.id}
              label={`${s.label} (${books.filter((b) => b.status === s.id).length})`}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
              color={s.color}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-400 italic">
            No books in this list yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((b) => (
              <div key={b.id} className="card p-4 group relative">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{b.title}</h3>
                    {b.author && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{b.author}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${b.title}"?`)) deleteBook(b.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <select
                  value={b.status}
                  onChange={(e) => updateBook(b.id, { status: e.target.value as BookStatus })}
                  className="input !py-1 !text-xs mb-2"
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                {b.status === 'reading' && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="tabular-nums">{b.progress || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={b.progress || 0}
                      onChange={(e) => updateBook(b.id, { progress: parseInt(e.target.value, 10) })}
                      className="w-full accent-[color:var(--m-reading)]"
                    />
                  </div>
                )}

                {b.status === 'done' && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateBook(b.id, { rating: n === b.rating ? 0 : n })}
                        className="text-slate-300 dark:text-slate-700 hover:text-amber-400"
                      >
                        <Star
                          size={16}
                          fill={n <= (b.rating || 0) ? '#f59e0b' : 'none'}
                          stroke={n <= (b.rating || 0) ? '#f59e0b' : 'currentColor'}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModulePage>
  );
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'chip border transition-all',
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
