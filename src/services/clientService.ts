import { ClientGroup, DivulgacaoCard } from '../components/client-panel/types';
import { safeEncodeURIComponent } from '../utils/safeUri';

export interface ClientHistoryItem {
  id: string;
  campaignId?: string;
  campaignTitle: string;
  groupJid?: string;
  groupName: string;
  groupMembersCount?: number;
  messageText: string;
  imageUrl?: string;
  mediaType?: 'imagem' | 'texto' | 'video' | 'documento';
  status: 'delivered' | 'sent' | 'failed';
  error?: string;
  timeFormatted: string;
  timestamp: string;
  duration?: string;
}

export interface ClientPlanUsageMetrics {
  monthly: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
  };
  daily: {
    roundsUsed: number;
    roundsLimit: number;
    sentToday: number;
  };
  groups: {
    used: number;
    limit: number;
  };
  campaigns: {
    activeCount: number;
    limit: number;
  };
}

class ClientService {
  private defaultInstance: string = '';
  private cachedGroups: ClientGroup[] = [];
  private cachedCampaigns: DivulgacaoCard[] = [];
  private lastFetchTime: number = 0;

  constructor() {
    // Groups are loaded per-user dynamically once authenticated
  }

  getDefaultInstance(): string { return this.defaultInstance; }
  private authHeaders(extra:Record<string,string>={}) { const token=typeof window!=='undefined'?localStorage.getItem('groply_token')||'':''; return {...extra,...(token?{Authorization:`Bearer ${token}`}:{})}; }

  getGroupsStorageKey(): string {
    if (typeof window === 'undefined') return 'groply_cached_groups';
    try {
      const u = JSON.parse(localStorage.getItem('groply_user') || '{}');
      return u.id ? `groply_cached_groups_${u.id}` : 'groply_cached_groups';
    } catch {
      return 'groply_cached_groups';
    }
  }

  getCachedGroups(): ClientGroup[] {
    if (!this.isWhatsAppConnected()) {
      this.cachedGroups = [];
      return [];
    }
    if (this.cachedGroups.length === 0 && typeof window !== 'undefined') {
      try {
        const key = this.getGroupsStorageKey();
        const g = localStorage.getItem(key);
        if (g) this.cachedGroups = JSON.parse(g);
      } catch {}
    }
    return this.cachedGroups;
  }

  getProfileStorageKey(): string {
    if (typeof window === 'undefined') return 'groply_whatsapp_profile';
    try {
      const u = JSON.parse(localStorage.getItem('groply_user') || '{}');
      return u.id ? `groply_whatsapp_profile_${u.id}` : 'groply_whatsapp_profile';
    } catch {
      return 'groply_whatsapp_profile';
    }
  }

  isWhatsAppConnected(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const key = this.getProfileStorageKey();
      const p = localStorage.getItem(key);
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.isConnected || parsed.number || parsed.pictureUrl) return true;
      }
    } catch {}
    return false;
  }

  getCachedProfile(): any {
    if (typeof window === 'undefined') return null;
    try {
      const key = this.getProfileStorageKey();
      const p = localStorage.getItem(key);
      return p ? JSON.parse(p) : null;
    } catch {
      return null;
    }
  }

  async getWhatsAppStatus(instance: string = this.defaultInstance): Promise<{
    isConnected: boolean;
    state: string;
    profile: {
      name?: string;
      number?: string;
      pictureUrl?: string;
      instanceName?: string;
      connectedAt?: string;
    } | null;
  }> {
    try {
      const res = await fetch('/api/evolution/status', { headers: this.authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const isConn =
          data.state === 'connected' ||
          data.state === 'open' ||
          data.status === 'CONNECTED' ||
          Boolean(data.connectedProfile?.number || data.connectedProfile?.pictureUrl);

        if (data.instanceName) {
          this.defaultInstance = data.instanceName;
        }

        let profile = data.connectedProfile;
        if (isConn && !profile) {
          profile = {
            name: 'WhatsApp Conectado',
            number: '',
            pictureUrl: `/api/whatsapp/avatar?instance=${encodeURIComponent(data.instanceName || instance)}`,
            instanceName: data.instanceName || instance,
          };
        } else if (isConn && profile) {
          if (!profile.name) {
            profile.name = 'WhatsApp Conectado';
          }
          if (!profile.pictureUrl) {
            profile.pictureUrl = `/api/whatsapp/avatar?instance=${encodeURIComponent(data.instanceName || instance)}`;
          } else if (profile.pictureUrl.startsWith('http') && !profile.pictureUrl.includes('/api/whatsapp/avatar')) {
            profile.pictureUrl = `/api/whatsapp/avatar?url=${encodeURIComponent(profile.pictureUrl)}&instance=${encodeURIComponent(data.instanceName || instance)}`;
          }
        }

        const key = this.getProfileStorageKey();
        if (isConn && profile && typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify({ ...profile, isConnected: true }));
        } else if (!isConn && typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }

        return {
          isConnected: isConn,
          state: data.state || (isConn ? 'connected' : 'disconnected'),
          profile,
        };
      }
    } catch {}

    // Resilient fallback to cached profile in localStorage if network blips
    if (typeof window !== 'undefined') {
      try {
        const key = this.getProfileStorageKey();
        const saved = localStorage.getItem(key);
        if (saved) {
          const profile = JSON.parse(saved);
          return {
            isConnected: true,
            state: 'connected',
            profile,
          };
        }
      } catch {}
    }

    return {
      isConnected: false,
      state: 'disconnected',
      profile: null,
    };
  }

  async getRealGroups(instance: string = this.defaultInstance, forceRefresh: boolean = false): Promise<ClientGroup[]> {
    const key = this.getGroupsStorageKey();
    if (!this.isWhatsAppConnected()) {
      this.cachedGroups = [];
      if (typeof window !== 'undefined') localStorage.removeItem(key);
      return [];
    }
    try {
      const url = `/api/client/groups?instance=${safeEncodeURIComponent(instance)}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url, { headers: this.authHeaders() });
      const data = await res.json();
      if (data.isConnected === false) {
        this.cachedGroups = [];
        if (typeof window !== 'undefined') localStorage.removeItem(key);
        return [];
      }
      const groups = Array.isArray(data.groups) ? data.groups : [];
      this.cachedGroups = groups;
      if (typeof window !== 'undefined') {
        if (groups.length > 0) {
          localStorage.setItem(key, JSON.stringify(groups));
        } else {
          localStorage.removeItem(key);
        }
      }
      return groups;
    } catch {
      return this.getCachedGroups();
    }
  }

  async refreshGroupsNow(instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    return this.getRealGroups(instance, true);
  }

  private async syncGroupsInBackground(instance: string) {
    const now = Date.now();
    if (now - this.lastFetchTime < 10000) return;
    this.lastFetchTime = now;
    if (!this.isWhatsAppConnected()) return;
    try {
      const res = await fetch('/api/client/groups', { headers: this.authHeaders() });
      const data = await res.json();
      if (data.isConnected === false) {
        this.cachedGroups = [];
        const key = this.getGroupsStorageKey();
        if (typeof window !== 'undefined') localStorage.removeItem(key);
        return;
      }
      if (data.success && Array.isArray(data.groups)) {
        this.cachedGroups = data.groups;
        const key = this.getGroupsStorageKey();
        if (typeof window !== 'undefined') {
          if (data.groups.length > 0) {
            localStorage.setItem(key, JSON.stringify(data.groups));
          } else {
            localStorage.removeItem(key);
          }
        }
      }
    } catch {}
  }

  async getImportedGroups(instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    if (!this.isWhatsAppConnected()) return [];
    if (this.cachedGroups.length > 0) {
      return this.cachedGroups;
    }
    try {
      const res = await fetch(`/api/client/imported-groups?instance=${safeEncodeURIComponent(instance)}`, { headers: this.authHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
        this.cachedGroups = data.groups;
        const key = this.getGroupsStorageKey();
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(data.groups));
        }
        return data.groups;
      }
      return this.cachedGroups;
    } catch {
      return this.cachedGroups;
    }
  }

  async saveImportedGroups(groups: ClientGroup[], instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    this.cachedGroups = groups;
    const key = this.getGroupsStorageKey();
    if (typeof window !== 'undefined') {
      if (groups.length > 0) {
        localStorage.setItem(key, JSON.stringify(groups));
      } else {
        localStorage.removeItem(key);
      }
    }
    try {
      const res = await fetch('/api/client/imported-groups', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ groups }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        this.cachedGroups = data.groups;
        return data.groups;
      }
      return groups;
    } catch {
      return groups;
    }
  }

  async getCampaigns(): Promise<DivulgacaoCard[]> {
    try {
      const res = await fetch('/api/client/campaigns',{headers:this.authHeaders()});
      const data = await res.json();
      if (data.success && Array.isArray(data.campaigns)) {
        this.cachedCampaigns = data.campaigns;
        if (typeof window !== 'undefined') {
          localStorage.setItem('groply_cached_campaigns', JSON.stringify(data.campaigns));
        }
        return data.campaigns;
      }
      return this.cachedCampaigns;
    } catch {
      return this.cachedCampaigns;
    }
  }

  async createCampaign(campaign: Partial<DivulgacaoCard>): Promise<DivulgacaoCard | null> {
    try {
      const res = await fetch('/api/client/campaigns/create', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(campaign),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (res.status === 402 || data.error === 'PAYMENT_REQUIRED') {
          throw new Error('Sua assinatura não está ativa ou requer renovação de pagamento.');
        }
        if (res.status === 413) {
          throw new Error('A mídia anexada é muito grande. Escolha uma imagem ou vídeo menor.');
        }
        throw new Error(data.error || 'Não foi possível salvar a divulgação no banco de dados.');
      }
      if (data.campaign) {
        this.cachedCampaigns = [data.campaign, ...this.cachedCampaigns.filter((c) => c.id !== data.campaign.id)];
        return data.campaign;
      }
      return null;
    } catch (err: any) {
      console.error('[clientService] createCampaign error:', err);
      throw err;
    }
  }

  async toggleCampaign(id: string): Promise<boolean> {
    try {
      const res = await fetch('/api/client/campaigns/toggle', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async deleteCampaign(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/client/campaigns/${encodeURIComponent(id)}`, {
        method: 'DELETE', headers:this.authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        this.cachedCampaigns = this.cachedCampaigns.filter(c => c.id !== id);
      }
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async dispatchNow(payload: {
    campaignId?: string;
    customGroupJids?: string[];
    customMessage?: string;
    imageUrl?: string;
    instanceName?: string;
    intervalSeconds?: number;
  }): Promise<{ success: boolean; totalDispatched: number; successful: number; error?: string }> {
    try {
      const res = await fetch('/api/client/campaigns/send-now', {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...payload,
          instanceName: payload.instanceName || this.defaultInstance,
        }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, totalDispatched: 0, successful: 0, error: e.message };
    }
  }

  async getHistory(): Promise<ClientHistoryItem[]> {
    try {
      const res = await fetch('/api/client/history',{headers:this.authHeaders()});
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        return data.history;
      }
      return [];
    } catch {
      return [];
    }
  }

  async getDashboardStats(instance: string = this.defaultInstance): Promise<any> {
    try {
      const res = await fetch(`/api/client/stats?instance=${safeEncodeURIComponent(instance)}`,{headers:this.authHeaders()});
      const data = await res.json();
      if (data.success) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const clientService = new ClientService();
