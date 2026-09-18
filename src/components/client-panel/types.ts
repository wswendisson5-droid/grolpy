export type ClientTab =
  | 'inicio'
  | 'divulgacoes'
  | 'nova-divulgacao'
  | 'grupos'
  | 'agendamentos'
  | 'historico'
  | 'relatorios'
  | 'conexao'
  | 'configuracoes'
  | 'planos'
  | 'checkout';

export type AppPanelMode = 'landing' | 'admin' | 'client' | 'login' | 'register';

export interface AgendaItem {
  id: string;
  time: string;
  status: 'enviado' | 'enviando' | 'agendado' | 'falha' | 'parcial';
  statusLabel: string;
  campaignTitle: string;
  groupName: string;
  imageThumbnail?: string;
  imageTag?: string;
  previewText: string;
  scheduledDate?: string;
  sentCount?: number;
  totalCount?: number;
  intervalMinutes?: number;
  delaySeconds?: number;
}

export type CampaignStatus = 'ativa' | 'agendada' | 'pausada' | 'enviando' | 'concluida' | 'falha' | 'parcial';

export interface DivulgacaoCard {
  id: string;
  title: string;
  category: string;
  active: boolean;
  status?: CampaignStatus;
  scheduleDays: string;
  scheduleTime: string;
  scheduleTimes?: string[];
  scheduleDate?: string;
  scheduleDateText?: string;
  intervalText?: string;
  intervalMinutes?: number;
  delaySeconds?: number;
  executed?: boolean;
  startTimeWindow?: string;
  endTimeWindow?: string;
  dailyLimit?: string;
  scheduleMode?: 'agendar' | 'recorrente' | 'sequencia' | 'imediato';
  groupsCount: number;
  groupsMembersCount?: number;
  selectedGroupJids?: string[];
  totalSent: number;
  totalFailed?: number;
  totalTarget?: number;
  imageUrl?: string;
  mediaList?: Array<{ id: string; type: 'image' | 'video' | 'document'; url: string; name?: string }>;
  sendAsAlbum?: boolean;
  addCaptionToMedia?: boolean;
  previewText: string;
  mediaType?: 'imagem' | 'texto' | 'video' | 'documento';
  tags?: string[];
  createdAt?: string;
}

export interface ClientGroup {
  id: string;
  name: string;
  membersCount: number;
  category: string;
  subCategory?: string;
  status: 'ativo' | 'pausada' | 'sem_permissao' | 'ativo';
  lastPostTime?: string;
  lastActivity?: string;
  role?: 'meu_grupo' | 'participante' | 'admin';
  isFavorite?: boolean;
  totalPosts: number;
  avatarUrl?: string;
  jid?: string;
}

export interface ClientPlanUsage {
  planName: string;
  validUntil: string;
  usedMessages: number;
  totalMessages: number;
  percentage: number;
  pendingMessages: number;
  failedMessages: number;
}

export interface WhatsappConnectedProfile {
  name?: string;
  number?: string;
  pictureUrl?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  version?: string;
  state?: 'connected' | 'waiting_qr' | 'disconnected' | 'loading';
  isLoading?: boolean;
}
