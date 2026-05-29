import type { ModuleId } from '../../types';
import { ModulePage } from './ModulePage';
import { MODULE_META } from '../ModuleRail';
import { Sparkles } from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';

interface StubModuleProps {
  id: ModuleId;
  blurb: string;
  features: string[];
}

export function StubModule({ id, blurb, features }: StubModuleProps) {
  const meta = MODULE_META[id];
  const Icon = meta.icon;
  const setActiveModule = usePlannerStore((s) => s.setActiveModule);

  return (
    <ModulePage id={id}>
      <div className="p-3 sm:p-5 lg:p-7 max-w-2xl mx-auto">
        <div
          className="card relative overflow-hidden p-8 sm:p-10 text-center"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${meta.cssVar} 12%, transparent), transparent 60%)`,
          }}
        >
          <div
            className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${meta.cssVar}, color-mix(in srgb, ${meta.cssVar} 60%, #ec4899))`,
              boxShadow: `0 14px 30px -10px color-mix(in srgb, ${meta.cssVar} 60%, transparent)`,
            }}
          >
            <Icon size={28} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            <span className="gradient-text" style={{ ['--m' as string]: meta.cssVar } as React.CSSProperties}>
              {meta.label}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">{blurb}</p>

          <div className="text-left max-w-md mx-auto">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2">
              Coming next
            </h3>
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span
                    className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: meta.cssVar }}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Sparkles size={12} />
            In the meantime,
            <button onClick={() => setActiveModule('ai')} className="underline hover:text-slate-900 dark:hover:text-slate-100">
              ask the AI assistant
            </button>
            to help.
          </div>
        </div>
      </div>
    </ModulePage>
  );
}
