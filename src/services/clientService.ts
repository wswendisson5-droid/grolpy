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
    // Dados de cliente nunca são restaurados de cache global.
    // Cada sessão começa vazia e o backend autenticado decide o que pertence ao usuário.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('groply_cached_groups');
      localStorage.removeItem('groply_cached_campaigns');
      localStorage.removeItem('groply_whatsapp_profile');
    }
  }

  getDefaultInstance(): string { return this.defaultInstance; }
  private authHeaders(extra:Record<string,string>={}) { const token=typeof window!=='undefined'?localStorage.getItem('groply_token')||'':''; return {...extra,...(token?{Authorization:`Bearer ${token}`}:{})}; }

  getCachedGroups(): ClientGroup[] {
    return this.cachedGroups;
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
      const data = await res.json();
      
      const isConn = data.state === 'connected' || data.state === 'open' || data.status === 'CONNECTED';
      const profile = isConn
        ? (data.connectedProfile || {
            name: 'WhatsApp Conectado',
            instanceName: data.instanceName || instance,
          })
        : (data.connectedProfile?.pictureUrl ? data.connectedProfile : null);

      return {
        isConnected: isConn,
        state: data.state || 'disconnected',
        profile,
      };
    } catch {}

    return {
      isConnected: false,
      state: 'disconnected',
      profile: null,
    };
  }

  async getRealGroups(instance: string = this.defaultInstance, forceRefresh: boolean = false): Promise<ClientGroup[]> {
    try {
      const url = `/api/client/groups?instance=${safeEncodeURIComponent(instance)}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url,{headers:this.authHeaders()});
      const data = await res.json();
      if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
        this.cachedGroups = data.groups;
        if (typeof window !== 'undefined') {
          localStorage.setItem('groply_cached_groups', JSON.stringify(data.groups));
        }
        return data.groups;
      }
      this.cachedGroups = [];
      return [];
    } catch {
      this.cachedGroups = [];
      return [];
    }
  }

  async refreshGroupsNow(instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    return this.getRealGroups(instance, true);
  }

  private async syncGroupsInBackground(instance: string) {
    const now = Date.now();
    if (now - this.lastFetchTime < 10000) return;
    this.lastFetchTime = now;
    try {
      const res = await fetch('/api/client/groups',{headers:this.authHeaders()});
      const data = await res.json();
      if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
        this.cachedGroups = data.groups;
        if (typeof window !== 'undefined') {
          localStorage.setItem('groply_cached_groups', JSON.stringify(data.groups));
        }
      }
    } catch {}
  }

  async getImportedGroups(instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    if (this.cachedGroups.length > 0) {
      return this.cachedGroups;
    }
    try {
      const res = await fetch(`/api/client/imported-groups?instance=${safeEncodeURIComponent(instance)}`,{headers:this.authHeaders()});
      const data = await res.json();
      if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
        this.cachedGroups = data.groups;
        if (typeof window !== 'undefined') {
          localStorage.setItem('groply_cached_groups', JSON.stringify(data.groups));
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('groply_cached_groups', JSON.stringify(groups));
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
      const data = await res.json();
      if (data.success && data.campaign) {
        this.cachedCampaigns = [data.campaign, ...this.cachedCampaigns];
        return data.campaign;
      }
      return null;
    } catch {
      return null;
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
        headers: { 'Content-Type': 'application/json' },
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
