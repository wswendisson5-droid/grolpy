import { CRMContact, ChatMessage, CRMAssignee } from '../types/crm';
import { safeEncodeURIComponent } from '../utils/safeUri';

const DEFAULT_ASSIGNEE: CRMAssignee = {
  id: 'wendisson-01',
  name: 'Wendisson',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  role: 'Closer Sênior',
  email: 'wendisson@nexus.crm',
};

class CRMService {
  /**
   * Fetch real conversations & contacts from Evolution API via backend
   */
  async getContacts(instanceName?: string): Promise<{
    success: boolean;
    instanceName: string;
    contacts: CRMContact[];
    error?: string;
  }> {
    try {
      const url = instanceName
        ? `/api/crm/conversations?instance=${safeEncodeURIComponent(instanceName)}`
        : '/api/crm/conversations';
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          instanceName: data.instanceName || 'minhabagg-store-209',
          contacts: [],
          error: data.error || 'Falha ao buscar contatos do WhatsApp',
        };
      }

      const contacts: CRMContact[] = (data.conversations || []).map((c: any, index: number) => {
        const contact = c.contact;
        const jid = c.id;
        const isGroup = contact.isGroup || jid.includes('@g.us');

        const stageMap: Record<string, any> = {
          lead: 'novo', novo: 'novo',
          qualificacao: 'em_atendimento', em_atendimento: 'em_atendimento',
          interessado: 'interessado',
          proposta: 'proposta_enviada', negociacao: 'proposta_enviada', proposta_enviada: 'proposta_enviada',
          follow_up: 'follow_up',
          assinatura_concluida: 'assinatura_concluida', fechado: 'assinatura_concluida', concluido: 'assinatura_concluida',
          sem_retorno: 'sem_retorno', cancelado: 'cancelado', descartado: 'descartado',
        };

        const status = stageMap[contact.stage] || 'em_atendimento';
        const statusLabelMap: Record<string, string> = {
          novo: 'Novo contato', em_atendimento: 'Em atendimento', interessado: 'Interessado',
          proposta_enviada: 'Planos enviados', follow_up: 'Follow-up',
          assinatura_concluida: 'Assinatura concluída', concluido: 'Concluído',
          sem_retorno: 'Sem retorno', cancelado: 'Cancelado', descartado: 'Descartado',
        };

        return {
          id: jid,
          remoteJid: jid,
          name: contact.name || (isGroup ? 'Grupo WhatsApp' : 'Contato WhatsApp'),
          subtitle: isGroup ? 'Grupo de WhatsApp' : (contact.phone || 'Contato direto'),
          avatar: contact.avatar || '',
          phone: contact.phone || (isGroup ? 'Grupo WhatsApp' : ''),
          location: 'Vitória - ES',
          segment: isGroup ? 'Comunidade WhatsApp' : 'Comércio / Vendas',
          typeCategory: isGroup ? 'Grupo WhatsApp' : 'Prospecção Ativa',
          tags: contact.tags || ['WhatsApp', 'Evolution API'],
          score: 85 + (index % 14),
          status,
          statusLabel: statusLabelMap[status] || 'Em atendimento',
          assignedTo: DEFAULT_ASSIGNEE,
          originGroup: {
            id: 'grp-evolution',
            name: isGroup ? contact.name : 'WhatsApp Evolution API',
          },
          detectedAt: contact.lastContactDate || 'Hoje',
          originalMessage: {
            text: c.lastMessage?.content || 'Mensagem sincronizada',
            time: c.lastMessage?.timestamp || 'Hoje',
          },
          identificationReasons: [
            'Contato direto sincronizado via Evolution API',
            'Histórico de mensagens ativo no WhatsApp',
          ],
          isFavorite: index === 0,
          unreadCount: c.lastMessage?.unreadCount || 0,
          lastMessageTime: c.lastMessage?.timestamp || 'Hoje',
          lastMessageSnippet: c.lastMessage?.content || 'Mensagem do WhatsApp',
          isOnline: contact.status === 'online',
          isGroup,
          notes: [
            {
              id: `note-${jid}-1`,
              contactId: jid,
              author: DEFAULT_ASSIGNEE,
              createdAt: 'Hoje',
              timestamp: Date.now(),
              content: 'Lead sincronizado com a Evolution API em tempo real.',
            },
          ],
          tasks: [
            {
              id: `task-${jid}-1`,
              contactId: jid,
              title: 'Responder pelo WhatsApp no CRM',
              dueDate: 'Hoje',
              timestamp: Date.now() + 3600000,
              assignedTo: DEFAULT_ASSIGNEE,
              priority: 'Média',
              completed: false,
            },
          ],
          history: [
            {
              id: `hist-${jid}-1`,
              contactId: jid,
              title: 'Mensagem recebida no WhatsApp',
              subtitle: c.lastMessage?.content,
              timestamp: c.lastMessage?.timestamp || 'Hoje',
              type: 'client_reply',
            },
          ],
        };
      });

      return {
        success: true,
        instanceName: data.instanceName,
        contacts,
      };
    } catch (err: any) {
      return {
        success: false,
        instanceName: 'nexus-crm-01',
        contacts: [],
        error: err.message,
      };
    }
  }

  /**
   * Fetch real chat messages for a specific contact/jid from Evolution API
   */
  async getMessages(jid: string, instanceName?: string): Promise<{
    success: boolean;
    messages: ChatMessage[];
    error?: string;
  }> {
    try {
      const params = new URLSearchParams({ jid });
      if (instanceName) params.set('instance', instanceName);

      const res = await fetch(`/api/crm/messages?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          messages: [],
          error: data.error || 'Falha ao buscar mensagens',
        };
      }

      const seenIds = new Set<string>();
      const messages: ChatMessage[] = [];
      const isGrp = jid.includes('@g.us');

      for (const m of data.messages || []) {
        if (!m.id || seenIds.has(m.id)) continue;
        seenIds.add(m.id);

        messages.push({
          id: m.id,
          conversationId: jid,
          senderId: m.sender === 'agent' ? 'me' : m.participant || jid,
          senderName: m.senderName || (m.sender === 'agent' ? 'Você' : 'Contato'),
          senderPhone: m.senderPhone,
          senderParticipant: m.participant,
          isGroup: isGrp,
          isFromLead: m.sender !== 'agent',
          text: m.content,
          time: m.timestamp || 'Hoje',
          timestamp: Date.now(),
          type: m.type || 'text',
          mediaUrl: m.mediaUrl,
          mimetype: m.mimetype,
          caption: m.caption,
          fileName: m.fileName,
          duration: m.duration,
          status: m.status || 'read',
        });
      }

      return {
        success: true,
        messages,
      };
    } catch (err: any) {
      return {
        success: false,
        messages: [],
        error: err.message,
      };
    }
  }

  /**
   * Send a REAL WhatsApp message via Evolution API
   */
  async sendMessage(jid: string, text: string, instanceName?: string): Promise<{
    success: boolean;
    message?: ChatMessage;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/crm/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName,
          jid,
          text,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao enviar mensagem pelo WhatsApp',
        };
      }

      const msg = data.message;
      return {
        success: true,
        message: {
          id: msg?.id || `sent_${Date.now()}`,
          conversationId: jid,
          senderId: 'me',
          senderName: 'Você',
          isFromLead: false,
          text,
          time: msg?.timestamp || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          type: 'text',
          status: 'sent',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Update CRM pipeline stage for a contact/conversation
   */
  async updateContactStage(contactId: string, stage: string): Promise<boolean> {
    try {
      const res = await fetch('/api/crm/contact-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, stage }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const crmService = new CRMService();
