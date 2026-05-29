import { useState, useMemo, useEffect } from 'react';
import { Plus, Pin, Trash2, Search } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';
import { format, fromISO } from '../../lib/dates';

export function NotesModule() {
  const notes = usePlannerStore((s) => s.notes);
  const addNote = usePlannerStore((s) => s.addNote);
  const updateNote = usePlannerStore((s) => s.updateNote);
  const deleteNote = usePlannerStore((s) => s.deleteNote);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!activeId && notes.length > 0) setActiveId(notes[0].id);
  }, [notes, activeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q) ||
            n.tags?.some((t) => t.toLowerCase().includes(q)),
        )
      : notes;
    return [...list].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return fromISO(b.updatedAt).getTime() - fromISO(a.updatedAt).getTime();
    });
  }, [notes, query]);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const actions = (
    <button
      className="btn-primary !text-xs"
      onClick={() => {
        const id = addNote({ title: 'Untitled', body: '' });
        setActiveId(id);
      }}
    >
      <Plus size={13} /> New note
    </button>
  );

  return (
    <ModulePage id="notes" actions={actions}>
      <div className="grid md:grid-cols-[18rem_1fr] h-full">
        {/* List — collapses on mobile when a note is selected */}
        <aside
          className={`border-r border-[color:var(--border)] md:flex flex-col overflow-hidden ${active ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="p-3 border-b border-[color:var(--border)]">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes…"
                className="input !pl-7 !py-1.5 !text-sm"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto calendar-scroll">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-400 italic">No notes yet</li>
            )}
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setActiveId(n.id)}
                  className={clsx(
                    'w-full px-3 py-2.5 text-left border-l-2 transition-all',
                    activeId === n.id
                      ? 'bg-slate-900/[0.04] dark:bg-white/[0.04] border-[color:var(--m-notes)]'
                      : 'border-transparent hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <Pin size={10} className="text-[color:var(--m-notes)]" />}
                    <span className="text-sm font-medium truncate flex-1">{n.title || 'Untitled'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {n.body.split('\n')[0] || 'Empty'}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {format(fromISO(n.updatedAt), 'MMM d')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Editor */}
        <section className={`flex-col overflow-hidden ${active ? 'flex' : 'hidden md:flex'}`}>
          {active ? (
            <>
              <div className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-3 border-b border-[color:var(--border)]">
                <button
                  onClick={() => setActiveId(null)}
                  className="btn-ghost p-1.5 md:hidden"
                  aria-label="Back to list"
                  title="Back"
                >
                  ‹
                </button>
                <input
                  value={active.title}
                  onChange={(e) => updateNote(active.id, { title: e.target.value })}
                  placeholder="Title"
                  className="flex-1 min-w-0 bg-transparent text-base sm:text-lg font-semibold tracking-tight outline-none placeholder:text-slate-400"
                />
                <button
                  onClick={() => updateNote(active.id, { pinned: !active.pinned })}
                  className={clsx(
                    'btn-ghost p-1.5 shrink-0',
                    active.pinned && 'text-[color:var(--m-notes)]',
                  )}
                  title={active.pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this note?')) {
                      deleteNote(active.id);
                      setActiveId(null);
                    }
                  }}
                  className="btn-ghost p-1.5 text-rose-500/80 hover:text-rose-500 shrink-0"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={active.body}
                onChange={(e) => updateNote(active.id, { body: e.target.value })}
                placeholder="Start writing…"
                className="flex-1 w-full resize-none bg-transparent p-4 sm:p-5 lg:p-7 text-sm leading-relaxed outline-none placeholder:text-slate-400 calendar-scroll"
              />
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-slate-400">
              Select or create a note
            </div>
          )}
        </section>
      </div>
    </ModulePage>
  );
}
