export type RadarStatus = 'active' | 'paused' | 'analyzing';

export type OpportunityCategory = 'Moda' | 'Beleza' | 'Alimentos' | 'Serviços' | 'Casa' | 'Lojas' | 'Produtos';

export type OpportunityStatus = 'new' | 'analyzing' | 'converted' | 'dismissed';

export type OpportunityStage = 'minhas' | 'nao_atribuidas' | 'em_atendimento' | 'concluidas' | 'descartadas';

export interface OpportunityHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  author: string;
  type: 'ai' | 'user' | 'system';
}

export interface OpportunityMessageItem {
  id: string;
  sender: string;
  text: string;
  time: string;
  isFromLead: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  segment: string;
  score: number;
  avatar: string;
  image?: string;
  hasAttachedImage?: boolean;
  groupName: string;
  timestamp: string;
  relativeTime: string;
  // Relative coordinates inside the radar (in percent 0-100 from center or polar)
  radarCoords: {
    x: number; // 0 to 100 percentage
    y: number; // 0 to 100 percentage
    isMainHighlight?: boolean;
    displayTag?: string; // e.g. "Moda 92", "Beleza 78"
    tagPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-right' | 'bottom-right';
  };
  contactName: string;
  phone: string;
  location?: string;
  messageOriginal: string;
  detectionReason: string;
  assignedTo?: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  stage: OpportunityStage;
  aiAnalysis: {
    intent: string;
    budget: string;
    urgency: 'Alta' | 'Média' | 'Baixa';
    keyKeywords: string[];
    sentiment: 'Muito Positivo' | 'Positivo' | 'Neutro';
  };
  messagesThread?: OpportunityMessageItem[];
  history?: OpportunityHistoryItem[];
  status: OpportunityStatus;
}

export interface MonitoredGroup {
  id: string;
  name: string;
  messageCount: number;
  avatar: string;
  status: 'active' | 'paused';
  participantsCount?: number;
  lastMessageTime?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'opportunity_detected' | 'message_analyzed' | 'contact_dismissed';
  title: string;
  subtitle: string;
  time: string;
  targetOpportunityId?: string;
  badgeColor?: 'green' | 'gray' | 'red';
}

export interface MetricCardData {
  id: string;
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'neutral' | 'negative';
  iconType: 'sparkle' | 'chat' | 'analysis' | 'timer';
}

export interface CurrentScanState {
  groupJid: string;
  groupName: string;
  groupAvatar?: string;
  groupIndex: number;
  totalGroups: number;
  status: 'scanning' | 'analyzing' | 'opportunity_found' | 'completed_no_lead' | 'idle';
  statusMessage: string;
  analyzedInCurrentGroup: number;
  lastScanTimestamp: number;
  foundOpportunitySummary?: string;
}
