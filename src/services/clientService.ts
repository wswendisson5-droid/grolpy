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
  status: 'delivered' | 'sent' | 'failed' | 'pending';
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
  private cachedProfile: any = null;
  private lastFetchTime: number = 0;

  constructor() {
    // Groups are loaded per-user dynamically once authenticated
  }

  getDefaultInstance(): string { return this.defaultInstance; }
  private authHeaders(extra:Record<string,string>={}) { return extra; }
  getGroupsStorageKey(): string { return ''; }
  getCachedGroups(): ClientGroup[] { return this.cachedGroups; }
  getProfileStorageKey(): string { return ''; }
  isWhatsAppConnected(): boolean { return Boolean(this.cachedProfile?.isConnected); }
  getCachedProfile(): any { return this.cachedProfile; }

  async getWhatsAppStatus(instance: string = this.defaultInstance): Promise<any> {
    const res = await fetch('/api/client/whatsapp/status', { headers: this.authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível consultar o WhatsApp.');
    if (data.instanceName) this.defaultInstance = data.instanceName;
    const isConnected = Boolean(data.isConnected);
    const profile = data.profile || data.connectedProfile || null;
    this.cachedProfile = profile ? { ...profile, isConnected } : { isConnected };
    return { isConnected, state: data.state || (isConnected ? 'connected' : 'disconnected'), profile };
  }

  async getRealGroups(instance: string = this.defaultInstance, forceRefresh: boolean = false): Promise<ClientGroup[]> {
    const url = `/api/client/groups?instance=${safeEncodeURIComponent(instance)}${forceRefresh ? '&refresh=true' : ''}`;
    const res = await fetch(url, { headers: this.authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os grupos do WhatsApp.');
    if (data.isConnected === false) { this.cachedGroups = []; return []; }
    const rawGroups = Array.isArray(data.groups) ? data.groups : [];
    const groups = rawGroups.filter((g: any) => {
      const jid = String(g.jid || g.id || '');
      return jid.includes('@g.us') && !jid.includes('@broadcast') && !jid.includes('@newsletter');
    });
    this.cachedGroups = groups;
    return groups;
  }

  async refreshGroupsNow(instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    return this.getRealGroups(instance, true);
  }

  private async syncGroupsInBackground(instance: string) {
    const now = Date.now(); if (now - this.lastFetchTime < 10000) return; this.lastFetchTime = now;
    try { await this.getRealGroups(instance, false); } catch (err) { console.error('[clientService] group sync:', err); }
  }

  async getImportedGroups(instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    const res = await fetch(`/api/client/imported-groups?instance=${safeEncodeURIComponent(instance)}`, { headers: this.authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os grupos importados.');
    this.cachedGroups = Array.isArray(data.groups) ? data.groups : [];
    return this.cachedGroups;
  }

  async saveImportedGroups(groups: ClientGroup[], instance: string = this.defaultInstance): Promise<ClientGroup[]> {
    const res = await fetch('/api/client/imported-groups', {
      method: 'POST', headers: this.authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ groups, instance })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível salvar os grupos no banco de dados.');
    this.cachedGroups = Array.isArray(data.groups) ? data.groups : groups;
    return this.cachedGroups;
  }

  async getCampaigns(): Promise<DivulgacaoCard[]> {
    const res = await fetch('/api/client/campaigns',{headers:this.authHeaders()});
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível carregar as divulgações.');
    this.cachedCampaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    return this.cachedCampaigns;
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
          throw new Error('Sua assinatura nÃ£o estÃ¡ ativa ou requer renovaÃ§Ã£o de pagamento.');
        }
        if (res.status === 413) {
          throw new Error('A mÃ­dia anexada Ã© muito grande. Escolha uma imagem ou vÃ­deo menor.');
        }
        throw new Error(data.error || 'NÃ£o foi possÃ­vel salvar a divulgaÃ§Ã£o no banco de dados.');
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

  async updateCampaign(id: string, campaign: Partial<DivulgacaoCard>): Promise<DivulgacaoCard> {
    const res = await fetch(`/api/client/campaigns/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(campaign),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.campaign) {
      throw new Error(data.error || 'Não foi possível atualizar a divulgação.');
    }
    this.cachedCampaigns = [
      data.campaign,
      ...this.cachedCampaigns.filter((c) => c.id !== id),
    ];
    return data.campaign;
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
