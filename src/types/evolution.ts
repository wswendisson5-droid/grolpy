/**
 * Evolution API Type Definitions & Webhook Contracts
 * Designed strictly for Evolution API v2 (WhatsApp Baileys / Cloud Engine)
 */

export type EvolutionConnectionState = 'open' | 'close' | 'connecting' | 'refused';

export type EvolutionMessageStatus = 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED';

export type EvolutionMessageType =
  | 'conversation'
  | 'extendedTextMessage'
  | 'imageMessage'
  | 'audioMessage'
  | 'documentMessage'
  | 'videoMessage'
  | 'stickerMessage'
  | 'contactMessage'
  | 'locationMessage';

export interface EvolutionKey {
  remoteJid: string; // e.g. 5527998765432@s.whatsapp.net or 120363023456789@g.us
  fromMe: boolean;
  id: string; // WhatsApp unique message ID
  participant?: string; // in groups: individual participant JID
}

export interface EvolutionMediaContent {
  url?: string;
  mimetype?: string;
  title?: string;
  fileName?: string;
  fileLength?: number | string;
  seconds?: number; // audio duration
  caption?: string;
  base64?: string;
}

export interface EvolutionRawMessage {
  key: EvolutionKey;
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
      matchedText?: string;
    };
    imageMessage?: EvolutionMediaContent;
    audioMessage?: EvolutionMediaContent;
    documentMessage?: EvolutionMediaContent;
  };
  messageType?: EvolutionMessageType;
  messageTimestamp?: number;
  status?: EvolutionMessageStatus;
}

export interface EvolutionWebhookPayload<T = any> {
  event: 'messages.upsert' | 'messages.update' | 'send.message' | 'connection.update' | 'contacts.upsert' | 'chats.upsert';
  instance: string;
  data: T;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

export interface EvolutionSendMessageRequest {
  number: string; // destination phone with DDI (e.g. "5527998765432")
  text?: string;
  media?: string; // URL or base64
  mediatype?: 'image' | 'document' | 'audio' | 'video';
  mimetype?: string;
  caption?: string;
  fileName?: string;
  delay?: number;
  quoted?: {
    key: EvolutionKey;
    message?: Record<string, any>;
  };
}

export interface EvolutionSendResponse {
  key: EvolutionKey;
  message: Record<string, any>;
  messageTimestamp: string | number;
  status: EvolutionMessageStatus;
}
