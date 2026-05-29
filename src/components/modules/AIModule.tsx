import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Wand2,
  Calendar,
  ListChecks,
  Target,
  BookHeart,
  Lightbulb,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../../store/plannerStore';
import { ModulePage } from './ModulePage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const QUICK_PROMPTS: { icon: LucideIcon; title: string; prompt: string }[] = [
  { icon: Calendar, title: 'Plan my week', prompt: "Help me plan my upcoming week. Look at my events, tasks, and goals and suggest a balanced schedule." },
  { icon: ListChecks, title: 'Prioritize tasks', prompt: 'Help me prioritize my open tasks using the Eisenhower matrix.' },
  { icon: Target, title: 'Suggest goals', prompt: "Based on my recent activity, suggest 3 weekly goals that would move me forward." },
  { icon: BookHeart, title: 'Reflect with me', prompt: 'Ask me thoughtful questions to help me reflect on this week.' },
  { icon: Wand2, title: 'Summarize my week', prompt: 'Summarize what I did this week and what stood out.' },
  { icon: Lightbulb, title: 'Habit ideas', prompt: 'Suggest 3 small habits I could add that would compound over time.' },
];

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi — I'm your planning assistant. I can help you plan your week, prioritize tasks, reflect, or brainstorm goals.\n\nThis is a UI preview. To connect a real AI model, set an API key in Settings — until then I'll respond with helpful template suggestions based on your planner data.",
  timestamp: Date.now(),
};

export function AIModule() {
  const tasks = usePlannerStore((s) => s.tasks);
  const events = usePlannerStore((s) => s.events);
  const habits = usePlannerStore((s) => s.habits);
  const goals = usePlannerStore((s) => s.goals);

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      const reply = generateReply(trimmed, { tasks, events, habits, goals });
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      setMessages((m) => [...m, assistantMsg]);
      setThinking(false);
    }, 650);
  };

  const showQuick = messages.length <= 1;

  const actions = (
    <button
      onClick={() => setMessages([WELCOME])}
      className="btn-ghost !text-xs"
      title="Reset conversation"
    >
      <RefreshCw size={13} /> Reset
    </button>
  );

  return (
    <ModulePage id="ai" actions={actions}>
      <div className="flex h-full flex-col">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto calendar-scroll px-3 sm:px-5 lg:px-7 py-4 sm:py-6">
          <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {thinking && (
              <div className="flex items-start gap-3 animate-float-in">
                <div className="module-icon-bubble" style={{ ['--m' as string]: 'var(--m-ai)' }}>
                  <Sparkles size={14} />
                </div>
                <div className="flex items-center gap-1 px-4 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 pulse-glow" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 pulse-glow" style={{ animationDelay: '0.2s' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 pulse-glow" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            {showQuick && (
              <div className="pt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2 px-1">
                  Try a quick prompt
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map((qp) => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={qp.title}
                        onClick={() => send(qp.prompt)}
                        className="card-hover flex items-start gap-3 p-3 text-left"
                      >
                        <div
                          className="grid h-8 w-8 place-items-center rounded-lg shrink-0"
                          style={{
                            background: 'color-mix(in srgb, var(--m-ai) 14%, transparent)',
                            color: 'var(--m-ai)',
                          }}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{qp.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {qp.prompt}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-[color:var(--border)] p-2 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="max-w-3xl mx-auto"
          >
            <div
              className="card flex items-end gap-2 p-2 pl-3.5 focus-within:ring-2 transition-all"
              style={{ ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--m-ai) 40%, transparent)' }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask me to plan, prioritize, reflect, or brainstorm…"
                rows={1}
                className="flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-slate-400 max-h-32"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="grid h-8 w-8 place-items-center rounded-lg text-white transition-all disabled:opacity-40 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, var(--m-ai), var(--m-journal))',
                  boxShadow: '0 6px 14px -4px color-mix(in srgb, var(--m-ai) 60%, transparent)',
                }}
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 text-center">
              Press Enter to send · Shift+Enter for new line. Responses are template-based until an API key is connected.
            </p>
          </form>
        </div>
      </div>
    </ModulePage>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={clsx('flex items-start gap-3 animate-float-in', isUser && 'flex-row-reverse')}>
      <div
        className={clsx('grid h-8 w-8 place-items-center rounded-xl shrink-0', isUser ? 'bg-slate-900/[0.06] dark:bg-white/[0.08]' : '')}
        style={
          isUser
            ? undefined
            : {
                background: 'linear-gradient(135deg, var(--m-ai), var(--m-journal))',
                color: 'white',
                boxShadow: '0 6px 18px -8px color-mix(in srgb, var(--m-ai) 60%, transparent)',
              }
        }
      >
        {isUser ? (
          <span className="text-[11px] font-semibold tracking-tight">You</span>
        ) : (
          <Sparkles size={14} />
        )}
      </div>
      <div
        className={clsx(
          'rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm leading-relaxed max-w-[78%] sm:max-w-[80%] whitespace-pre-wrap min-w-0 break-words',
          isUser
            ? 'bg-slate-900/[0.05] dark:bg-white/[0.06]'
            : 'card',
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

// Local heuristic responses — no external calls.
function generateReply(
  user: string,
  ctx: { tasks: ReturnType<typeof usePlannerStore.getState>['tasks']; events: ReturnType<typeof usePlannerStore.getState>['events']; habits: ReturnType<typeof usePlannerStore.getState>['habits']; goals: ReturnType<typeof usePlannerStore.getState>['goals'] },
): string {
  const text = user.toLowerCase();
  const openTasks = ctx.tasks.filter((t) => t.status !== 'done');
  const urgentTasks = openTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high');

  if (/(plan|schedule).*(week|day)/.test(text)) {
    return [
      "Here's a suggested rhythm for the week:",
      '',
      `• **Open tasks:** ${openTasks.length} (${urgentTasks.length} high/urgent)`,
      `• **Habits to maintain:** ${ctx.habits.map((h) => h.name).join(', ') || 'none yet'}`,
      `• **This week's goals:** ${ctx.goals.filter((g) => !g.done).length} pending`,
      '',
      '**A balanced plan:**',
      '1. Time-block 90 min for deep work in the morning when energy is highest.',
      '2. Batch shallow work (email, reviews) after lunch.',
      '3. Tackle one high-priority task per day — finish > start.',
      '4. Protect a 30-min daily window for habits.',
      '5. Reserve Friday afternoon for review + planning ahead.',
      '',
      'Want me to suggest specific time blocks for tomorrow?',
    ].join('\n');
  }

  if (/(prioritiz|important|urgent|eisenhower)/.test(text)) {
    if (openTasks.length === 0) return "Inbox zero — nothing open to prioritize! Add a few tasks and ask me again.";
    return [
      'Eisenhower matrix for your open tasks:',
      '',
      '**Urgent + Important (do now):**',
      ...openTasks.filter((t) => t.priority === 'urgent').map((t) => `  • ${t.title}`),
      '',
      '**Important, Not Urgent (schedule):**',
      ...openTasks.filter((t) => t.priority === 'high').map((t) => `  • ${t.title}`),
      '',
      '**Urgent, Not Important (delegate or batch):**',
      ...openTasks.filter((t) => t.priority === 'med').map((t) => `  • ${t.title}`),
      '',
      '**Not Urgent, Not Important (drop or someday):**',
      ...openTasks.filter((t) => t.priority === 'low' || !t.priority).map((t) => `  • ${t.title}`),
    ].join('\n');
  }

  if (/(goal|suggest)/.test(text)) {
    return [
      'Three goal ideas based on what you already track:',
      '',
      `1. **Finish ${urgentTasks[0]?.title || 'a single high-priority task'}** by end of week.`,
      `2. **Hit every habit ${ctx.habits[0]?.name ? `("${ctx.habits[0].name}")` : ''} at least 5 days.**`,
      '3. **Schedule a 90-minute review block** on Sunday evening to plan next week.',
      '',
      'A good weekly goal is specific, time-bounded, and points at one clear outcome — not a list of tasks.',
    ].join('\n');
  }

  if (/(reflect|journal|how was)/.test(text)) {
    return [
      'A few questions to reflect on:',
      '',
      '• What was the single best moment of your week?',
      '• What drained you most — and what could you do less of?',
      '• Which habit felt easiest? Which one resisted you?',
      '• If you could redo one decision this week, what would change?',
      '• What do you want next week to feel like?',
      '',
      'You can answer here or open the Journal tab to write it down.',
    ].join('\n');
  }

  if (/(summar|recap|this week)/.test(text)) {
    const doneThisWeek = ctx.tasks.filter((t) => t.status === 'done').length;
    const upcomingEvents = ctx.events.length;
    return [
      `Quick recap of your workspace:`,
      '',
      `• ✓ ${doneThisWeek} tasks completed`,
      `• 📅 ${upcomingEvents} events on your calendar`,
      `• 🔁 ${ctx.habits.length} habits being tracked`,
      `• 🎯 ${ctx.goals.length} goals defined`,
      '',
      'For a deeper view, open the Analytics tab.',
    ].join('\n');
  }

  if (/(habit|routine)/.test(text)) {
    return [
      'Three small habits that compound:',
      '',
      '• **2-minute morning planning** — write the one task that would make today a win.',
      '• **Walk after lunch** — resets focus and digests calories.',
      '• **Shutdown ritual** — at end of work, write tomorrow\'s top 3, then close laptop.',
      '',
      'Stack each new habit onto an existing routine — that\'s where they stick.',
    ].join('\n');
  }

  // Default
  return [
    "Here are a few directions I can help with:",
    '',
    '• Plan or rebalance your week',
    '• Prioritize your open tasks',
    '• Suggest weekly goals or habits',
    '• Walk you through a reflection',
    '• Summarize what you\'ve done',
    '',
    'Pick a quick prompt above, or describe what you want and I\'ll take a shot.',
  ].join('\n');
}
