export type PlanId = 'start' | 'pro' | 'max';

export interface PlanConfig {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  monthlyPriceNumber: number;
  maxGroups: number;           // Start: 20, Pro: 45, Max: 90
  maxRoundsPerDay: number;     // Start: 1, Pro: 2, Max: 3
  maxMonthlySends: number;     // Start: 600, Pro: 2.700, Max: 8.100
  maxActiveCampaigns: number;  // Start: 2, Pro: 5, Max: 10
  historyDays: number;         // Start: 7, Pro: 30, Max: 90
  supportType: 'E-mail' | 'Prioritário' | 'VIP';
}

export const PLANS: Record<PlanId, PlanConfig> = {
  start: {
    id: 'start',
    name: 'Start',
    tagline: 'Comece a divulgar',
    price: '39,90',
    monthlyPriceNumber: 39.9,
    maxGroups: 20,
    maxRoundsPerDay: 1,
    maxMonthlySends: 600,
    maxActiveCampaigns: 2,
    historyDays: 7,
    supportType: 'E-mail',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Mais resultados',
    price: '69,90',
    monthlyPriceNumber: 69.9,
    maxGroups: 45,
    maxRoundsPerDay: 2,
    maxMonthlySends: 2700,
    maxActiveCampaigns: 5,
    historyDays: 30,
    supportType: 'Prioritário',
  },
  max: {
    id: 'max',
    name: 'Max',
    tagline: 'Sem limites para crescer',
    price: '119,90',
    monthlyPriceNumber: 119.9,
    maxGroups: 90,
    maxRoundsPerDay: 3,
    maxMonthlySends: 8100,
    maxActiveCampaigns: 10,
    historyDays: 90,
    supportType: 'VIP',
  },
};

export interface SubscriptionState {
  planId: PlanId;
  plan: PlanConfig;
  validUntil: string;
  status: 'active' | 'expired' | 'canceled';
}

class PlanService {
  private currentSubscription: {
    planId: PlanId;
    validUntil: string;
    status: 'active' | 'expired' | 'canceled';
  } = {
    planId: 'pro',
    validUntil: '20/10/2026',
    status: 'active',
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    // Attempt to load from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('groply_subscription');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && PLANS[parsed.planId as PlanId]) {
            this.currentSubscription = { ...this.currentSubscription, ...parsed };
          }
        }
      } catch {
        // ignore
      }
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getSubscription(): SubscriptionState {
    return {
      ...this.currentSubscription,
      plan: this.getCurrentPlan(),
    };
  }

  getPlan(planId: PlanId = this.currentSubscription.planId): PlanConfig {
    return PLANS[planId] || PLANS.pro;
  }

  getCurrentPlan(): PlanConfig {
    return this.getPlan(this.currentSubscription.planId);
  }

  async setPlan(newPlanId: PlanId): Promise<{ success: boolean; subscription: SubscriptionState }> {
    if (!PLANS[newPlanId]) {
      return { success: false, subscription: this.getSubscription() };
    }

    this.currentSubscription.planId = newPlanId;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('groply_subscription', JSON.stringify(this.currentSubscription));
      } catch {
        // ignore
      }
    }

    try {
      await fetch('/api/client/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlanId }),
      });
    } catch {
      // ignore
    }

    this.notify();
    return { success: true, subscription: this.getSubscription() };
  }

  /**
   * Calculate UNIQUE group JIDs used across all active, paused or scheduled campaigns.
   * As specified: paused campaigns continue reserving their groups so users cannot pause
   * to bypass the limit. Concluded / deleted campaigns release their slots.
   */
  getUniqueGroupJidsInAutomations(campaigns: any[], excludeCampaignId?: string): Set<string> {
    const uniqueSet = new Set<string>();
    if (!Array.isArray(campaigns)) return uniqueSet;

    for (const c of campaigns) {
      if (excludeCampaignId && c.id === excludeCampaignId) continue;
      // Active, paused, agendada, or enviando campaigns reserve their unique groups
      if (c.status !== 'concluida' && c.status !== 'falha') {
        const jids = Array.isArray(c.selectedGroupJids) ? c.selectedGroupJids : [];
        for (const jid of jids) {
          if (jid) uniqueSet.add(jid);
        }
      }
    }
    return uniqueSet;
  }

  /**
   * Count active campaigns. Drafts (rascunhos) or concluded campaigns do NOT consume this quota.
   */
  getActiveCampaignsCount(campaigns: any[]): number {
    if (!Array.isArray(campaigns)) return 0;
    return campaigns.filter((c) => c.active === true && c.status !== 'concluida' && c.status !== 'falha').length;
  }

  /**
   * Checks if selecting a new group would exceed the unique groups limit.
   */
  canSelectGroup(
    campaigns: any[],
    currentSelectedJids: string[],
    targetGroupJid: string,
    editingCampaignId?: string
  ): {
    allowed: boolean;
    alreadyInUse: boolean;
    currentUsed: number;
    limit: number;
  } {
    const plan = this.getCurrentPlan();
    const existingReserved = this.getUniqueGroupJidsInAutomations(campaigns, editingCampaignId);

    // If group is already selected in the current form, toggling off is always allowed
    if (currentSelectedJids.includes(targetGroupJid)) {
      const combined = new Set([...existingReserved, ...currentSelectedJids]);
      return {
        allowed: true,
        alreadyInUse: existingReserved.has(targetGroupJid),
        currentUsed: combined.size,
        limit: plan.maxGroups,
      };
    }

    // If group is already used by another active campaign, selecting it does NOT consume a new slot!
    const alreadyInUse = existingReserved.has(targetGroupJid);
    const candidateSet = new Set([...existingReserved, ...currentSelectedJids, targetGroupJid]);

    if (candidateSet.size > plan.maxGroups) {
      return {
        allowed: false,
        alreadyInUse,
        currentUsed: candidateSet.size - 1,
        limit: plan.maxGroups,
      };
    }

    return {
      allowed: true,
      alreadyInUse,
      currentUsed: candidateSet.size,
      limit: plan.maxGroups,
    };
  }

  /**
   * Checks if activating another campaign is within the limit.
   */
  canActivateCampaign(campaigns: any[], campaignIdToActivate?: string): {
    allowed: boolean;
    activeCount: number;
    limit: number;
  } {
    const plan = this.getCurrentPlan();
    const activeCount = campaigns.filter(
      (c) => c.active === true && c.id !== campaignIdToActivate && c.status !== 'concluida'
    ).length;

    return {
      allowed: activeCount < plan.maxActiveCampaigns,
      activeCount,
      limit: plan.maxActiveCampaigns,
    };
  }

  /**
   * Checks monthly sends limit.
   */
  canSendMessages(campaigns: any[], additionalSends: number = 0): {
    allowed: boolean;
    used: number;
    limit: number;
  } {
    const plan = this.getCurrentPlan();
    const currentSent = Array.isArray(campaigns)
      ? campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0)
      : 0;
    const projected = currentSent + additionalSends;
    return {
      allowed: projected <= plan.maxMonthlySends,
      used: currentSent,
      limit: plan.maxMonthlySends,
    };
  }

  /**
   * Validates daily rounds (frequency) for groups on a given date.
   * Start: max 1/day, Pro: max 2/day, Max: max 3/day.
   */
  checkDailyRoundsLimit(
    campaigns: any[],
    selectedGroupJids: string[],
    groupsInfoOrTimesCount: any = 1,
    roundsCountOrDate: any = 1,
    editingCampaignId?: string
  ): {
    allowed: boolean;
    groupName?: string;
    existingSendTime?: string;
    alreadySentToday?: number;
    exceededGroupJid?: string;
    existingRounds: number;
    limit: number;
  } {
    const plan = this.getCurrentPlan();
    const maxRounds = plan.maxRoundsPerDay;

    let scheduleTimesCount = 1;
    let groupNamesMap: Record<string, string> = {};

    if (Array.isArray(groupsInfoOrTimesCount)) {
      groupsInfoOrTimesCount.forEach((g: any) => {
        if (g?.jid && g?.name) groupNamesMap[g.jid] = g.name;
      });
      scheduleTimesCount = typeof roundsCountOrDate === 'number' ? roundsCountOrDate : 1;
    } else if (typeof groupsInfoOrTimesCount === 'number') {
      scheduleTimesCount = groupsInfoOrTimesCount;
    }

    // Count existing scheduled sends for each group
    const groupDailyCount: Record<string, number> = {};
    const groupLatestTime: Record<string, string> = {};

    for (const c of campaigns) {
      if (editingCampaignId && c.id === editingCampaignId) continue;
      if (c.status === 'concluida' || c.status === 'falha') continue;

      if (Array.isArray(c.selectedGroupJids)) {
        const timesCount = Array.isArray(c.scheduleTimes) ? c.scheduleTimes.length : 1;
        const timeSample = Array.isArray(c.scheduleTimes) ? c.scheduleTimes[0] : (c.scheduleTime || '14:00');
        for (const jid of c.selectedGroupJids) {
          groupDailyCount[jid] = (groupDailyCount[jid] || 0) + timesCount;
          if (!groupLatestTime[jid]) groupLatestTime[jid] = timeSample;
        }
      }
    }

    for (const jid of selectedGroupJids) {
      const existing = groupDailyCount[jid] || 0;
      if (existing + scheduleTimesCount > maxRounds) {
        return {
          allowed: false,
          groupName: groupNamesMap[jid] || 'Grupo Selecionado',
          existingSendTime: groupLatestTime[jid] || '14:00',
          alreadySentToday: existing,
          exceededGroupJid: jid,
          existingRounds: existing,
          limit: maxRounds,
        };
      }
    }

    return {
      allowed: true,
      existingRounds: 0,
      limit: maxRounds,
    };
  }
}

export const planService = new PlanService();
