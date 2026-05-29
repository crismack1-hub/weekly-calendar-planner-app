import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { APPS, type AppDef } from './apps';
import type { ModuleId, Subscription, SubscriptionTier } from '../types';

/**
 * Per-tier feature matrix. Single source of truth for what each tier unlocks.
 *
 * Both the UI gating (PersonalizeModal, ModuleRail, App.tsx renderModule) and
 * the AI proxy (server-side quota check) should read from this table.
 *
 * To change pricing/limits, edit this object and the Stripe products to match.
 */
export interface TierConfig {
  /** Which app IDs from apps.ts APPS are unlocked. */
  apps: ReadonlyArray<AppDef['id']>;
  /** Monthly AI message limit. 0 means AI is locked entirely. */
  aiMessagesPerMonth: number;
  /** Shared planner (planner_members / planner_invites). */
  canShare: boolean;
  /** Multi-device cloud sync via Supabase. */
  cloudSync: boolean;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    apps: ['plan'],
    aiMessagesPerMonth: 10, // small "try it" allowance to drive conversion
    canShare: false,
    cloudSync: false,
  },
  plus: {
    apps: ['plan', 'grow', 'live', 'dream'],
    aiMessagesPerMonth: 200,
    canShare: false,
    cloudSync: true,
  },
  pro: {
    apps: ['plan', 'grow', 'live', 'dream'],
    aiMessagesPerMonth: 2000,
    canShare: true,
    cloudSync: true,
  },
};

const FREE_SUBSCRIPTION: Subscription = {
  userId: '',
  tier: 'free',
  status: 'inactive',
  aiMessagesUsed: 0,
  aiPeriodStart: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function rowToSubscription(r: any): Subscription {
  return {
    userId: r.user_id,
    tier: r.tier,
    status: r.status,
    stripeCustomerId: r.stripe_customer_id ?? undefined,
    stripeSubscriptionId: r.stripe_subscription_id ?? undefined,
    currentPeriodEnd: r.current_period_end ?? undefined,
    aiMessagesUsed: r.ai_messages_used ?? 0,
    aiPeriodStart: r.ai_period_start,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── Shared in-memory state (mirrors the pattern in src/lib/sync.ts) ──
let current: Subscription = FREE_SUBSCRIPTION;
let channel: RealtimeChannel | null = null;
const listeners = new Set<(s: Subscription) => void>();

function notify() {
  listeners.forEach((l) => l(current));
}

async function fetchSubscription(uid: string) {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) {
    console.warn('entitlements: fetch failed', error);
    return;
  }
  current = data ? rowToSubscription(data) : { ...FREE_SUBSCRIPTION, userId: uid };
  notify();
}

function subscribeRealtime(uid: string) {
  if (!supabase) return;
  channel?.unsubscribe();
  channel = supabase
    .channel(`subscriptions-${uid}`)
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${uid}` },
      (payload: any) => {
        if (payload.eventType === 'DELETE') {
          current = { ...FREE_SUBSCRIPTION, userId: uid };
        } else if (payload.new) {
          current = rowToSubscription(payload.new);
        }
        notify();
      },
    )
    .subscribe();
}

/** Call from the auth bootstrap when a user signs in. */
export async function startEntitlements(uid: string) {
  current = { ...FREE_SUBSCRIPTION, userId: uid };
  notify();
  await fetchSubscription(uid);
  subscribeRealtime(uid);
}

/** Call on sign-out. */
export function stopEntitlements() {
  channel?.unsubscribe();
  channel = null;
  current = FREE_SUBSCRIPTION;
  notify();
}

/** Non-React access — for libs like sync.ts that need to gate behavior. */
export function getEntitlements(): Subscription {
  return current;
}

// ── React hook ────────────────────────────────────────────────
export interface Entitlements {
  subscription: Subscription;
  tier: SubscriptionTier;
  status: Subscription['status'];
  /** Subscription is in a billing state that should unlock features. */
  isActive: boolean;
  /** Paid tier AND active/trialing — the right check for "should we unlock paid features". */
  isPaid: boolean;
  /** Whether an app (collection of modules) is unlocked. */
  canUseApp: (appId: AppDef['id']) => boolean;
  /** Whether a single module is unlocked. Core modules always return true. */
  canUseModule: (moduleId: ModuleId) => boolean;
  canShare: boolean;
  canUseAi: boolean;
  cloudSync: boolean;
  aiQuota: {
    used: number;
    limit: number;
    remaining: number;
    periodStart: string;
  };
}

export function useEntitlements(): Entitlements {
  const [sub, setSub] = useState<Subscription>(current);

  useEffect(() => {
    // Resync on mount in case `current` changed between render and effect.
    setSub(current);
    listeners.add(setSub);
    return () => {
      listeners.delete(setSub);
    };
  }, []);

  const config = TIER_CONFIG[sub.tier];
  const aiRemaining = Math.max(0, config.aiMessagesPerMonth - sub.aiMessagesUsed);
  const isActive = sub.status === 'active' || sub.status === 'trialing';

  return {
    subscription: sub,
    tier: sub.tier,
    status: sub.status,
    isActive,
    isPaid: sub.tier !== 'free' && isActive,
    canUseApp: (appId) => config.apps.includes(appId),
    canUseModule: (moduleId) => {
      // Core modules (today, dashboard, ai) don't belong to an app — always available
      // (AI itself is gated by aiMessagesPerMonth, not by module visibility).
      const app = APPS.find((a) => a.modules.includes(moduleId));
      if (!app) return true;
      return config.apps.includes(app.id);
    },
    canShare: config.canShare,
    canUseAi: config.aiMessagesPerMonth > 0,
    cloudSync: config.cloudSync,
    aiQuota: {
      used: sub.aiMessagesUsed,
      limit: config.aiMessagesPerMonth,
      remaining: aiRemaining,
      periodStart: sub.aiPeriodStart,
    },
  };
}
