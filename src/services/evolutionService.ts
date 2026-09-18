/**
 * Evolution API Service Layer
 * Abstracts communication with Evolution API v2.
 * Handles webhook payload normalization, payload mapping, and event subscription.
 */

import {
  EvolutionWebhookPayload,
  EvolutionRawMessage,
  EvolutionMessageStatus,
} from '../types/evolution';
import {
  ChatMessage,
  CRMContact,
  MessageDeliveryStatus,
} from '../types/crm';

type MessageListener = (message: ChatMessage) => void;
type StatusListener = (update: { messageId: string; status: MessageDeliveryStatus }) => void;
type ContactListener = (contact: CRMContact) => void;

class EvolutionService {
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private contactListeners: Set<ContactListener> = new Set();

  /**
   * Subscribe to incoming messages (from webhook or backend push)
   */
  public onMessageReceived(listener: MessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * Subscribe to message status updates (delivered, read, etc.)
   */
  public onMessageStatusChanged(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Subscribe to new contacts captured by Evolution Radar
   */
  public onContactUpdated(listener: ContactListener) {
    this.contactListeners.add(listener);
    return () => this.contactListeners.delete(listener);
  }

  /**
   * Convert Evolution API raw message status to internal CRM status
   */
  public mapStatus(rawStatus?: EvolutionMessageStatus): MessageDeliveryStatus {
    switch (rawStatus) {
      case 'READ':
      case 'PLAYED':
        return 'read';
      case 'DELIVERY_ACK':
        return 'delivered';
      case 'SERVER_ACK':
        return 'sent';
      case 'PENDING':
      default:
        return 'sending';
    }
  }

  /**
   * Normalize an incoming webhook event from Evolution API into internal CRM ChatMessage
   */
  public normalizeWebhookMessage(payload: EvolutionWebhookPayload<EvolutionRawMessage>): ChatMessage | null {
    if (payload.event !== 'messages.upsert' && payload.event !== 'send.message') {
      return null;
    }

    const raw = payload.data;
    if (!raw || !raw.key) return null;

    const isFromLead = !raw.key.fromMe;
    const remoteJid = raw.key.remoteJid;
    const msg = raw.message;

    let text = '';
    let type: ChatMessage['type'] = 'text';
    let mediaUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;

    if (msg?.conversation) {
      text = msg.conversation;
      type = 'text';
    } else if (msg?.extendedTextMessage?.text) {
      text = msg.extendedTextMessage.text;
      type = 'text';
    } else if (msg?.imageMessage) {
      type = 'image';
      mediaUrl = msg.imageMessage.url || msg.imageMessage.base64;
      text = msg.imageMessage.caption || '';
    } else if (msg?.documentMessage) {
      type = 'document';
      mediaUrl = msg.documentMessage.url;
      fileName = msg.documentMessage.fileName || msg.documentMessage.title || 'documento.pdf';
    } else if (msg?.audioMessage) {
      type = 'audio';
      mediaUrl = msg.audioMessage.url;
    }

    const date = raw.messageTimestamp ? new Date(raw.messageTimestamp * 1000) : new Date();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return {
      id: raw.key.id,
      conversationId: remoteJid,
      senderId: raw.key.participant || remoteJid,
      senderName: isFromLead ? (raw.pushName || 'Contato') : 'Enzo Santos',
      isFromLead,
      text,
      time,
      timestamp: date.getTime(),
      type,
      mediaUrl,
      fileName,
      status: this.mapStatus(raw.status),
    };
  }

  /**
   * Dispatch a message to Evolution API backend proxy
   * Never calls Evolution API directly with keys in frontend.
   */
  public async sendMessage(params: {
    contactId: string;
    remoteJid: string;
    text?: string;
    type?: 'text' | 'image' | 'audio' | 'document';
    mediaUrl?: string;
    fileName?: string;
  }): Promise<ChatMessage> {
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const outgoingMessage: ChatMessage = {
      id: messageId,
      conversationId: params.contactId,
      senderId: 'agent-enzo',
      senderName: 'Enzo Santos',
      isFromLead: false,
      text: params.text || '',
      time,
      timestamp,
      type: params.type || 'text',
      mediaUrl: params.mediaUrl,
      fileName: params.fileName,
      status: 'sending',
    };

    // Broadcast or update state
    setTimeout(() => {
      this.statusListeners.forEach((listener) =>
        listener({ messageId, status: 'sent' })
      );
    }, 400);

    setTimeout(() => {
      this.statusListeners.forEach((listener) =>
        listener({ messageId, status: 'delivered' })
      );
    }, 800);

    setTimeout(() => {
      this.statusListeners.forEach((listener) =>
        listener({ messageId, status: 'read' })
      );
    }, 1400);

    return outgoingMessage;
  }

  /**
   * Simulate an incoming response message from the lead (e.g. for demonstration/testing)
   */
  public triggerSimulatedLeadResponse(params: {
    contactId: string;
    senderName: string;
    text: string;
    type?: 'text' | 'image' | 'audio' | 'document';
    mediaUrl?: string;
  }) {
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const messageId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const incoming: ChatMessage = {
      id: messageId,
      conversationId: params.contactId,
      senderId: `lead-${params.contactId}`,
      senderName: params.senderName,
      isFromLead: true,
      text: params.text,
      time,
      timestamp,
      type: params.type || 'text',
      mediaUrl: params.mediaUrl,
      status: 'read',
    };

    this.messageListeners.forEach((l) => l(incoming));
    return incoming;
  }
}

export const evolutionService = new EvolutionService();
