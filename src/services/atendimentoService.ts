export interface AIAgentConfig {
  enabled: boolean;
  mode: 'auto' | 'copilot';
  agentName: string;
  companyName: string;
  companyPitch: string;
  step1GreetingTemplate: string;
  step2ContextTemplate: string;
  step3PitchTemplate: string;
  initialTemplate?: string;
  followUp1Hours: number;
  followUp1Template: string;
  followUp2Days: number;
  followUp2Template: string;
  operatingHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  triggerKeywordsHuman: string[];
  saveMemories?: boolean;
}

export interface AIRuntimeInfo {
  provider: 'openai' | 'gemini';
  configured: boolean;
  model: string;
}

export interface InternalNote {
  id: string;
  timestamp: number;
  timeFormatted: string;
  author: string;
  text: string;
  type: 'ai' | 'human' | 'system' | 'followup';
}

export interface CRMLeadStoredMessage {
  id: string;
  sender: 'lead' | 'agent' | 'system';
  content: string;
  timestamp: string;
  epoch?: number;
  status?: string;
  channel?: string;
}

export interface CRMAtendimentoLead {
  id: string;
  opportunityId: string;
  contactJid: string;
  contactPhone: string;
  contactName: string;
  contactAvatar?: string;
  groupName: string;
  groupJid: string;
  originalMessage: string;
  demandSummary: string;
  recommendedService: string;
  score: number;
  urgency: string;
  status: 'aberto' | 'ia_em_atendimento' | 'humano_assumiu' | 'respondido_cliente' | 'convertido' | 'descartado';
  aiActiveForContact: boolean;
  conversationStep?: 'greeting_sent' | 'context_sent' | 'pitch_sent' | 'in_dialogue' | 'human_control';
  assignedTo?: string;
  createdAt: number;
  lastInteractionAt: number;
  firstMessageSentAt?: number;
  followUp1SentAt?: number;
  followUp2SentAt?: number;
  clientReplied: boolean;
  collectedInfo?: Record<string, string>;
  notes: InternalNote[];
  messages?: CRMLeadStoredMessage[];
}

export interface TokenMetrics {
  totalInspected: number;
  rejectedSocial: number;
  rejectedSpam: number;
  rejectedTooShort: number;
  rejectedNoCommercial: number;
  totalTokensSaved: number;
  acceptedCandidates: number;
  totalAiCalls: number;
}

export const atendimentoService = {
  async getLeads(): Promise<CRMAtendimentoLead[]> {
    try {
      const res = await fetch('/api/atendimento/leads');
      if (!res.ok) throw new Error('Falha ao buscar atendimentos');
      const data = await res.json();
      return data.leads || [];
    } catch (err) {
      console.error('[atendimentoService] getLeads error:', err);
      return [];
    }
  },

  async getLead(id: string): Promise<CRMAtendimentoLead | null> {
    try {
      const res = await fetch(`/api/atendimento/lead/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.lead || null;
    } catch {
      return null;
    }
  },

  async assumeLead(leadId: string, userName: string = 'Enzo Santos'): Promise<CRMAtendimentoLead | null> {
    try {
      const res = await fetch('/api/atendimento/assume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, userName }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.lead;
    } catch {
      return null;
    }
  },

  async toggleAi(leadId: string, active: boolean, userName: string = 'Enzo Santos'): Promise<CRMAtendimentoLead | null> {
    try {
      const res = await fetch('/api/atendimento/toggle-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, active, userName }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.lead;
    } catch {
      return null;
    }
  },

  async forceConversation(leadId: string): Promise<{ lead: CRMAtendimentoLead; message: string }> {
    const res = await fetch('/api/atendimento/force-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao retomar conversa com IA');
    return { lead: data.lead, message: data.message };
  },

  async updateStatus(leadId: string, status: string, userName: string = 'Enzo Santos'): Promise<CRMAtendimentoLead | null> {
    try {
      const res = await fetch('/api/atendimento/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status, userName }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.lead;
    } catch {
      return null;
    }
  },

  async getConfig(): Promise<{ config: AIAgentConfig; ai: AIRuntimeInfo } | null> {
    try {
      const res = await fetch('/api/atendimento/config');
      if (!res.ok) return null;
      const data = await res.json();
      return { config: data.config, ai: data.ai };
    } catch {
      return null;
    }
  },

  async updateConfig(newConfig: Partial<AIAgentConfig>): Promise<{ config: AIAgentConfig; ai: AIRuntimeInfo } | null> {
    try {
      const res = await fetch('/api/atendimento/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao salvar configuração');
      }
      const data = await res.json();
      return { config: data.config, ai: data.ai };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Falha ao salvar configuração');
    }
  },

  async getTokenMetrics(): Promise<TokenMetrics | null> {
    try {
      const res = await fetch('/api/radar/token-metrics');
      if (!res.ok) return null;
      const data = await res.json();
      return data.metrics;
    } catch {
      return null;
    }
  },
};
