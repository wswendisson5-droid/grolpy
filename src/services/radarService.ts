import { MonitoredGroup, Opportunity, ActivityEvent, RadarStatus, CurrentScanState } from '../types/nexus';
import { safeEncodeURIComponent } from '../utils/safeUri';

export interface RadarStatusResponse {
  status: RadarStatus;
  activationTimestamp: number;
  monitoredGroupsCount: number;
  queueSize: number;
  analyzedPhonesCount: number;
  opportunitiesCount: number;
  lastProcessedAt: number;
  currentScan?: CurrentScanState;
}

export interface RealGroupItem {
  id: string;
  jid: string;
  name: string;
  avatar: string;
  messageCount: number;
  participantsCount?: number;
  status: 'active' | 'inactive';
  isMonitored: boolean;
}

class RadarService {
  private groupsCache: RealGroupItem[] = [];
  private groupsLoadedAt = 0;
  /**
   * Get current Radar system status & queue metrics
   */
  async getStatus(): Promise<RadarStatusResponse | null> {
    try {
      const res = await fetch('/api/radar/status');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Toggle Radar Active / Paused
   */
  async setStatus(status: RadarStatus): Promise<boolean> {
    try {
      const res = await fetch('/api/radar/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch REAL WhatsApp groups from the connected Evolution instance
   */
  getCachedGroups(): RealGroupItem[] {
    return this.groupsCache;
  }

  async getRealGroups(): Promise<RealGroupItem[]> {
    const cached = this.groupsCache;
    if (cached.length > 0 && Date.now() - this.groupsLoadedAt < 30_000) {
      return cached;
    }
    try {
      const res = await fetch('/api/radar/groups');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.groups)) {
        this.groupsCache = data.groups;
        this.groupsLoadedAt = Date.now();
        return data.groups;
      }
      return cached;
    } catch {
      return cached;
    }
  }

  /**
   * Toggle monitoring of a specific group
   */
  async toggleMonitoredGroup(groupJid: string, isMonitored: boolean): Promise<boolean> {
    try {
      const res = await fetch('/api/radar/monitored-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupJid, isMonitored }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Save list of monitored group JIDs
   */
  async setMonitoredGroups(groupJids: string[]): Promise<boolean> {
    try {
      const res = await fetch('/api/radar/monitored-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupJids }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch real detected opportunities
   */
  async getOpportunities(): Promise<Opportunity[]> {
    try {
      const res = await fetch('/api/radar/opportunities');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.opportunities)) {
        return data.opportunities;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Update opportunity stage / status
   */
  async updateOpportunityStage(
    id: string,
    stage: Opportunity['stage'],
    assignedUserName?: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/radar/opportunities/${safeEncodeURIComponent(id)}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, assignedUserName }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start Contact / Assumir no CRM:
   * - Assigns opportunity to user
   * - Sets stage to em_atendimento
   * - Adds tags 'Radar' and 'Oportunidade Radar'
   * - Returns target remoteJid to immediately open conversation in CRM
   */
  async startContact(
    opportunityId: string,
    assignedUserName: string = 'Enzo Santos'
  ): Promise<{
    success: boolean;
    contactJid?: string;
    remoteJid?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/radar/start-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId, assignedUserName }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch real activity log
   */
  async getActivities(): Promise<ActivityEvent[]> {
    try {
      const res = await fetch('/api/radar/activities');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.activities)) {
        return data.activities;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Query real typing status for a WhatsApp JID
   */
  async getTypingStatus(jid: string): Promise<boolean> {
    if (!jid) return false;
    try {
      const res = await fetch(`/api/crm/typing-status?jid=${safeEncodeURIComponent(jid)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.isTyping);
    } catch {
      return false;
    }
  }
}

export const radarService = new RadarService();
