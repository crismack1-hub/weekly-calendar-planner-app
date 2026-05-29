import type { ModuleId } from '../../types';
import { MODULE_META } from '../ModuleRail';

interface ModulePageProps {
  id: ModuleId;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  avatarEmoji?: string;
  children: React.ReactNode;
}

export function ModulePage({ id, title, subtitle, actions, avatarEmoji, children }: ModulePageProps) {
  const meta = MODULE_META[id];
  const Icon = meta.icon;
  return (
    <div
      className="flex h-full flex-col overflow-hidden animate-float-in"
      style={{ ['--m' as string]: meta.cssVar }}
    >
      <header className="module-header">
        <div className="module-icon-bubble">
          {avatarEmoji ? (
            <span className="text-base sm:text-lg leading-none">{avatarEmoji}</span>
          ) : (
            <Icon size={16} strokeWidth={2.2} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="module-title">
            <span className="gradient-text">{title ?? meta.label}</span>
          </h1>
          <div className="module-subtitle">{subtitle ?? meta.subtitle}</div>
        </div>
        {actions && (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 max-w-[55%] overflow-x-auto calendar-scroll">
            {actions}
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto calendar-scroll">{children}</div>
    </div>
  );
}
