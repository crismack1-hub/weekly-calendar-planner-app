import { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Plus,
  X,
  Dumbbell,
  Apple,
  Moon,
  Brain,
} from 'lucide-react';
import clsx from 'clsx';
import { Modal } from './Modal';
import { usePlannerStore } from '../store/plannerStore';
import { MODULE_META } from './ModuleRail';
import { APPS, CORE_MODULES, APP_MODULES } from '../lib/apps';
import type {
  BgTheme,
  DietStyle,
  FitnessGoal,
  FitnessLevel,
  JournalingCadence,
  ModuleId,
  Settings,
  WellnessProfile,
  WorkoutType,
} from '../types';

const AVATAR_OPTIONS = ['✨', '🌟', '🌈', '🌿', '🌸', '🌊', '🔥', '🌙', '☀️', '🍃', '🪐', '🦋', '🌻', '🪴', '🧘', '📚', '💪', '🎨', '🎯', '⚡️'];

const ACCENT_OPTIONS: { color: string; name: string }[] = [
  { color: '#6366f1', name: 'Indigo' },
  { color: '#0ea5e9', name: 'Sky' },
  { color: '#10b981', name: 'Emerald' },
  { color: '#f59e0b', name: 'Amber' },
  { color: '#f43f5e', name: 'Rose' },
  { color: '#8b5cf6', name: 'Violet' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#14b8a6', name: 'Teal' },
];

const BG_OPTIONS: { id: BgTheme; label: string; preview: string }[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    preview:
      'radial-gradient(at 15% 15%, rgba(99,102,241,0.6) 0, transparent 55%), radial-gradient(at 85% 25%, rgba(236,72,153,0.55) 0, transparent 55%), radial-gradient(at 75% 90%, rgba(56,189,248,0.55) 0, transparent 55%), radial-gradient(at 25% 90%, rgba(34,197,94,0.4) 0, transparent 55%)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    preview:
      'radial-gradient(at 0% 0%, rgba(251,113,133,0.7) 0, transparent 55%), radial-gradient(at 100% 20%, rgba(251,146,60,0.7) 0, transparent 55%), radial-gradient(at 50% 100%, rgba(217,70,239,0.55) 0, transparent 55%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    preview:
      'radial-gradient(at 10% 10%, rgba(14,165,233,0.7) 0, transparent 55%), radial-gradient(at 90% 30%, rgba(20,184,166,0.6) 0, transparent 55%), radial-gradient(at 70% 95%, rgba(99,102,241,0.5) 0, transparent 55%)',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    preview:
      'radial-gradient(at 20% 10%, rgba(168,85,247,0.7) 0, transparent 55%), radial-gradient(at 80% 20%, rgba(217,70,239,0.55) 0, transparent 55%), radial-gradient(at 60% 100%, rgba(129,140,248,0.6) 0, transparent 55%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    preview:
      'radial-gradient(at 0% 10%, rgba(34,197,94,0.65) 0, transparent 55%), radial-gradient(at 95% 0%, rgba(132,204,22,0.55) 0, transparent 55%), radial-gradient(at 70% 95%, rgba(16,185,129,0.6) 0, transparent 55%)',
  },
  {
    id: 'candy',
    label: 'Candy',
    preview:
      'radial-gradient(at 15% 0%, rgba(236,72,153,0.7) 0, transparent 55%), radial-gradient(at 85% 10%, rgba(250,204,21,0.55) 0, transparent 55%), radial-gradient(at 50% 100%, rgba(56,189,248,0.65) 0, transparent 55%), radial-gradient(at 0% 70%, rgba(168,85,247,0.55) 0, transparent 55%)',
  },
  {
    id: 'mono',
    label: 'Mono',
    preview: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
  },
];

const CURRENCY_OPTIONS = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF',
  'CNY', 'INR', 'SGD', 'HKD', 'SEK', 'NOK', 'DKK', 'PLN',
  'BRL', 'MXN', 'ZAR', 'AED',
];

const FOCUS_SUGGESTIONS = [
  'Work', 'Side project', 'Health', 'Fitness', 'Learning', 'Family',
  'Creativity', 'Finance', 'Mindfulness', 'Travel', 'Social',
];

// Toggleable surface area = everything in the four apps.
// Core modules (today, dashboard, ai) are always-on essentials.
const REQUIRED_MODULES: ModuleId[] = CORE_MODULES;
const TOGGLEABLE: ModuleId[] = APP_MODULES;

const FITNESS_GOALS: { id: FitnessGoal; label: string }[] = [
  { id: 'lose', label: 'Lose weight' },
  { id: 'maintain', label: 'Maintain' },
  { id: 'gain', label: 'Gain muscle' },
  { id: 'strength', label: 'Build strength' },
  { id: 'endurance', label: 'Endurance' },
  { id: 'general', label: 'General fitness' },
];

const FITNESS_LEVELS: { id: FitnessLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const WORKOUT_TYPES: { id: WorkoutType; label: string }[] = [
  { id: 'cardio', label: 'Cardio' },
  { id: 'strength', label: 'Strength' },
  { id: 'flexibility', label: 'Flexibility' },
  { id: 'sports', label: 'Sports' },
  { id: 'other', label: 'Other' },
];

const EQUIPMENT_OPTIONS = [
  'Bodyweight',
  'Dumbbells',
  'Barbell',
  'Kettlebell',
  'Resistance bands',
  'Pull-up bar',
  'Full gym',
  'Cardio machine',
];

const DIET_STYLES: { id: DietStyle; label: string }[] = [
  { id: 'omnivore', label: 'Omnivore' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'lowcarb', label: 'Low-carb' },
  { id: 'other', label: 'Other' },
];

const ALLERGY_SUGGESTIONS = [
  'Peanuts', 'Tree nuts', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Sesame',
];

const JOURNALING_CADENCES: { id: JournalingCadence; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'occasional', label: 'Occasional' },
  { id: 'none', label: 'None' },
];

type Step = 0 | 1 | 2 | 3 | 4;

export function PersonalizeModal() {
  const open = usePlannerStore((s) => s.isPersonalizeOpen);
  const toggle = usePlannerStore((s) => s.togglePersonalize);
  const settings = usePlannerStore((s) => s.settings);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const isFirstRun = !settings.onboardingCompleted;

  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<Settings>(settings);
  const [newFocus, setNewFocus] = useState('');

  // Re-sync draft whenever modal opens so it reflects current saved state
  useEffect(() => {
    if (open) {
      setDraft(settings);
      setStep(0);
      setNewFocus('');
    }
  }, [open, settings]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleModule = (id: ModuleId) => {
    if (REQUIRED_MODULES.includes(id)) return;
    setDraft((d) => {
      // Empty visibleModules means "everything in TOGGLEABLE is on"
      const current = d.visibleModules.length === 0 ? [...TOGGLEABLE] : [...d.visibleModules];
      const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id];
      // If every toggleable module is on, store as [] (the "all on" shorthand)
      const allOn = TOGGLEABLE.every((m) => next.includes(m));
      return { ...d, visibleModules: allOn ? [] : next };
    });
  };

  const toggleApp = (appId: typeof APPS[number]['id'], turnOn: boolean) => {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return;
    setDraft((d) => {
      const current = new Set(d.visibleModules.length === 0 ? [...TOGGLEABLE] : d.visibleModules);
      for (const m of app.modules) {
        if (turnOn) current.add(m);
        else current.delete(m);
      }
      const next = Array.from(current);
      const allOn = TOGGLEABLE.every((m) => next.includes(m));
      return { ...d, visibleModules: allOn ? [] : next };
    });
  };

  const isModuleVisible = (id: ModuleId): boolean => {
    if (REQUIRED_MODULES.includes(id)) return true;
    if (draft.visibleModules.length === 0) return true;
    return draft.visibleModules.includes(id);
  };

  const addFocus = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (draft.focusAreas.includes(trimmed)) return;
    update('focusAreas', [...draft.focusAreas, trimmed]);
    setNewFocus('');
  };

  const removeFocus = (label: string) =>
    update('focusAreas', draft.focusAreas.filter((f) => f !== label));

  const save = () => {
    setSettings({ ...draft, onboardingCompleted: true });
    toggle(false);
  };

  const skip = () => {
    setSettings({ onboardingCompleted: true });
    toggle(false);
  };

  const updateWellness = <K extends keyof WellnessProfile>(key: K, value: WellnessProfile[K]) =>
    setDraft((d) => ({ ...d, wellness: { ...d.wellness, [key]: value } }));

  const stepInfo: { title: string; subtitle: string }[] = [
    { title: 'Welcome', subtitle: isFirstRun ? "Let's set up your workspace in 5 quick steps" : 'Update who you are' },
    { title: 'Look & feel', subtitle: 'Pick a theme and accent that feels like home' },
    { title: 'Workspace setup', subtitle: 'Currency, calendar, and how you track time' },
    { title: 'What you care about', subtitle: 'Choose your modules and focus areas' },
    { title: 'Wellness profile', subtitle: 'Tell us about your body, food, sleep & mind — all optional' },
  ];

  return (
    <Modal
      open={open}
      onClose={() => {
        // On first run, force the user to choose Save or Skip via the buttons
        if (!isFirstRun) toggle(false);
      }}
      title={
        <div className="flex items-center gap-2">
          <div
            className="grid h-7 w-7 place-items-center rounded-lg text-white"
            style={{
              background: `linear-gradient(135deg, ${draft.accent}, color-mix(in srgb, ${draft.accent} 60%, #ec4899))`,
              boxShadow: `0 6px 16px -6px color-mix(in srgb, ${draft.accent} 60%, transparent)`,
            }}
          >
            <Sparkles size={14} strokeWidth={2.4} />
          </div>
          <span>{isFirstRun ? 'Personalize your workspace' : 'Personalize'}</span>
        </div>
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2 px-5 py-3">
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: step === i ? 24 : 8,
                  background: step >= i ? draft.accent : 'var(--border-strong)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {isFirstRun && step === 0 && (
              <button onClick={skip} className="btn-ghost !text-xs">
                Skip
              </button>
            )}
            {step > 0 && (
              <button onClick={() => setStep((step - 1) as Step)} className="btn-secondary !text-xs">
                <ArrowLeft size={13} /> Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                className="btn-primary !text-xs"
                style={{ background: draft.accent }}
              >
                Next <ArrowRight size={13} />
              </button>
            ) : (
              <button onClick={save} className="btn-primary !text-xs" style={{ background: draft.accent }}>
                <Check size={13} /> {isFirstRun ? 'Get started' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <h3 className="text-base sm:text-lg font-semibold tracking-tight">{stepInfo[step].title}</h3>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stepInfo[step].subtitle}</p>
        </div>

        {step === 0 && <StepProfile draft={draft} update={update} />}
        {step === 1 && <StepLook draft={draft} update={update} />}
        {step === 2 && <StepWorkspace draft={draft} update={update} />}
        {step === 3 && (
          <StepInterests
            draft={draft}
            isModuleVisible={isModuleVisible}
            toggleModule={toggleModule}
            toggleApp={toggleApp}
            newFocus={newFocus}
            setNewFocus={setNewFocus}
            addFocus={addFocus}
            removeFocus={removeFocus}
          />
        )}
        {step === 4 && <StepWellness draft={draft} updateWellness={updateWellness} />}
      </div>
    </Modal>
  );
}

// ── Step 0: Profile ─────────────────────────────────────────
function StepProfile({
  draft,
  update,
}: {
  draft: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">What should we call you?</label>
        <input
          autoFocus
          value={draft.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          placeholder="Your name"
          className="input"
          maxLength={40}
        />
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          We'll use this in your dashboard greeting. Leave blank if you'd rather not.
        </p>
      </div>

      <div>
        <label className="label">Pick an avatar</label>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {AVATAR_OPTIONS.map((emoji) => {
            const active = draft.avatarEmoji === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => update('avatarEmoji', emoji)}
                className={clsx(
                  'grid h-10 w-10 place-items-center rounded-xl border text-xl transition-all',
                  active
                    ? 'border-transparent text-white shadow-sm scale-[1.05]'
                    : 'border-[color:var(--border-strong)] hover:-translate-y-[1px] hover:border-slate-400',
                )}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${draft.accent}, color-mix(in srgb, ${draft.accent} 60%, #ec4899))`,
                        boxShadow: `0 6px 16px -6px color-mix(in srgb, ${draft.accent} 60%, transparent)`,
                      }
                    : undefined
                }
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="card p-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${draft.accent} 10%, transparent), transparent 60%)`,
        }}
      >
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${draft.accent}, color-mix(in srgb, ${draft.accent} 60%, #ec4899))`,
            color: 'white',
            boxShadow: `0 10px 24px -8px color-mix(in srgb, ${draft.accent} 60%, transparent)`,
          }}
        >
          {draft.avatarEmoji || '✨'}
        </div>
        <div>
          <div className="text-sm font-semibold">
            Hi {draft.displayName ? draft.displayName.split(' ')[0] : 'there'} 👋
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Preview of your greeting</div>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Look & feel ─────────────────────────────────────
function StepLook({
  draft,
  update,
}: {
  draft: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => {
            const active = draft.theme === t;
            return (
              <button
                key={t}
                onClick={() => update('theme', t)}
                className={clsx(
                  'card p-3 text-center capitalize text-sm transition-all',
                  active ? 'ring-2' : 'hover:-translate-y-[1px]',
                )}
                style={
                  active
                    ? ({ ['--tw-ring-color' as string]: draft.accent } as React.CSSProperties)
                    : undefined
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Accent color</label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_OPTIONS.map((opt) => {
            const active = draft.accent === opt.color;
            return (
              <button
                key={opt.color}
                onClick={() => update('accent', opt.color)}
                className={clsx(
                  'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all',
                  active
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-[color:var(--border-strong)] hover:-translate-y-[1px]',
                )}
                style={
                  active
                    ? { background: opt.color, boxShadow: `0 8px 20px -8px ${opt.color}66` }
                    : undefined
                }
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ background: opt.color, boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.4)' : `inset 0 0 0 1px ${opt.color}66` }}
                />
                {opt.name}
              </button>
            );
          })}
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ml-1">
            Custom
            <input
              type="color"
              value={draft.accent}
              onChange={(e) => update('accent', e.target.value)}
              className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div>
        <label className="label">Background mood</label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {BG_OPTIONS.map((bg) => {
            const active = draft.bgTheme === bg.id;
            return (
              <button
                key={bg.id}
                onClick={() => update('bgTheme', bg.id)}
                className="group flex flex-col items-center gap-1"
                title={bg.label}
              >
                <span
                  className="block h-12 w-full rounded-xl transition-all duration-150 group-hover:scale-[1.03]"
                  style={{
                    backgroundImage: bg.preview,
                    backgroundColor: '#f8fafc',
                    boxShadow: active
                      ? `0 0 0 2px ${draft.accent}, 0 6px 16px -4px color-mix(in srgb, ${draft.accent} 30%, transparent)`
                      : 'inset 0 0 0 1px var(--border-strong)',
                  }}
                />
                <span
                  className={clsx('text-[10px] font-medium', !active && 'text-slate-500 dark:text-slate-400')}
                  style={active ? { color: draft.accent } : undefined}
                >
                  {bg.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Workspace setup ─────────────────────────────────
function StepWorkspace({
  draft,
  update,
}: {
  draft: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
      <div>
        <label className="label">Currency</label>
        <select
          className="input"
          value={draft.currency}
          onChange={(e) => update('currency', e.target.value)}
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {!CURRENCY_OPTIONS.includes(draft.currency) && (
            <option value={draft.currency}>{draft.currency} — custom</option>
          )}
        </select>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Used by the Finance tab</p>
      </div>

      <div>
        <label className="label">Week starts on</label>
        <select
          className="input"
          value={draft.weekStartsOn}
          onChange={(e) => update('weekStartsOn', +e.target.value as 0 | 1)}
        >
          <option value={0}>Sunday</option>
          <option value={1}>Monday</option>
        </select>
      </div>

      <div>
        <label className="label">Time format</label>
        <select
          className="input"
          value={draft.use24HourClock ? '24' : '12'}
          onChange={(e) => update('use24HourClock', e.target.value === '24')}
        >
          <option value="12">12-hour</option>
          <option value="24">24-hour</option>
        </select>
      </div>

      <div>
        <label className="label">Show weekends</label>
        <select
          className="input"
          value={draft.showWeekends ? 'yes' : 'no'}
          onChange={(e) => update('showWeekends', e.target.value === 'yes')}
        >
          <option value="yes">Yes</option>
          <option value="no">No (Mon-Fri only)</option>
        </select>
      </div>

      <div>
        <label className="label">Slot granularity</label>
        <select
          className="input"
          value={draft.slotMinutes}
          onChange={(e) => update('slotMinutes', +e.target.value as 15 | 30 | 60)}
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="label">Work day window</label>
        <div className="flex items-center gap-2 min-w-0">
          <select
            className="input min-w-0 flex-1"
            value={draft.workDayStart}
            onChange={(e) => update('workDayStart', +e.target.value)}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, '0')}:00
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 shrink-0">to</span>
          <select
            className="input min-w-0 flex-1"
            value={draft.workDayEnd}
            onChange={(e) => update('workDayEnd', +e.target.value)}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i + 1}>
                {(i + 1).toString().padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Modules + focus ─────────────────────────────────
function StepInterests({
  draft,
  isModuleVisible,
  toggleModule,
  toggleApp,
  newFocus,
  setNewFocus,
  addFocus,
  removeFocus,
}: {
  draft: Settings;
  isModuleVisible: (id: ModuleId) => boolean;
  toggleModule: (id: ModuleId) => void;
  toggleApp: (appId: typeof APPS[number]['id'], turnOn: boolean) => void;
  newFocus: string;
  setNewFocus: (v: string) => void;
  addFocus: (v: string) => void;
  removeFocus: (v: string) => void;
}) {
  const unsuggested = FOCUS_SUGGESTIONS.filter((f) => !draft.focusAreas.includes(f));

  return (
    <div className="space-y-5">
      <div>
        <label className="label !mb-1">Your Today workspace</label>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          One shared core, plus four focused apps. Turn an app on or off in bulk — or fine-tune the modules inside. You can change this any time.
        </p>

        {/* CORE — always on */}
        <div
          className="rounded-2xl border border-[color:var(--border-strong)] p-3 mb-3"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--m-today) 10%, transparent), transparent 65%)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="grid h-6 w-6 place-items-center rounded-lg text-white text-[10px] font-bold"
              style={{ background: 'linear-gradient(135deg, var(--m-today), var(--m-ai))' }}
            >
              ●
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold tracking-tight">Core</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Always on — shared across every app
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {CORE_MODULES.length} essentials
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {CORE_MODULES.map((id) => {
              const meta = MODULE_META[id];
              const Icon = meta.icon;
              return (
                <div
                  key={id}
                  className="flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-white dark:bg-white/[0.02] px-2 py-1.5"
                  title={meta.subtitle}
                >
                  <Icon size={12} strokeWidth={2.4} style={{ color: meta.cssVar }} />
                  <span className="text-[11px] font-medium truncate">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOUR APPS */}
        <div className="space-y-2.5">
          {APPS.map((app) => {
            const enabledCount = app.modules.filter((m) => isModuleVisible(m)).length;
            const allOn = enabledCount === app.modules.length;
            const allOff = enabledCount === 0;
            return (
              <div
                key={app.id}
                className="rounded-2xl border border-[color:var(--border-strong)] overflow-hidden transition-all"
                style={
                  allOff
                    ? undefined
                    : {
                        background: `linear-gradient(135deg, color-mix(in srgb, ${app.color} 12%, transparent), transparent 65%)`,
                      }
                }
              >
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[color:var(--border)]">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-lg text-white text-xs font-bold shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, color-mix(in srgb, ${app.color} 55%, #ec4899))`,
                      boxShadow: `0 6px 14px -6px ${app.color}66`,
                    }}
                  >
                    {app.label[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold tracking-tight">
                      {app.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {app.tagline}
                    </div>
                  </div>
                  <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {enabledCount}/{app.modules.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleApp(app.id, !allOn)}
                    className={clsx(
                      'text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-1 transition-all shrink-0',
                      allOn
                        ? 'text-white'
                        : 'text-slate-600 dark:text-slate-300 border border-[color:var(--border-strong)] hover:border-slate-400',
                    )}
                    style={allOn ? { background: app.color } : undefined}
                    aria-pressed={allOn}
                  >
                    {allOn ? 'On' : allOff ? 'Off' : 'Some'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2.5">
                  {app.modules.map((id) => {
                    const meta = MODULE_META[id];
                    const Icon = meta.icon;
                    const on = isModuleVisible(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleModule(id)}
                        className={clsx(
                          'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all min-w-0',
                          on
                            ? 'border-transparent text-white shadow-sm'
                            : 'border-[color:var(--border-strong)] text-slate-600 dark:text-slate-300 hover:-translate-y-[1px]',
                        )}
                        style={
                          on
                            ? {
                                background: `linear-gradient(135deg, ${meta.cssVar}, color-mix(in srgb, ${meta.cssVar} 55%, #ec4899))`,
                                boxShadow: `0 6px 16px -8px color-mix(in srgb, ${meta.cssVar} 70%, transparent)`,
                              }
                            : undefined
                        }
                        aria-pressed={on}
                      >
                        <Icon size={13} strokeWidth={2.4} />
                        <span className="text-[11px] font-medium flex-1 truncate">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Focus areas</label>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          Add the areas of life you want to track. You can edit or add more anytime.
        </p>

        {draft.focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {draft.focusAreas.map((f) => (
              <span
                key={f}
                className="chip border text-white"
                style={{
                  background: `linear-gradient(135deg, ${draft.accent}, color-mix(in srgb, ${draft.accent} 60%, #ec4899))`,
                  borderColor: 'transparent',
                }}
              >
                {f}
                <button
                  onClick={() => removeFocus(f)}
                  className="hover:opacity-80 ml-0.5"
                  aria-label={`Remove ${f}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFocus(newFocus);
          }}
          className="flex items-center gap-2 mb-2"
        >
          <input
            value={newFocus}
            onChange={(e) => setNewFocus(e.target.value)}
            placeholder="Add a focus area…"
            className="input flex-1"
            maxLength={30}
          />
          <button
            type="submit"
            disabled={!newFocus.trim()}
            className="btn-primary !text-xs"
            style={{ background: draft.accent }}
          >
            <Plus size={13} /> Add
          </button>
        </form>

        {unsuggested.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Suggestions</div>
            <div className="flex flex-wrap gap-1.5">
              {unsuggested.map((f) => (
                <button
                  key={f}
                  onClick={() => addFocus(f)}
                  className="chip border border-dashed border-[color:var(--border-strong)] text-slate-600 dark:text-slate-300 hover:border-solid hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]"
                >
                  <Plus size={11} /> {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Wellness ────────────────────────────────────────
function StepWellness({
  draft,
  updateWellness,
}: {
  draft: Settings;
  updateWellness: <K extends keyof WellnessProfile>(key: K, value: WellnessProfile[K]) => void;
}) {
  const w = draft.wellness ?? {};
  const accent = draft.accent;

  const toggleArrayItem = <T,>(arr: T[] | undefined, item: T): T[] => {
    const current = arr ?? [];
    return current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
  };

  return (
    <div className="space-y-5">
      {/* Fitness */}
      <WellnessSection icon={Dumbbell} title="Fitness" color="#22c55e">
        <PillRow label="Primary goal">
          {FITNESS_GOALS.map((g) => (
            <Pill
              key={g.id}
              active={w.fitnessGoal === g.id}
              accent={accent}
              onClick={() => updateWellness('fitnessGoal', w.fitnessGoal === g.id ? undefined : g.id)}
            >
              {g.label}
            </Pill>
          ))}
        </PillRow>

        <PillRow label="Experience level">
          {FITNESS_LEVELS.map((l) => (
            <Pill
              key={l.id}
              active={w.fitnessLevel === l.id}
              accent={accent}
              onClick={() => updateWellness('fitnessLevel', w.fitnessLevel === l.id ? undefined : l.id)}
            >
              {l.label}
            </Pill>
          ))}
        </PillRow>

        <PillRow label="Workout days / week">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Pill
              key={n}
              active={w.workoutDaysPerWeek === n}
              accent={accent}
              onClick={() => updateWellness('workoutDaysPerWeek', w.workoutDaysPerWeek === n ? undefined : n)}
            >
              {n}
            </Pill>
          ))}
        </PillRow>

        <PillRow label="Preferred workouts">
          {WORKOUT_TYPES.map((t) => (
            <Pill
              key={t.id}
              active={(w.preferredWorkoutTypes ?? []).includes(t.id)}
              accent={accent}
              onClick={() =>
                updateWellness('preferredWorkoutTypes', toggleArrayItem(w.preferredWorkoutTypes, t.id))
              }
            >
              {t.label}
            </Pill>
          ))}
        </PillRow>

        <PillRow label="Equipment available">
          {EQUIPMENT_OPTIONS.map((e) => (
            <Pill
              key={e}
              active={(w.equipment ?? []).includes(e)}
              accent={accent}
              onClick={() => updateWellness('equipment', toggleArrayItem(w.equipment, e))}
            >
              {e}
            </Pill>
          ))}
        </PillRow>

        <div className="grid grid-cols-2 gap-2.5">
          <NumberField
            label="Height (cm)"
            value={w.heightCm}
            min={50}
            max={250}
            placeholder="e.g. 175"
            onChange={(v) => updateWellness('heightCm', v)}
          />
          <NumberField
            label="Weight (kg)"
            value={w.weightKg}
            min={20}
            max={300}
            placeholder="e.g. 70"
            onChange={(v) => updateWellness('weightKg', v)}
          />
        </div>
      </WellnessSection>

      {/* Diet */}
      <WellnessSection icon={Apple} title="Diet & nutrition" color="#fb923c">
        <PillRow label="Diet style">
          {DIET_STYLES.map((d) => (
            <Pill
              key={d.id}
              active={w.dietStyle === d.id}
              accent={accent}
              onClick={() => updateWellness('dietStyle', w.dietStyle === d.id ? undefined : d.id)}
            >
              {d.label}
            </Pill>
          ))}
        </PillRow>

        <ChipEditor
          label="Allergies & restrictions"
          accent={accent}
          values={w.allergies ?? []}
          suggestions={ALLERGY_SUGGESTIONS}
          placeholder="Add an allergy…"
          onChange={(next) => updateWellness('allergies', next)}
        />

        <ChipEditor
          label="Foods you dislike"
          accent={accent}
          values={w.dislikes ?? []}
          suggestions={[]}
          placeholder="Add a food you avoid…"
          onChange={(next) => updateWellness('dislikes', next)}
        />

        <div className="grid grid-cols-3 gap-2.5">
          <NumberField
            label="Calorie target"
            value={w.calorieTargetKcal}
            min={800}
            max={6000}
            step={50}
            placeholder="kcal/day"
            onChange={(v) => updateWellness('calorieTargetKcal', v)}
          />
          <NumberField
            label="Protein target"
            value={w.proteinTargetG}
            min={20}
            max={400}
            step={5}
            placeholder="g/day"
            onChange={(v) => updateWellness('proteinTargetG', v)}
          />
          <NumberField
            label="Water target"
            value={w.waterTargetMl}
            min={500}
            max={6000}
            step={100}
            placeholder="ml/day"
            onChange={(v) => updateWellness('waterTargetMl', v)}
          />
        </div>
      </WellnessSection>

      {/* Sleep */}
      <WellnessSection icon={Moon} title="Sleep & recovery" color="#6366f1">
        <div className="grid grid-cols-3 gap-2.5">
          <TimeField
            label="Bedtime"
            value={w.bedtime}
            onChange={(v) => updateWellness('bedtime', v)}
          />
          <TimeField
            label="Wake time"
            value={w.wakeTime}
            onChange={(v) => updateWellness('wakeTime', v)}
          />
          <NumberField
            label="Sleep goal"
            value={w.sleepGoalHours}
            min={4}
            max={12}
            step={0.5}
            placeholder="hours"
            onChange={(v) => updateWellness('sleepGoalHours', v)}
          />
        </div>
      </WellnessSection>

      {/* Mindfulness */}
      <WellnessSection icon={Brain} title="Mindfulness" color="#a855f7">
        <NumberField
          label="Meditation minutes / day"
          value={w.meditationMinutesPerDay}
          min={0}
          max={180}
          step={5}
          placeholder="e.g. 10"
          onChange={(v) => updateWellness('meditationMinutesPerDay', v)}
        />

        <PillRow label="Journaling cadence">
          {JOURNALING_CADENCES.map((c) => (
            <Pill
              key={c.id}
              active={w.journalingCadence === c.id}
              accent={accent}
              onClick={() => updateWellness('journalingCadence', w.journalingCadence === c.id ? undefined : c.id)}
            >
              {c.label}
            </Pill>
          ))}
        </PillRow>

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!w.gratitudePractice}
            onChange={(e) => updateWellness('gratitudePractice', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
            style={{ accentColor: accent }}
          />
          Daily gratitude practice
        </label>
      </WellnessSection>
    </div>
  );
}

// ── Wellness step helpers ───────────────────────────────────
function WellnessSection({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: typeof Dumbbell;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-[color:var(--border-strong)] p-3.5 space-y-3"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, transparent), transparent 65%)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg text-white shrink-0"
          style={{
            background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #ec4899))`,
            boxShadow: `0 6px 14px -6px ${color}66`,
          }}
        >
          <Icon size={14} strokeWidth={2.4} />
        </span>
        <div className="text-xs font-semibold tracking-tight">{title}</div>
      </div>
      {children}
    </div>
  );
}

function PillRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all',
        active
          ? 'border-transparent text-white shadow-sm'
          : 'border-[color:var(--border-strong)] text-slate-600 dark:text-slate-300 hover:-translate-y-[1px]',
      )}
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 60%, #ec4899))`,
              boxShadow: `0 6px 14px -8px ${accent}66`,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        min={min}
        max={max}
        step={step ?? 1}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange(undefined);
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : undefined);
        }}
        className="input !text-xs"
      />
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
        {label}
      </label>
      <input
        type="time"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="input !text-xs"
      />
    </div>
  );
}

function ChipEditor({
  label,
  accent,
  values,
  suggestions,
  placeholder,
  onChange,
}: {
  label: string;
  accent: string;
  values: string[];
  suggestions: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft('');
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));
  const unsuggested = suggestions.filter((s) => !values.includes(s));

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
        {label}
      </label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v) => (
            <span
              key={v}
              className="chip text-white"
              style={{
                background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 60%, #ec4899))`,
                borderColor: 'transparent',
              }}
            >
              {v}
              <button
                onClick={() => remove(v)}
                className="hover:opacity-80 ml-0.5"
                aria-label={`Remove ${v}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
        className="flex items-center gap-2 mb-1.5"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="input !text-xs flex-1"
          maxLength={40}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="btn-primary !text-xs"
          style={{ background: accent }}
        >
          <Plus size={12} /> Add
        </button>
      </form>
      {unsuggested.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unsuggested.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="chip border border-dashed border-[color:var(--border-strong)] text-slate-600 dark:text-slate-300 hover:border-solid hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04] !text-[10px]"
            >
              <Plus size={10} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
