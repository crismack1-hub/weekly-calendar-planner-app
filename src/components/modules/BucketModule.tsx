import { Plus, Trash2, Check } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';

export function BucketModule() {
  const bucket = usePlannerStore((s) => s.bucket);
  const add = usePlannerStore((s) => s.addBucketItem);
  const update = usePlannerStore((s) => s.updateBucketItem);
  const del = usePlannerStore((s) => s.deleteBucketItem);

  const actions = (
    <button
      className="btn-primary !text-xs"
      onClick={() => {
        const title = prompt('Bucket-list item?');
        if (!title?.trim()) return;
        add({ title: title.trim() });
      }}
    >
      <Plus size={13} /> Add
    </button>
  );

  const remaining = bucket.filter((b) => !b.done);
  const done = bucket.filter((b) => b.done);

  return (
    <ModulePage id="bucket" actions={actions}>
      <div className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 max-w-3xl mx-auto">
        {bucket.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-400 italic">
            What would make this life feel well-lived? Add your first dream.
          </div>
        ) : (
          <>
            <Section title="Someday" items={remaining} update={update} del={del} />
            {done.length > 0 && <Section title="Done" items={done} update={update} del={del} muted />}
          </>
        )}
      </div>
    </ModulePage>
  );
}

function Section({
  title,
  items,
  update,
  del,
  muted,
}: {
  title: string;
  items: ReturnType<typeof usePlannerStore.getState>['bucket'];
  update: (id: string, patch: Partial<ReturnType<typeof usePlannerStore.getState>['bucket'][number]>) => void;
  del: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2 px-1">
        {title} ({items.length})
      </h3>
      <ul className="card divide-y divide-[color:var(--border)]">
        {items.map((b) => (
          <li key={b.id} className="group flex items-start gap-3 px-4 py-3">
            <button
              onClick={() => update(b.id, { done: !b.done })}
              className={clsx(
                'h-5 w-5 mt-0.5 rounded-full border grid place-items-center transition-all shrink-0',
                b.done
                  ? 'border-transparent text-white'
                  : 'border-[color:var(--border-strong)] hover:border-[color:var(--m-bucket)]',
              )}
              style={b.done ? { background: 'var(--m-bucket)' } : undefined}
            >
              {b.done && <Check size={12} />}
            </button>
            <span className={clsx('flex-1 text-sm', muted && 'text-slate-400 line-through')}>
              {b.title}
            </span>
            <button
              onClick={() => del(b.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
