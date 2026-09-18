/**
 * CRM Domain Types
 * Matches the complete high-fidelity schema seen in Reference Images 1 & 2
 */

export type CRMStage =
  | 'novo'
  | 'em_atendimento'
  | 'proposta_enviada'
  | 'concluido'
  | 'descartado';

export interface CRMAssignee {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  email?: string;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhone?: string;
  senderParticipant?: string;
  isGroup?: boolean;
  isFromLead: boolean;
  text?: string;
  time: string;
  timestamp: number;
  type: 'text' | 'image' | 'audio' | 'video' | 'sticker' | 'document';
  mediaUrl?: string;
  mimetype?: string;
  caption?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  duration?: number;
  status: MessageDeliveryStatus;
}

export interface CRMNote {
  id: string;
  contactId: string;
  author: CRMAssignee;
  createdAt: string; // e.g. "hoje às 14:40", "ontem às 17:21"
  timestamp: number;
  content: string;
}

export type TaskPriority = 'Alta' | 'Média' | 'Baixa';

export interface CRMTask {
  id: string;
  contactId: string;
  title: string;
  dueDate: string; // e.g. "Hoje às 15:00", "Amanhã às 10:00", "12/09/2026 às 14:00"
  timestamp: number;
  assignedTo: CRMAssignee;
  priority: TaskPriority;
  completed: boolean;
  completedAt?: string;
}

export type HistoryEventType =
  | 'radar_message'
  | 'opportunity_detected'
  | 'assigned'
  | 'first_contact'
  | 'client_reply'
  | 'document_sent'
  | 'note_added'
  | 'task_created'
  | 'stage_changed';

export interface CRMHistoryEvent {
  id: string;
  contactId: string;
  title: string;
  subtitle?: string;
  timestamp: string; // e.g. "12/09/2026 14:29"
  type: HistoryEventType;
  metadata?: Record<string, any>;
}

export interface CRMContact {
  id: string;
  remoteJid: string; // WhatsApp Remote JID
  name: string; // e.g. "Bella Joias"
  subtitle: string; // e.g. "Semijoias"
  avatar: string;
  phone: string; // e.g. "+55 27 99876-5432"
  location: string; // e.g. "Vitória - ES"
  segment: string; // e.g. "Semijoias"
  typeCategory: string; // e.g. "Venda de produtos"
  tags: string[]; // ["Produto", "Venda de produtos"]
  score: number; // e.g. 92
  status: CRMStage;
  statusLabel: string; // "Em atendimento"
  assignedTo: CRMAssignee;
  originGroup: {
    id: string;
    name: string; // "Empreendedores ES"
  };
  detectedAt: string; // "12/09/2026 às 14:32"
  originalMessage: {
    text: string;
    time: string;
  };
  identificationReasons: string[]; // ["Oferece produtos próprios", "Menciona preços e ofertas", ...]
  isFavorite: boolean;
  unreadCount: number;
  lastMessageTime: string; // "14:32", "14:20", "Ontem"
  lastMessageSnippet: string;
  isOnline: boolean;
  isGroup?: boolean;
  notes: CRMNote[];
  tasks: CRMTask[];
  history: CRMHistoryEvent[];
}

export type CRMMainViewMode = 'conversas' | 'pipeline';
export type CRMInboxFilter = 'todos' | 'conversas' | 'grupos' | 'nao_lidos';
export type CRMDetailTab = 'detalhes' | 'notas' | 'tarefas' | 'historico';
