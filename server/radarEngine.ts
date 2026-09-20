import { GoogleGenAI, Type } from '@google/genai';
import { atendimentoEngine } from './atendimentoEngine';
import { arePhonesEquivalent, cleanPhoneDigits } from './phoneUtils';
import { createOpenAIStructuredResponse, getAiRuntimeInfo } from './openaiClient';
import {
  extractWhatsAppMessageText,
  getWhatsAppMessageTimestamp,
  maskWhatsAppSender,
  resolveWhatsAppGroupSender,
  unwrapWhatsAppMessage,
} from './whatsappMessageUtils';

export function safeUnicodeTruncate(text: string, maxChars: number): string {
  if (!text) return '';
  const wellFormed =
    typeof (text as any).toWellFormed === 'function'
      ? (text as any).toWellFormed()
      : text.replace(
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
          ''
        );
  const chars = Array.from(wellFormed);
  if (chars.length <= maxChars) return chars.join('');
  return chars.slice(0, Math.max(0, maxChars - 3)).join('') + '...';
}

// Types for Radar Engine
export interface MonitoredGroupData {
  id: string;
  jid: string;
  name: string;
  avatar: string;
  messageCount: number;
  participantsCount?: number;
  status: 'active' | 'inactive';
  isMonitored: boolean;
  lastMessageTime?: string;
}

export interface CandidateMessage {
  id: string;
  groupJid: string;
  groupName: string;
  senderJid: string;
  senderPhone: string;
  senderName: string;
  senderAvatar?: string;
  messageId: string;
  messageText: string;
  attachedImageUrl?: string;
  hasAttachedImage?: boolean;
  timestamp: number;
  addedAt: number;
  heuristicScore: number;
  detectedKeywords: string[];
}

export interface RadarAIEvaluation {
  isOpportunity: boolean;
  confidence: number;
  segment: string;
  businessType: string;
  recommendedService: string;
  reason: string;
  signals: string[];
  intent?: string;
  budget?: string;
  urgency?: string;
  sentiment?: 'positive' | 'neutral' | 'urgent';
}

export interface RadarOpportunity {
  id: string;
  title: string;
  segment: string;
  category: string;
  confidenceScore: number;
  score: number;
  contactName: string;
  phone: string;
  remoteJid: string;
  groupJid: string;
  groupName: string;
  messageOriginal: string;
  timestamp: string;
  relativeTime: string;
  createdAt: number;
  avatar: string;
  image?: string;
  hasAttachedImage?: boolean;
  radarCoords: { x: number; y: number };
  status: 'new' | 'analyzing' | 'converted' | 'dismissed';
  stage: 'minhas' | 'nao_atribuidas' | 'em_atendimento' | 'concluidas' | 'descartadas';
  assignedTo: { id: string; name: string; avatar: string } | null;
  aiAnalysis: {
    intent: string;
    budget: string;
    urgency: string;
    sentiment: 'positive' | 'neutral' | 'urgent';
    keyKeywords: string[];
    recommendedAction: string;
    recommendedService: string;
    reason: string;
    signals: string[];
  };
  history: Array<{
    id: string;
    timestamp: string;
    action: string;
    author: string;
    type: 'ai' | 'user' | 'system';
  }>;
}

export interface RadarActivity {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  type: 'radar_active' | 'group_message' | 'lead_identified' | 'lead_assigned' | 'crm_transferred' | 'system';
  time: string;
  opportunityId?: string;
}

/**
 * 1. STRICT DISQUALIFICATION PATTERNS
 * O Radar Nxs NÃO deve considerar como boa oportunidade:
 * - Revenda/divulgação de grandes empresas (Vivo, Claro, Tim, Oi, operadoras)
 * - Maquininhas de cartão (Ton, PagSeguro, Cielo, Mercado Pago, etc.) e taxas
 * - Links de afiliados, esquemas de renda extra, roleta, cassinos, pirâmides
 * - Fretes informais, carretos de mudança sem estrutura comercial
 * - Revenda de cosméticos por catálogo (Avon, Natura, Boticário, etc.)
 * - Desapegos pessoais de itens usados de pessoas físicas
 * - Conteúdo genérico sem negócio próprio real
 */
export const DISQUALIFIED_PATTERNS = [
  // Telecom / Grandes operadoras
  'vivo fibra',
  'claro fibra',
  'tim live',
  'tim ultra',
  'planos da claro',
  'planos da vivo',
  'plano claro',
  'plano vivo',
  'instalador vivo',
  'instalador claro',
  'revendedor vivo',
  'revendedor claro',
  'revenda vivo',
  'revenda claro',
  'chip da vivo',
  'chip da claro',
  'portabilidade vivo',
  'portabilidade claro',

  // Maquininhas de cartão & taxas
  'maquininha ton',
  'taxas da maquininha',
  'máquina ton',
  'maquina ton',
  'point mini',

  // Afiliados, renda extra, jogos de aposta
  'link de afiliado',
  'ganhe dinheiro rápido',
  'ganhe dinheiro facil',
  'renda extra',
  'trabalhe em casa',
  'trabalhe de casa',
  'renda passiva',
  'roleta',
  'tigrinho',
  'bet365',
  'cassino',
  'jogos de aposta',
  'plataforma pagando',
  'urubu do pix',

  // Desapegos pessoais pontuais de usados de pessoas físicas
  'vendo sofá usado',
  'vendo sofa usado',
  'vendo guarda roupa usado',
  'vendo guarda-roupa usado',
  'desapego de móveis usados',
  'desapego de moveis usados',

];

// Token-Saver Filter: pure greetings, trivial social banter, stickers & stickers reactions
const SOCIAL_BANTER_TERMS = [
  'bom dia',
  'boa tarde',
  'boa noite',
  'bom descanso',
  'boa semana',
  'bom fds',
  'bom final de semana',
  'ola a todos',
  'olá a todos',
  'oi pessoal',
  'oi gente',
  'valeu',
  'obrigado',
  'obrigada',
  'obg',
  'show',
  'show de bola',
  'blz',
  'beleza',
  'amém',
  'amen',
  'deus abençoe',
  'parabens',
  'parabéns',
  'kkk',
  'haha',
  'rsrs',
  'top demais',
  'tchau',
  'ate mais',
  'até mais',
  'boa sorte',
];

/**
 * 2. COMMERCIAL INTENT & QUALIFIED PATTERNS (Nxs Radar - Divulgação Automática em Grupos)
 * Detecta qualquer divulgação manual de produtos, serviços, comércio ou negócio em grupos de WhatsApp:
 * - Preço, valores, parcelamento, taxa, tabela
 * - Orçamento, sem compromisso, faça seu orçamento
 * - Promoção, desconto, oferta, combo, pronta entrega, novidades
 * - Produtos, serviços, consertos, instalação, manutenção, estética, unhas, bolos, doces, marmitas, roupas, etc.
 * - Agenda, agendamentos, horários disponíveis, vagas
 * - Encomendas, aceito encomendas, pedidos abertos
 * - WhatsApp, contato, link, direct, pv, chame no pv, pix
 * - Chamada para compra: compre já, encomende, peça já, garanta
 */
const COMMERCIAL_INTENT_PATTERNS = [
  // Sinais de Preço / Valores / Orçamento
  { term: 'r$', weight: 35 },
  { term: 'reais', weight: 25 },
  { term: 'orçamento', weight: 30 },
  { term: 'orcamento', weight: 30 },
  { term: 'sem compromisso', weight: 25 },
  { term: 'solicite seu orçamento', weight: 30 },
  { term: 'faça seu orçamento', weight: 30 },
  { term: 'faca seu orcamento', weight: 30 },
  { term: 'preço', weight: 25 },
  { term: 'preco', weight: 25 },
  { term: 'valores', weight: 20 },
  { term: 'valor:', weight: 25 },
  { term: 'tabela', weight: 20 },
  { term: 'taxa', weight: 20 },
  { term: 'parcelamos', weight: 25 },
  { term: 'parcelo', weight: 25 },
  { term: 'aceito cartão', weight: 25 },
  { term: 'aceito cartao', weight: 25 },
  { term: 'pix', weight: 20 },

  // Promoções, Descontos & Ofertas
  { term: 'promoção', weight: 30 },
  { term: 'promocao', weight: 30 },
  { term: 'desconto', weight: 25 },
  { term: 'oferta', weight: 25 },
  { term: 'combo', weight: 25 },
  { term: 'queima de estoque', weight: 30 },
  { term: 'novidades', weight: 20 },
  { term: 'pronta entrega', weight: 25 },
  { term: 'coleção nova', weight: 25 },
  { term: 'colecao nova', weight: 25 },
  { term: 'lançamento', weight: 20 },
  { term: 'lancamento', weight: 20 },

  // Chamada de Contato / WhatsApp / Direct / PV
  { term: 'chame no pv', weight: 30 },
  { term: 'chamar no pv', weight: 30 },
  { term: 'chama no pv', weight: 30 },
  { term: 'chame no zap', weight: 30 },
  { term: 'chama no zap', weight: 30 },
  { term: 'chamar no zap', weight: 30 },
  { term: 'chame no whatsapp', weight: 30 },
  { term: 'chama no whatsapp', weight: 30 },
  { term: 'link na bio', weight: 20 },
  { term: 'contato:', weight: 25 },
  { term: 'whatsapp:', weight: 25 },
  { term: 'direct', weight: 20 },
  { term: 'inbox', weight: 20 },
  { term: 'faça seu pedido', weight: 30 },
  { term: 'faca seu pedido', weight: 30 },
  { term: 'peça já', weight: 25 },
  { term: 'peca ja', weight: 25 },
  { term: 'garanta já', weight: 25 },
  { term: 'garanta ja', weight: 25 },
  { term: 'compre já', weight: 25 },
  { term: 'compre ja', weight: 25 },
  { term: 'encomende já', weight: 25 },
  { term: 'encomende ja', weight: 25 },
  { term: 'chama no privado', weight: 30 },
  { term: 'chame no privado', weight: 30 },
  { term: 'teste grátis', weight: 25 },
  { term: 'teste gratis', weight: 25 },
  { term: 'por mês', weight: 25 },
  { term: 'por mes', weight: 25 },
  { term: 'mensalidade', weight: 25 },
  { term: 'crédito', weight: 25 },
  { term: 'credito', weight: 25 },
  { term: 'aprovação', weight: 20 },
  { term: 'aprovacao', weight: 20 },
  { term: 'juros', weight: 20 },
  { term: 'serviço', weight: 20 },
  { term: 'servico', weight: 20 },

  // Agenda & Encomendas
  { term: 'agenda aberta', weight: 30 },
  { term: 'agende seu horário', weight: 30 },
  { term: 'agende seu horario', weight: 30 },
  { term: 'horários disponíveis', weight: 25 },
  { term: 'horarios disponiveis', weight: 25 },
  { term: 'vagas abertas', weight: 25 },
  { term: 'aceitamos encomendas', weight: 30 },
  { term: 'aceito encomendas', weight: 30 },
  { term: 'encomendas abertas', weight: 30 },
  { term: 'faça sua encomenda', weight: 30 },
  { term: 'faca sua encomenda', weight: 30 },

  // Eletricistas, Construção, Reformas & Manutenção
  { term: 'eletricista', weight: 35 },
  { term: 'instalações elétricas', weight: 30 },
  { term: 'instalacoes eletricas', weight: 30 },
  { term: 'pedreiro', weight: 35 },
  { term: 'pintor', weight: 30 },
  { term: 'pintura residencial', weight: 30 },
  { term: 'marcenaria', weight: 30 },
  { term: 'móveis sob medida', weight: 30 },
  { term: 'moveis sob medida', weight: 30 },
  { term: 'serralheria', weight: 30 },
  { term: 'vidraçaria', weight: 30 },
  { term: 'vidracaria', weight: 30 },
  { term: 'gesso', weight: 25 },
  { term: 'drywall', weight: 25 },
  { term: 'calhas', weight: 25 },
  { term: 'reformas', weight: 30 },
  { term: 'construção', weight: 30 },
  { term: 'construcao', weight: 30 },
  { term: 'encanador', weight: 30 },
  { term: 'desentupidora', weight: 30 },
  { term: 'ar condicionado', weight: 30 },
  { term: 'ar-condicionado', weight: 30 },
  { term: 'refrigeração', weight: 30 },
  { term: 'refrigeracao', weight: 30 },

  // Estética, Beleza, Cabelo & Cuidados
  { term: 'estética', weight: 30 },
  { term: 'estetica', weight: 30 },
  { term: 'manicure', weight: 35 },
  { term: 'pedicure', weight: 30 },
  { term: 'unhas de gel', weight: 30 },
  { term: 'fibra de vidro', weight: 30 },
  { term: 'nail designer', weight: 30 },
  { term: 'sobrancelhas', weight: 30 },
  { term: 'microblading', weight: 30 },
  { term: 'cílios', weight: 30 },
  { term: 'cilios', weight: 30 },
  { term: 'lash lifting', weight: 30 },
  { term: 'extensão de cílios', weight: 30 },
  { term: 'cabeleireiro', weight: 30 },
  { term: 'cabeleireira', weight: 30 },
  { term: 'salão de beleza', weight: 30 },
  { term: 'salao de beleza', weight: 30 },
  { term: 'barbearia', weight: 30 },
  { term: 'barbeiro', weight: 25 },
  { term: 'depilação', weight: 30 },
  { term: 'depilacao', weight: 30 },
  { term: 'limpeza de pele', weight: 30 },
  { term: 'massagem', weight: 25 },
  { term: 'massoterapia', weight: 25 },

  // Roupas, Moda, Acessórios & Calçados
  { term: 'roupas', weight: 30 },
  { term: 'moda feminina', weight: 30 },
  { term: 'moda masculina', weight: 30 },
  { term: 'moda infantil', weight: 30 },
  { term: 'vestidos', weight: 25 },
  { term: 'conjuntos', weight: 25 },
  { term: 'lingerie', weight: 25 },
  { term: 'biquínis', weight: 25 },
  { term: 'calçados', weight: 25 },
  { term: 'calcados', weight: 25 },
  { term: 'tênis', weight: 25 },
  { term: 'tenis', weight: 25 },
  { term: 'semijoias', weight: 30 },
  { term: 'bolsas', weight: 25 },
  { term: 'óculos', weight: 25 },
  { term: 'oculos', weight: 25 },
  { term: 'perfumes importados', weight: 25 },

  // Alimentação, Bolos, Doces, Salgados, Marmitas & Lanches (Totalmente válidos!)
  { term: 'bolos', weight: 35 },
  { term: 'bolo caseiro', weight: 35 },
  { term: 'bolo decorado', weight: 35 },
  { term: 'bolo de pote', weight: 30 },
  { term: 'confeitaria', weight: 30 },
  { term: 'doces', weight: 30 },
  { term: 'docinhos', weight: 30 },
  { term: 'brigadeiros', weight: 30 },
  { term: 'salgados', weight: 35 },
  { term: 'salgadinhos para festa', weight: 35 },
  { term: 'marmitas', weight: 35 },
  { term: 'marmitex', weight: 35 },
  { term: 'refeições', weight: 30 },
  { term: 'refeicoes', weight: 30 },
  { term: 'quentinhas', weight: 30 },
  { term: 'delivery', weight: 30 },
  { term: 'pizzaria', weight: 30 },
  { term: 'hamburgueria', weight: 30 },
  { term: 'lanches', weight: 30 },
  { term: 'hot dog', weight: 25 },
  { term: 'porções', weight: 25 },
  { term: 'porcoes', weight: 25 },
  { term: 'açaí', weight: 25 },
  { term: 'acai', weight: 25 },
  { term: 'buffet', weight: 30 },

  // Serviços em Geral, Oficinas & Profissionais Autônomos
  { term: 'oficina mecânica', weight: 30 },
  { term: 'oficina mecanica', weight: 30 },
  { term: 'auto elétrica', weight: 30 },
  { term: 'auto eletrica', weight: 30 },
  { term: 'troca de óleo', weight: 25 },
  { term: 'estética automotiva', weight: 30 },
  { term: 'lavajato', weight: 25 },
  { term: 'lava rápido', weight: 25 },
  { term: 'higienização de estofados', weight: 30 },
  { term: 'higienizacao de estofados', weight: 30 },
  { term: 'limpeza de sofá', weight: 30 },
  { term: 'limpeza de sofa', weight: 30 },
  { term: 'assistência técnica', weight: 30 },
  { term: 'assistencia tecnica', weight: 30 },
  { term: 'conserto de celular', weight: 30 },
  { term: 'troca de tela', weight: 30 },
  { term: 'chaveiro', weight: 30 },
  { term: 'fotografia', weight: 25 },
  { term: 'ensaios fotográficos', weight: 30 },
  { term: 'advogado', weight: 25 },
  { term: 'contabilidade', weight: 25 },
  { term: 'personal trainer', weight: 25 },
  { term: 'consultoria', weight: 25 },
  { term: 'aulas particulares', weight: 25 },
  { term: 'cursos', weight: 25 },
];

/**
 * Curated professional Unsplash photography based on business segment
 */
export function getCuratedBusinessPhoto(segment: string, text: string): string {
  const s = (segment + ' ' + text).toLowerCase();
  if (
    s.includes('beleza') ||
    s.includes('estética') ||
    s.includes('estetica') ||
    s.includes('salão') ||
    s.includes('barbearia') ||
    s.includes('micropigmentação') ||
    s.includes('cílios') ||
    s.includes('sobrancelha')
  ) {
    return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80';
  }
  if (
    s.includes('saúde') ||
    s.includes('saude') ||
    s.includes('médic') ||
    s.includes('medic') ||
    s.includes('clínica') ||
    s.includes('clinica') ||
    s.includes('odonto') ||
    s.includes('dentista') ||
    s.includes('fisioterapia') ||
    s.includes('pilates')
  ) {
    return 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80';
  }
  if (
    s.includes('oficina') ||
    s.includes('mecânica') ||
    s.includes('mecanica') ||
    s.includes('auto') ||
    s.includes('carro') ||
    s.includes('ar-condicionado') ||
    s.includes('ar condicionado') ||
    s.includes('refrigeração')
  ) {
    return 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80';
  }
  if (
    s.includes('aliment') ||
    s.includes('restaurante') ||
    s.includes('pizza') ||
    s.includes('burger') ||
    s.includes('hamburguer') ||
    s.includes('confeitaria') ||
    s.includes('doce') ||
    s.includes('buffet') ||
    s.includes('comida') ||
    s.includes('delivery')
  ) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
  }
  if (
    s.includes('moda') ||
    s.includes('roupa') ||
    s.includes('loja') ||
    s.includes('semijoia') ||
    s.includes('calçado') ||
    s.includes('calcado') ||
    s.includes('boutique') ||
    s.includes('ótica') ||
    s.includes('otica') ||
    s.includes('pet shop')
  ) {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80';
  }
  if (
    s.includes('construção') ||
    s.includes('construcao') ||
    s.includes('reforma') ||
    s.includes('marcenaria') ||
    s.includes('serralheria') ||
    s.includes('arquiteto') ||
    s.includes('engenhar') ||
    s.includes('pintura') ||
    s.includes('solar')
  ) {
    return 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80';
  }
  if (
    s.includes('advoc') ||
    s.includes('direito') ||
    s.includes('contab') ||
    s.includes('consultor') ||
    s.includes('gestão') ||
    s.includes('sistema') ||
    s.includes('software') ||
    s.includes('tecnologia') ||
    s.includes('site')
  ) {
    return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80';
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

class RadarEngine {
  public status: 'active' | 'paused' = 'active';
  public activationTimestamp: number = Date.now();
  public monitoredGroupJids: Set<string> = new Set();
  public analyzedPhones: Map<string, { analyzedAt: number; result: any }> = new Map();
  private processedMessageIds: Map<string, number> = new Map();
  public analysisQueue: CandidateMessage[] = [];
  public opportunities: RadarOpportunity[] = [];
  public activities: RadarActivity[] = [];
  public contactStages: Map<string, string> = new Map();
  public contactTags: Map<string, string[]> = new Map();

  // Sequential Group Round-Robin Scanning
  public currentScanIndex: number = 0;
  public currentScanState: CurrentScanState = {
    groupJid: '',
    groupName: '',
    groupAvatar: '',
    groupIndex: 0,
    totalGroups: 0,
    status: 'idle',
    statusMessage: 'Iniciando varredura sequencial dos grupos...',
    analyzedInCurrentGroup: 0,
    lastScanTimestamp: 0,
  };
  public groupMetadataCache: Map<string, { name: string; avatar: string }> = new Map();

  public prefilterMetrics = {
    totalInspected: 0,
    rejectedSocial: 0,
    rejectedSpam: 0,
    rejectedTooShort: 0,
    rejectedNoCommercial: 0,
    totalTokensSaved: 0,
    acceptedCandidates: 0,
    totalAiCalls: 0,
  };

  // Rate Limiting: fast 3-second cooldown for responsive results
  private lastProcessedTimestamp: number = 0;
  private readonly PROCESS_COOLDOWN_MS = 3000;
  private isWorkerBusy: boolean = false;
  private isScannerBusy: boolean = false;
  private queueIntervalTimer: any = null;
  private listenerIntervalTimer: any = null;
  private lastCheckedMessageTimestamps: Map<string, number> = new Map();

  // Evolution & AI providers
  public instanceName: string = 'nexus-radar';
  private evolutionCaller: ((endpoint: string, options?: any) => Promise<any>) | null = null;
  private geminiClient: GoogleGenAI | null = null;
  private aiProvider: 'openai' | 'gemini' = 'openai';
  private persistenceHandler?: (payload: any) => Promise<void> | void;
  private persistenceChain: Promise<void> = Promise.resolve();

  // Real-time typing tracking (remoteJid -> expiry timestamp)
  private typingMap: Map<string, number> = new Map();

  public updateGroupMetadata(jid: string, name: string, avatar: string) {
    if (!jid) return;
    this.groupMetadataCache.set(jid, {
      name: name || 'Grupo WhatsApp',
      avatar: avatar || '',
    });
  }

  public setPersistenceHandler(handler: (payload: any) => Promise<void> | void) {
    this.persistenceHandler = handler;
  }

  public exportState() {
    return {
      status: this.status,
      activationTimestamp: this.activationTimestamp,
      monitoredGroupJids: Array.from(this.monitoredGroupJids),
      analyzedPhones: Array.from(this.analyzedPhones.entries()),
      processedMessageIds: Array.from(this.processedMessageIds.entries()),
      opportunities: this.opportunities,
      activities: this.activities.slice(0, 100),
      contactStages: Array.from(this.contactStages.entries()),
      contactTags: Array.from(this.contactTags.entries()),
    };
  }

  public hydrateFromState(data: any) {
    if (!data || typeof data !== 'object') return;
    this.status = data.status === 'paused' ? 'paused' : 'active';
    this.activationTimestamp = Number(data.activationTimestamp || Date.now());
    this.monitoredGroupJids = new Set(Array.isArray(data.monitoredGroupJids) ? data.monitoredGroupJids : []);
    this.analyzedPhones = new Map(Array.isArray(data.analyzedPhones) ? data.analyzedPhones : []);
    this.processedMessageIds = new Map(Array.isArray(data.processedMessageIds) ? data.processedMessageIds : []);
    this.pruneProcessedMessageIds();
    const loadedOpps = Array.isArray(data.opportunities) ? data.opportunities : [];
    this.opportunities = loadedOpps.filter((opp: RadarOpportunity) => !this.isOpportunityDisqualified(opp));
    for (const opp of this.opportunities) {
      if (opp.image && opp.image.includes('unsplash.com')) {
        opp.image = '';
        opp.hasAttachedImage = false;
      }
    }
    this.activities = Array.isArray(data.activities) ? data.activities : [];
    this.contactStages = new Map(Array.isArray(data.contactStages) ? data.contactStages : []);
    this.contactTags = new Map(Array.isArray(data.contactTags) ? data.contactTags : []);
  }

  constructor() {
    this.initAIProviders();
    this.startWorker();
  }

  private initAIProviders() {
    const runtime = getAiRuntimeInfo();
    this.aiProvider = runtime.provider;
    if (runtime.provider === 'openai' && runtime.configured) {
      console.log(`[Radar] OpenAI configurada (${runtime.model}).`);
    } else if (runtime.provider === 'openai') {
      console.warn('[Radar] OPENAI_API_KEY não encontrada. Serão usadas somente regras determinísticas.');
    }

    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.geminiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        console.log('[Radar] Gemini AI initialized successfully.');
      } catch (err: any) {
        console.warn('[Radar] Gemini AI initialization warning:', err.message);
      }
    } else {
      console.warn('[Radar] GEMINI_API_KEY não encontrada. Serão usadas somente regras determinísticas.');
    }
  }

  public setEvolutionCaller(caller: (endpoint: string, options?: any) => Promise<any>) {
    this.evolutionCaller = caller;
    // A conexão fica apenas registrada. O polling só começa após uma ação
    // autenticada no painel administrativo ou ativação explícita do Radar.
  }

  public ensureMonitoringStarted() {
    if (this.status === 'active' && !this.listenerIntervalTimer) {
      this.startLiveGroupListener();
    }
  }

  public isOpportunityDisqualified(opp: Partial<RadarOpportunity>): boolean {
    const combined = `${opp.title || ''} ${opp.messageOriginal || ''} ${opp.segment || ''} ${opp.category || ''}`.toLowerCase();
    return DISQUALIFIED_PATTERNS.some((disq) => combined.includes(disq));
  }

  public persistState() {
    const payload = this.exportState();
    if (this.persistenceHandler) {
      this.persistenceChain = this.persistenceChain
        .catch(() => {})
        .then(() => this.persistenceHandler?.(payload))
        .then(() => undefined)
        .catch((e) => console.error('[Radar] Failed to persist state in database:', e));
    }
  }

  private pruneProcessedMessageIds() {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    for (const [messageId, processedAt] of this.processedMessageIds) {
      if (processedAt < cutoff) this.processedMessageIds.delete(messageId);
    }
    while (this.processedMessageIds.size > 5000) {
      const oldest = this.processedMessageIds.keys().next().value;
      if (!oldest) break;
      this.processedMessageIds.delete(oldest);
    }
  }

  public setStatus(newStatus: 'active' | 'paused') {
    this.status = newStatus;
    if (newStatus === 'active') {
      this.activationTimestamp = Date.now();
      this.ensureMonitoringStarted();
      this.addActivity({
        title: 'Radar ativado',
        subtitle: 'Iniciando escuta e análise das novas mensagens em tempo real.',
        type: 'radar_active',
      });
    } else {
      if (this.listenerIntervalTimer) {
        clearInterval(this.listenerIntervalTimer);
        this.listenerIntervalTimer = null;
      }
      this.addActivity({
        title: 'Radar pausado',
        subtitle: 'Monitoramento de grupos suspenso temporariamente.',
        type: 'system',
      });
    }
    this.persistState();
  }

  public addActivity(act: Omit<RadarActivity, 'id' | 'timestamp' | 'time'>) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const fullDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const newActivity: RadarActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: `${fullDate} ${timeStr}`,
      time: timeStr,
      ...act,
    };

    this.activities.unshift(newActivity);
    if (this.activities.length > 80) {
      this.activities.pop();
    }
    this.persistState();
  }

  // Set / Check typing presence for contact
  public setTyping(remoteJid: string) {
    if (!remoteJid) return;
    this.typingMap.set(remoteJid, Date.now() + 4500); // active for 4.5 seconds
  }

  public clearTyping(remoteJid: string) {
    if (!remoteJid) return;
    this.typingMap.delete(remoteJid);
  }

  public isTyping(remoteJid: string): boolean {
    if (!remoteJid) return false;
    const expiry = this.typingMap.get(remoteJid);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.typingMap.delete(remoteJid);
      return false;
    }
    return true;
  }

  // ----------------------------------------------------
  // MULTI-STAGE FILTERING PIPELINE
  // ----------------------------------------------------

  /**
   * Deduplicação Estrita Requisitada pelo Usuário:
   * "Não podemos por exemplo: pegar a mesma oportunidade usando o mesmo número. Se tiver o mesmo número não pode nem analisar ok."
   * Bloqueia apenas números que já viraram oportunidade/CRM ou que já estão aguardando análise.
   */
  public isPhoneAlreadyProcessedOrOpportunity(phoneOrJid: string): boolean {
    if (!phoneOrJid) return false;
    const clean = cleanPhoneDigits(phoneOrJid);
    if (!clean || clean.length < 8) return false;

    // Uma análise anterior rejeitada não deve bloquear novas mensagens do mesmo número.
    // A deduplicação permanente deve ocorrer apenas quando já existe oportunidade/CRM.

    // 1. Já existe como oportunidade registrada no Radar?
    for (const opp of this.opportunities) {
      if (
        opp.remoteJid === phoneOrJid ||
        arePhonesEquivalent(opp.phone, clean) ||
        arePhonesEquivalent(opp.remoteJid, clean)
      ) {
        return true;
      }
    }
    // Estar no CRM ou ter conversa privada nao bloqueia o Radar.
    // A deduplicacao aqui considera oportunidade do Radar e mensagem na fila.

    // 3. Já está na fila para ser analisado?
    if (
      this.analysisQueue.some(
        (item) =>
          arePhonesEquivalent(item.senderPhone, clean) ||
          arePhonesEquivalent(item.senderJid, phoneOrJid)
      )
    ) {
      return true;
    }

    return false;
  }

  private logMessageDecision(params: {
    messageId: string;
    groupJid: string;
    fromMe: boolean;
    senderPhone?: string;
    senderSource?: string;
    textLength: number;
    accepted: boolean;
    reason: string;
    heuristicScore?: number;
  }) {
    console.log('[RadarDecision]', {
      messageId: params.messageId || 'missing',
      groupJid: params.groupJid || 'missing',
      monitored: this.monitoredGroupJids.has(params.groupJid),
      fromMe: params.fromMe,
      sender: maskWhatsAppSender(params.senderPhone || ''),
      senderSource: params.senderSource || 'unknown',
      textExtracted: params.textLength > 0,
      textLength: params.textLength,
      classification: params.accepted ? 'candidate' : 'discarded',
      reason: params.reason,
      heuristicScore: params.heuristicScore || 0,
    });
  }

  /**
   * Main entry point when a new message arrives from a WhatsApp group.
   * Runs the 4 filtration stages:
   * 1. Deduplication (number already analyzed or opportunity exists)
   * 2. Deterministic Rules (group monitored, not fromMe, no spam/marketplaces, no food delivery, text length >= 15)
   * 3. Simple Classification (commercial intent keywords)
   * 4. Enqueue for AI Analysis (max 1 candidate per minute)
   */
  public handleIncomingGroupMessage(params: {
    groupJid: string;
    groupName?: string;
    senderJid: string;
    senderPhone: string;
    senderName: string;
    senderAvatar?: string;
    messageId: string;
    messageText: string;
    attachedImageUrl?: string;
    fromMe: boolean;
    timestamp: number;
    senderSource?: string;
  }) {
    const {
      groupJid,
      groupName = 'Grupo WhatsApp',
      senderJid,
      senderPhone,
      senderName,
      senderAvatar,
      messageId,
      messageText,
      fromMe,
      timestamp,
      senderSource,
    } = params;

    const reject = (reason: string, heuristicScore = 0) => {
      this.logMessageDecision({
        messageId,
        groupJid,
        fromMe,
        senderPhone: senderPhone || senderJid,
        senderSource,
        textLength: (messageText || '').trim().length,
        accepted: false,
        reason,
        heuristicScore,
      });
      return { accepted: false, reason };
    };

    // 0. Radar must be ACTIVE
    if (this.status !== 'active') return reject('radar_paused');

    // Lookback window: analyze messages up to 14 days old
    if (timestamp && timestamp * 1000 < Date.now() - 14 * 24 * 60 * 60 * 1000) {
      return reject('message_older_than_14_days');
    }

    // Stage 2a: Must be in monitored groups
    if (!this.monitoredGroupJids.has(groupJid)) {
      return reject('group_not_monitored');
    }

    // Stage 2b: Never analyze messages sent by the instance itself
    if (fromMe) {
      return reject('message_from_me');
    }

    // Clean phone format
    const cleanPhone = (senderPhone || senderJid || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return reject('invalid_phone');
    }

    this.prefilterMetrics.totalInspected++;

    if (messageId && this.processedMessageIds.has(messageId)) {
      return reject('duplicate_message_id');
    }
    if (messageId) {
      this.processedMessageIds.set(messageId, Date.now());
      this.pruneProcessedMessageIds();
      this.persistState();
    }

    // STAGE 1: DEDUPLICATION ESTRITA
    // "Não podemos pegar a mesma oportunidade usando o mesmo número. Se tiver o mesmo número não pode nem analisar ok."
    if (this.isPhoneAlreadyProcessedOrOpportunity(cleanPhone) || this.isPhoneAlreadyProcessedOrOpportunity(senderJid)) {
      this.prefilterMetrics.totalTokensSaved += 450;
      return reject('phone_already_has_opportunity');
    }

    // STAGE 2: DETERMINISTIC TOKEN-SAVER RULES
    const textLower = (messageText || '').toLowerCase().trim();

    // Text length requirement (at least 12 chars and at least 3 distinct words)
    const words = textLower.split(/\s+/).filter((w) => w.length > 1);
    if (textLower.length < 12 || words.length < 3) {
      this.prefilterMetrics.rejectedTooShort++;
      this.prefilterMetrics.totalTokensSaved += 450;
      return reject('text_too_short_or_low_density');
    }

    // Check pure social banter (greetings, 'bom dia', 'valeu', 'amém', etc.)
    const isSocialBanter = SOCIAL_BANTER_TERMS.some((term) => textLower.includes(term));
    const hasAnyCommercialKeyword = COMMERCIAL_INTENT_PATTERNS.some((p) => textLower.includes(p.term));

    if (isSocialBanter && !hasAnyCommercialKeyword) {
      this.prefilterMetrics.rejectedSocial++;
      this.prefilterMetrics.totalTokensSaved += 450;
      return reject('social_banter_filtered');
    }

    // STAGE 2.1: STRICT DISQUALIFICATION CHECK
    // Elimina sumariamente: revenda Vivo/Claro/operadoras, maquininhas, afiliados, fretes informais, desapegos usados
    for (const disqTerm of DISQUALIFIED_PATTERNS) {
      if (textLower.includes(disqTerm)) {
        this.prefilterMetrics.rejectedSpam++;
        this.prefilterMetrics.totalTokensSaved += 450;
        return reject(`disqualified_category:${disqTerm}`);
      }
    }

    // STAGE 3: CLASSIFICATION BY COMMERCIAL INTENT & OWN BUSINESS
    let heuristicScore = 0;
    const detectedKeywords: string[] = [];

    for (const pattern of COMMERCIAL_INTENT_PATTERNS) {
      if (textLower.includes(pattern.term)) {
        heuristicScore += pattern.weight;
        detectedKeywords.push(pattern.term);
      }
    }

    // High selectivity: minimum 20 heuristic points and at least one solid commercial keyword
    if (detectedKeywords.length === 0 || heuristicScore < 20) {
      this.prefilterMetrics.rejectedNoCommercial++;
      this.prefilterMetrics.totalTokensSaved += 450;
      return reject('no_commercial_intent_detected', heuristicScore);
    }

    this.prefilterMetrics.acceptedCandidates++;

    // STAGE 4: ENQUEUE CANDIDATE FOR AI ANALYSIS
    const candidate: CandidateMessage = {
      id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      groupJid,
      groupName,
      senderJid,
      senderPhone: cleanPhone,
      senderName: senderName || `Lead ${cleanPhone.slice(-4)}`,
      senderAvatar,
      messageId,
      messageText,
      attachedImageUrl: params.attachedImageUrl,
      hasAttachedImage: Boolean(params.attachedImageUrl),
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      addedAt: Date.now(),
      heuristicScore,
      detectedKeywords,
    };

    // Sort queue by relevance (highest score first) and recency
    this.analysisQueue.push(candidate);
    this.analysisQueue.sort((a, b) => b.heuristicScore - a.heuristicScore || b.addedAt - a.addedAt);

    this.addActivity({
      title: 'Lead enfileirado para análise',
      subtitle: `${candidate.senderName} no grupo "${groupName}" (${detectedKeywords.slice(0, 2).join(', ')})`,
      type: 'group_message',
    });

    console.log(
      `[Radar Queue] Candidate enqueued: ${cleanPhone} from "${groupName}" (Score: ${heuristicScore}, Queue: ${this.analysisQueue.length})`
    );

    this.logMessageDecision({
      messageId,
      groupJid,
      fromMe,
      senderPhone: cleanPhone,
      senderSource,
      textLength: messageText.trim().length,
      accepted: true,
      reason: 'commercial_candidate_enqueued',
      heuristicScore,
    });

    return { accepted: true, queuePosition: this.analysisQueue.length, heuristicScore };
  }

  // ----------------------------------------------------
  // WORKER: PROCESS CANDIDATE (MAX 1 PER MINUTE)
  // ----------------------------------------------------
  private startWorker() {
    if (this.queueIntervalTimer) clearInterval(this.queueIntervalTimer);

    // Check queue every 5 seconds
    this.queueIntervalTimer = setInterval(async () => {
      if (this.status !== 'active') return;
      if (this.isWorkerBusy) return;
      if (this.analysisQueue.length === 0) return;

      const now = Date.now();
      const elapsed = now - this.lastProcessedTimestamp;

      // Rate limit: Enforce at most 1 candidate per minute (60,000 ms cooldown)
      if (this.lastProcessedTimestamp > 0 && elapsed < this.PROCESS_COOLDOWN_MS) {
        return;
      }

      const candidate = this.analysisQueue.shift();
      if (!candidate) return;

      this.isWorkerBusy = true;
      this.lastProcessedTimestamp = Date.now();

      try {
        await this.processCandidateWithAI(candidate);
      } catch (err: any) {
        console.error('[Radar Worker] Error analyzing candidate:', err);
      } finally {
        this.isWorkerBusy = false;
      }
    }, 5000);
  }

  /**
   * Processes a single candidate with Gemini AI or intelligent deterministic fallback
   */
  private async processCandidateWithAI(candidate: CandidateMessage) {
    console.log(
      `[Radar Worker] Analyzing candidate ${candidate.senderPhone} (${candidate.senderName}) with AI...`
    );

    let evaluation: RadarAIEvaluation;

    try {
      const runtime = getAiRuntimeInfo();
      if (this.aiProvider === 'openai' && runtime.configured) {
        this.prefilterMetrics.totalAiCalls++;
        evaluation = await this.callOpenAIAnalysis(candidate);
      } else if (this.aiProvider === 'gemini' && this.geminiClient) {
        this.prefilterMetrics.totalAiCalls++;
        evaluation = await this.callGeminiAnalysis(candidate);
      } else {
        evaluation = this.deterministicQualification(candidate);
      }
    } catch (err: any) {
      console.warn(`[Radar Worker] Provedor de IA indisponível (${err?.message || 'erro desconhecido'}). Aplicando regras determinísticas.`);
      evaluation = this.deterministicQualification(candidate);
    }

    // Mantém o histórico da análise para métricas/auditoria.
    // Uma rejeição aqui NÃO bloqueia mensagens futuras do mesmo número;
    // a deduplicação permanente ocorre somente após virar oportunidade/CRM.
    this.analyzedPhones.set(candidate.senderPhone, {
      analyzedAt: Date.now(),
      result: evaluation,
    });

    console.log('[RadarClassification]', {
      messageId: candidate.messageId || 'missing',
      groupJid: candidate.groupJid,
      sender: maskWhatsAppSender(candidate.senderPhone),
      isOpportunity: evaluation.isOpportunity,
      confidence: evaluation.confidence,
      decision:
        evaluation.isOpportunity && evaluation.confidence >= 70
          ? 'opportunity_created'
          : 'model_rejected_or_below_threshold',
    });

    // Uma mensagem que chegou ate a fila ja passou pelo pre-filtro comercial. A IA
    // enriquece a classificacao, mas nao pode vetar sinais comerciais objetivos.
    const deterministicEvaluation = this.deterministicQualification(candidate);
    const deterministicCommercial = deterministicEvaluation.isOpportunity && deterministicEvaluation.confidence >= 70;
    const modelCommercial = evaluation.isOpportunity && evaluation.confidence >= 70;
    if (deterministicCommercial && !modelCommercial) evaluation = deterministicEvaluation;
    const shouldCreateOpportunity = deterministicCommercial || modelCommercial;

    if (shouldCreateOpportunity) {
      const opportunity = this.createOpportunityRecord(candidate, evaluation);
      this.opportunities.unshift(opportunity);

      // Register into CRM Atendimento
      atendimentoEngine.registerFromRadar({
        id: opportunity.id,
        contactName: opportunity.contactName,
        contactPhone: opportunity.phone,
        avatar: opportunity.avatar,
        groupName: opportunity.groupName,
        groupJid: opportunity.groupJid,
        remoteJid: opportunity.remoteJid,
        originalMessage: opportunity.messageOriginal,
        summary: opportunity.title,
        recommendedService: opportunity.aiAnalysis?.recommendedService || 'Divulgação Automática em Grupos de WhatsApp',
        score: opportunity.score,
        urgency: opportunity.aiAnalysis?.urgency || 'Alta',
      });

      this.addActivity({
        title: 'Oportunidade de Prospecção!',
        subtitle: `${opportunity.title} (${opportunity.score} pts) • ${opportunity.contactName}`,
        type: 'lead_identified',
        opportunityId: opportunity.id,
      });

      console.log(
        `[Radar Worker] Qualified Opportunity created: "${opportunity.title}" (Score: ${opportunity.score})`
      );
    } else {
      console.log(
        `[Radar Worker] Message from ${candidate.senderPhone} filtered out (Opportunity: ${evaluation.isOpportunity}, Confidence: ${evaluation.confidence}). Filtered reason: ${evaluation.reason}`
      );
    }

    this.persistState();
  }

  private async callOpenAIAnalysis(candidate: CandidateMessage): Promise<RadarAIEvaluation> {
    const parsed = await createOpenAIStructuredResponse<any>({
      name: 'radar_opportunity_evaluation',
      instructions: 'Você é o motor de qualificação B2B do Grolpy Radar. Priorize pequenos negócios divulgando produtos ou serviços manualmente em grupos. Rejeite conversa social, desapego pontual, afiliados, apostas, maquininhas e revenda institucional de operadoras.',
      input: `Contato: ${candidate.senderName}\nGrupo: ${candidate.groupName}\nMensagem: ${candidate.messageText}`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          isOpportunity: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 100 },
          segment: { type: 'string' },
          businessType: { type: 'string' },
          recommendedService: { type: 'string' },
          reason: { type: 'string' },
          signals: { type: 'array', items: { type: 'string' } },
        },
        required: ['isOpportunity', 'confidence', 'segment', 'businessType', 'recommendedService', 'reason', 'signals'],
      },
    });
    const conf = Math.min(100, Math.max(0, Number(parsed.confidence) || 0));
    return {
      isOpportunity: Boolean(parsed.isOpportunity) && conf >= 65,
      confidence: conf,
      segment: parsed.segment || 'Divulgação Comercial',
      businessType: parsed.businessType || 'Prestador / Comércio',
      recommendedService: parsed.recommendedService || 'Divulgação Automática em Grupos de WhatsApp',
      reason: parsed.reason || 'Divulgação comercial identificada no grupo.',
      signals: Array.isArray(parsed.signals) ? parsed.signals : candidate.detectedKeywords,
      intent: 'Divulgação em Grupos / Captação de Clientes',
      budget: 'Sob Consulta', urgency: 'Alta', sentiment: 'urgent',
    };
  }

  /**
   * Gemini AI Analysis with multi-model fallback and high-precision criteria
   * NOVO OBJETIVO: Identificar pessoas divulgando produtos, serviços ou negócios manualmente nos grupos
   * de WhatsApp para oferecer nossa ferramenta de divulgação automática em grupos.
   */
  private async callGeminiAnalysis(candidate: CandidateMessage): Promise<RadarAIEvaluation> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = `
Você é o motor de inteligência artificial do Nxs Radar, um analista comercial B2B focado em identificar pessoas e pequenas empresas que estão divulgando produtos, serviços ou negócios manualmente nos grupos de WhatsApp.

OBJETIVO DO SISTEMA:
Identificar pessoas que estão anunciando/divulgando ativamente nos grupos para oferecermos nossa FERRAMENTA DE DIVULGAÇÃO AUTOMÁTICA EM GRUPOS DE WHATSAPP (que poupa tempo e posta anúncios automaticamente em vários grupos no piloto automático).

EXEMPLOS VÁLIDOS E PRIORITÁRIOS ("isOpportunity": true com "confidence": 75 a 95):
- Eletricistas, pedreiros, pintores, encanadores, instaladores, marcenaria, serralheria, reformas e construção em geral.
- Estética, manicure, unhas de gel, sobrancelhas, cílios, depilação, cabeleireiros, barbearias, salões de beleza.
- Roupas, moda feminina/masculina/infantil, lingerie, calçados, bolsas, acessórios, semijoias.
- Alimentação, bolos caseiros e decorados, doces, salgados, marmitas/marmitex, delivery de lanches, quentinhas, refeições, buffets (NÃO descarte alimentação pelo segmento! Se está divulgando no grupo, é oportunidade válida).
- Serviços técnicos em geral, conserto de celulares, chaveiro, manutenção, lavajato, higienização de estofados.
- Lojas locais, comércios de bairro, produtos em pronta entrega, profissionais autônomos e pequenos negócios em geral.

CRITÉRIOS DE ELIMINAÇÃO SUMÁRIA ("isOpportunity": false e "confidence": 10 a 30):
1. Revenda institucional de grandes operadoras de telecom (Vivo Fibra, Claro Fibra, portabilidade de chip).
2. Divulgação de maquininhas de cartão (Ton, taxas da máquina).
3. Links de afiliados (Shopee, Shein, AliExpress), esquemas de renda extra, roleta, tigrinho, cassinos.
4. Desapegos pessoais pontuais de itens velhos/usados de pessoas físicas (ex: "vendo meu sofá usado").
5. Conversas puramente sociais sem nenhum anúncio, produto, serviço ou oferta comercial.

Dados do Contato:
- Nome/PushName: "${candidate.senderName}"
- Telefone: "${candidate.senderPhone}"
- Grupo de Origem: "${candidate.groupName}"
- Mensagem Original:
"""${candidate.messageText}"""

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "isOpportunity": true ou false,
  "confidence": número de 0 a 100,
  "segment": "Segmento específico (ex: Eletricista & Manutenção, Estética & Beleza, Moda & Roupas, Bolos & Confeitaria, Marmitas & Alimentação, Serviços Gerais, etc.)",
  "businessType": "Tipo de Negócio / Atividade (ex: Eletricista Residencial, Nail Designer, Loja de Roupas, Confeitaria Artesanal, etc.)",
  "recommendedService": "Ferramenta de Divulgação Automática em Grupos de WhatsApp",
  "reason": "Explicação direta de qual produto/serviço a pessoa está divulgando no grupo",
  "signals": ["sinal 1", "sinal 2"]
}
`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        if (text) {
          const parsed = JSON.parse(text);
          const isOpp = Boolean(parsed.isOpportunity);
          const conf = Math.min(100, Math.max(0, Number(parsed.confidence) || 0));

          return {
            isOpportunity: isOpp && conf >= 65,
            confidence: conf,
            segment: parsed.segment || 'Divulgação Comercial',
            businessType: parsed.businessType || 'Prestador / Comércio',
            recommendedService: parsed.recommendedService || 'Divulgação Automática em Grupos de WhatsApp',
            reason: parsed.reason || 'Divulgação ativa de serviços/produtos identificada no grupo de WhatsApp.',
            signals: Array.isArray(parsed.signals) ? parsed.signals : candidate.detectedKeywords,
            intent: 'Divulgação em Grupos / Captação de Clientes',
            budget: 'Sob Consulta',
            urgency: 'Alta',
            sentiment: 'urgent',
          };
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isTransient =
          err?.status === 503 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          err?.status === 429 ||
          msg.includes('429');

        if (isTransient) {
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('All Gemini models temporarily unavailable');
  }

  /**
   * Deterministic semantic fallback if Gemini is offline or hits quota limits
   * Fully enforces the automatic group posting tool objective
   */
  private deterministicQualification(candidate: CandidateMessage): RadarAIEvaluation {
    const text = candidate.messageText.toLowerCase();

    // 1. Check strict disqualifications (telecom, maquininhas, afiliados, desapegos usados)
    for (const disq of DISQUALIFIED_PATTERNS) {
      if (text.includes(disq)) {
        return {
          isOpportunity: false,
          confidence: 15,
          segment: 'Desqualificado',
          businessType: 'Revenda / Informal',
          recommendedService: 'Nenhum',
          reason: `Desqualificado por conter padrão: "${disq}".`,
          signals: [disq],
          intent: 'Não Qualificado',
          budget: 'Nenhum',
          urgency: 'Baixa',
          sentiment: 'neutral',
        };
      }
    }

    // 2. Eletricistas, Construção, Reformas & Manutenção
    if (
      text.includes('eletricista') ||
      text.includes('pedreiro') ||
      text.includes('pintor') ||
      text.includes('marcenaria') ||
      text.includes('serralheria') ||
      text.includes('vidraçaria') ||
      text.includes('gesso') ||
      text.includes('drywall') ||
      text.includes('calhas') ||
      text.includes('reformas') ||
      text.includes('construção') ||
      text.includes('construcao') ||
      text.includes('encanador') ||
      text.includes('ar condicionado') ||
      text.includes('refrigeração')
    ) {
      return {
        isOpportunity: true,
        confidence: 88,
        segment: 'Construção, Reformas & Manutenção',
        businessType: 'Prestador de Serviços / Construção',
        recommendedService: 'Divulgação Automática em Grupos de WhatsApp',
        reason: 'Profissional divulgando serviços de manutenção/reformas no grupo de WhatsApp.',
        signals: candidate.detectedKeywords,
        intent: 'Captação de Clientes',
        budget: 'Sob Consulta',
        urgency: 'Alta',
        sentiment: 'urgent',
      };
    }

    // 3. Estética, Beleza, Cuidados & Bem-Estar
    if (
      text.includes('estética') ||
      text.includes('estetica') ||
      text.includes('manicure') ||
      text.includes('pedicure') ||
      text.includes('unhas') ||
      text.includes('sobrancelha') ||
      text.includes('cílios') ||
      text.includes('cilios') ||
      text.includes('cabeleireiro') ||
      text.includes('cabeleireira') ||
      text.includes('salão') ||
      text.includes('salao') ||
      text.includes('barbearia') ||
      text.includes('depilação') ||
      text.includes('limpeza de pele')
    ) {
      return {
        isOpportunity: true,
        confidence: 90,
        segment: 'Estética & Beleza',
        businessType: 'Profissional de Beleza / Estética',
        recommendedService: 'Divulgação Automática em Grupos de WhatsApp',
        reason: 'Profissional divulgando atendimentos de beleza/estética no grupo.',
        signals: candidate.detectedKeywords,
        intent: 'Preenchimento de Agenda',
        budget: 'Sob Consulta',
        urgency: 'Alta',
        sentiment: 'urgent',
      };
    }

    // 4. Alimentação, Bolos, Doces, Salgados, Marmitas & Lanches
    if (
      text.includes('bolos') ||
      text.includes('bolo') ||
      text.includes('doces') ||
      text.includes('docinhos') ||
      text.includes('brigadeiro') ||
      text.includes('salgados') ||
      text.includes('salgadinhos') ||
      text.includes('marmita') ||
      text.includes('marmitex') ||
      text.includes('quentinhas') ||
      text.includes('refeições') ||
      text.includes('lanches') ||
      text.includes('pizzaria') ||
      text.includes('hamburgueria') ||
      text.includes('confeitaria') ||
      text.includes('buffet')
    ) {
      return {
        isOpportunity: true,
        confidence: 89,
        segment: 'Alimentação & Confeitaria',
        businessType: 'Alimentação / Produção Própria',
        recommendedService: 'Divulgação Automática em Grupos de WhatsApp',
        reason: 'Produtor/comércio de alimentação divulgando encomendas e produtos no grupo.',
        signals: candidate.detectedKeywords,
        intent: 'Vendas e Encomendas',
        budget: 'Sob Consulta',
        urgency: 'Alta',
        sentiment: 'urgent',
      };
    }

    // 5. Roupas, Moda, Acessórios & Semijoias
    if (
      text.includes('roupas') ||
      text.includes('moda') ||
      text.includes('vestidos') ||
      text.includes('lingerie') ||
      text.includes('calçados') ||
      text.includes('calcados') ||
      text.includes('tênis') ||
      text.includes('tenis') ||
      text.includes('semijoias') ||
      text.includes('bolsas') ||
      text.includes('óculos') ||
      text.includes('perfumes')
    ) {
      return {
        isOpportunity: true,
        confidence: 86,
        segment: 'Moda & Acessórios',
        businessType: 'Venda de Roupas / Acessórios',
        recommendedService: 'Divulgação Automática em Grupos de WhatsApp',
        reason: 'Divulgação de produtos de moda, roupas ou acessórios em grupos.',
        signals: candidate.detectedKeywords,
        intent: 'Venda de Produtos',
        budget: 'Sob Consulta',
        urgency: 'Alta',
        sentiment: 'urgent',
      };
    }

    // 6. Serviços Gerais, Consertos & Profissionais Autônomos
    if (
      text.includes('oficina') ||
      text.includes('mecânica') ||
      text.includes('assistência') ||
      text.includes('conserto') ||
      text.includes('troca de tela') ||
      text.includes('chaveiro') ||
      text.includes('lavajato') ||
      text.includes('limpeza de sofá') ||
      text.includes('higienização') ||
      text.includes('fotografia') ||
      text.includes('advogado') ||
      text.includes('contabilidade')
    ) {
      return {
        isOpportunity: true,
        confidence: 85,
        segment: 'Serviços & Profissionais Autônomos',
        businessType: 'Prestador de Serviços Especializados',
        recommendedService: 'Divulgação Automática em Grupos de WhatsApp',
        reason: 'Profissional ou prestador divulgando serviços especializados no grupo.',
        signals: candidate.detectedKeywords,
        intent: 'Captação de Clientes',
        budget: 'Sob Consulta',
        urgency: 'Alta',
        sentiment: 'urgent',
      };
    }

    // 7. Qualquer mensagem comercial com keywords fortes e pontuação >= 20
    if (candidate.heuristicScore >= 20 && candidate.detectedKeywords.length >= 1) {
      return {
        isOpportunity: true,
        confidence: 78,
        segment: 'Comércio & Serviços Locais',
        businessType: 'Pequeno Negócio / Autônomo',
        recommendedService: 'Divulgação Automática em Grupos de WhatsApp',
        reason: 'Mensagem com claros sinais comerciais de divulgação ativa no grupo.',
        signals: candidate.detectedKeywords,
        intent: 'Divulgação de Produtos/Serviços',
        budget: 'Sob Consulta',
        urgency: 'Alta',
        sentiment: 'urgent',
      };
    }

    // Rejeição para não comerciais
    return {
      isOpportunity: false,
      confidence: 25,
      segment: 'Não Qualificado',
      businessType: 'Sem Sinais Comerciais',
      recommendedService: 'Nenhum',
      reason: 'Mensagem não apresenta divulgação comercial de produtos, serviços ou negócios.',
      signals: candidate.detectedKeywords,
      intent: 'Não Qualificado',
      budget: 'Nenhum',
      urgency: 'Baixa',
      sentiment: 'neutral',
    };
  }

  /**
   * Assembles a complete, compliant RadarOpportunity object
   */
  private createOpportunityRecord(
    candidate: CandidateMessage,
    evaluation: RadarAIEvaluation
  ): RadarOpportunity {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Deterministic polar coordinates for radar positioning based on score
    const angle = ((Date.now() % 360) * Math.PI) / 180;
    const radius = 30 + ((100 - evaluation.confidence) / 100) * 55;
    const x = Math.round(50 + Math.cos(angle) * (radius * 0.45));
    const y = Math.round(50 + Math.sin(angle) * (radius * 0.45));

    // Formatted title with safe Unicode truncation
    const shortText = safeUnicodeTruncate(candidate.messageText, 48);

    const formattedPhone = candidate.senderPhone.startsWith('55')
      ? `+55 (${candidate.senderPhone.slice(2, 4)}) ${candidate.senderPhone.slice(4, 9)}-${candidate.senderPhone.slice(9)}`
      : `+${candidate.senderPhone}`;

    // Strict requirement: Only display real image received from contact via WhatsApp.
    // If no image was received in the original message, do NOT invent or assign stock/curated photos.
    const isRealImage = Boolean(
      candidate.attachedImageUrl &&
      !candidate.attachedImageUrl.includes('unsplash.com') &&
      !candidate.attachedImageUrl.includes('placeholder')
    );
    const realAttachedImage = isRealImage ? candidate.attachedImageUrl! : '';

    return {
      id: `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${evaluation.businessType}: ${shortText.replace(/\n/g, ' ')}`,
      segment: evaluation.segment,
      category: evaluation.segment.split('&')[0].trim(),
      confidenceScore: evaluation.confidence,
      score: evaluation.confidence,
      contactName: candidate.senderName,
      phone: formattedPhone,
      remoteJid: candidate.senderJid.includes('@') ? candidate.senderJid : `${candidate.senderPhone}@s.whatsapp.net`,
      groupJid: candidate.groupJid,
      groupName: candidate.groupName,
      messageOriginal: candidate.messageText,
      timestamp: timeStr,
      relativeTime: 'Agora há pouco',
      createdAt: Date.now(),
      avatar: candidate.senderAvatar || '',
      image: realAttachedImage,
      hasAttachedImage: isRealImage,
      radarCoords: { x, y },
      status: 'new',
      stage: 'nao_atribuidas',
      assignedTo: null,
      aiAnalysis: {
        intent: evaluation.intent || 'Contratação / Expansão Digital',
        budget: evaluation.budget || 'R$ 2.500 - R$ 6.000',
        urgency: evaluation.urgency || 'Alta',
        sentiment: evaluation.sentiment || 'urgent',
        keyKeywords: evaluation.signals,
        recommendedAction: 'Iniciar atendimento no CRM com proposta comercial focada em site e autoridade',
        recommendedService: evaluation.recommendedService,
        reason: evaluation.reason,
        signals: evaluation.signals,
      },
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: 'Agora há pouco',
          action: `Oportunidade qualificada pelo Nxs Radar (${evaluation.confidence} pts)`,
          author: 'IA Nxs Radar',
          type: 'ai',
        },
      ],
    };
  }

  // ----------------------------------------------------
  // REAL-TIME SEQUENTIAL GROUP SCANNER (ONE BY ONE ROUND-ROBIN)
  // ----------------------------------------------------
  private startLiveGroupListener() {
    if (this.listenerIntervalTimer) return;

    // Initial immediate scan
    setTimeout(() => {
      this.runSequentialGroupScan();
    }, 1000);

    // Poll sequentially one group at a time every 4.5 seconds
    this.listenerIntervalTimer = setInterval(async () => {
      await this.runSequentialGroupScan();
    }, 4500);
  }

  private async runSequentialGroupScan() {
    if (this.status !== 'active') {
      this.currentScanState.status = 'idle';
      this.currentScanState.statusMessage = 'Radar pausado. Clique em Iniciar para ativar o monitoramento.';
      return;
    }
    if (!this.evolutionCaller) return;
    if (this.monitoredGroupJids.size === 0) {
      this.currentScanState.status = 'idle';
      this.currentScanState.statusMessage = 'Nenhum grupo adicionado. Clique em "+ Adicionar Grupos" para começar.';
      return;
    }
    if (this.isScannerBusy) return;

    this.isScannerBusy = true;
    const groupList = Array.from(this.monitoredGroupJids);
    if (groupList.length === 0) {
      this.isScannerBusy = false;
      return;
    }

    if (this.currentScanIndex >= groupList.length) {
      this.currentScanIndex = 0;
    }

    const groupJid = groupList[this.currentScanIndex];
    const meta = this.groupMetadataCache.get(groupJid) || {
      name: `Grupo WhatsApp (${this.currentScanIndex + 1})`,
      avatar: '',
    };

    const groupName = meta.name;
    const groupAvatar = meta.avatar;
    const groupIndex = this.currentScanIndex + 1;
    const totalGroups = groupList.length;

    // Set real-time informative status
    this.currentScanState = {
      groupJid,
      groupName,
      groupAvatar,
      groupIndex,
      totalGroups,
      status: 'scanning',
      statusMessage: `Verificando grupo ${groupIndex} de ${totalGroups}: "${groupName}"...`,
      analyzedInCurrentGroup: 0,
      lastScanTimestamp: Date.now(),
    };

    try {
      // Query recent messages for this group (lookback up to 30 messages)
      const res = await this.evolutionCaller(`/chat/findMessages/${this.getCurrentInstance()}`, {
        method: 'POST',
        body: JSON.stringify({
          where: { key: { remoteJid: groupJid } },
          limit: 30,
        }),
      }).catch(() => null);

      if (!res?.ok || !res?.data) {
        this.currentScanState.statusMessage = `Grupo ${groupIndex} (${groupName}): aguardando resposta da API. Avançando...`;
        this.currentScanIndex = (this.currentScanIndex + 1) % groupList.length;
        this.isScannerBusy = false;
        return;
      }

      const records = res.data.messages?.records || (Array.isArray(res.data) ? res.data : []);
      let analyzedCount = 0;
      let foundCandidateInThisGroup = false;

      for (const msg of records) {
        const messageText = extractWhatsAppMessageText(msg);
        const sender = resolveWhatsAppGroupSender(msg);
        const senderJid = sender.jid;
        const senderPhone = sender.phone;
        const msgTimestamp = getWhatsAppMessageTimestamp(msg);
        const fromMe = Boolean(msg.key?.fromMe);
        const message = unwrapWhatsAppMessage(msg.message);

        const senderName = msg.pushName || `WhatsApp ${senderPhone.slice(-4)}`;

        // Extract real attached image from WhatsApp message if present
        let attachedImageUrl: string | undefined = undefined;
        const msgId = msg.key?.id;
        const instance = this.instanceName || 'nexus-radar';

        if (message?.imageMessage) {
          const imgMsg = message.imageMessage;
          if (imgMsg.url && typeof imgMsg.url === 'string' && imgMsg.url.startsWith('http')) {
            attachedImageUrl = imgMsg.url;
          } else if (imgMsg.jpegThumbnail) {
            attachedImageUrl = `data:image/jpeg;base64,${imgMsg.jpegThumbnail}`;
          } else if (imgMsg.base64) {
            attachedImageUrl = `data:image/jpeg;base64,${imgMsg.base64}`;
          } else if (msgId) {
            attachedImageUrl = `/api/crm/media/${msgId}?instance=${instance}`;
          }
        } else if (msg.base64 && (msg.mimetype?.startsWith('image/') || msg.messageType === 'imageMessage')) {
          attachedImageUrl = `data:${msg.mimetype || 'image/jpeg'};base64,${msg.base64}`;
        } else if (msg.mediaUrl && typeof msg.mediaUrl === 'string' && msg.mediaUrl.startsWith('http')) {
          attachedImageUrl = msg.mediaUrl;
        }

        // Process message into the radar pipeline
        const result = this.handleIncomingGroupMessage({
          groupJid,
          groupName,
          senderJid,
          senderPhone,
          senderName,
          messageId: String(msg.key?.id || ''),
          messageText,
          attachedImageUrl,
          fromMe,
          timestamp: msgTimestamp,
          senderSource: sender.source,
        });

        analyzedCount++;
        if (result.accepted) {
          foundCandidateInThisGroup = true;
        }
      }

      this.currentScanState.analyzedInCurrentGroup = analyzedCount;

      if (foundCandidateInThisGroup) {
        this.currentScanState.status = 'scanning';
        this.currentScanState.statusMessage = `Grupo ${groupIndex} de ${totalGroups} ("${groupName}") verificado: candidato(s) enviado(s) para classificação.`;
      } else {
        this.currentScanState.status = 'completed_no_lead';
        this.currentScanState.statusMessage = `Grupo ${groupIndex} de ${totalGroups} ("${groupName}") verificado: ${records.length} msgs analisadas. Nenhuma nova solicitação no momento. Avançando...`;
      }
    } catch (e: any) {
      this.currentScanState.statusMessage = `Grupo "${groupName}" verificado. Avançando para o próximo grupo...`;
    } finally {
      // Advance to next group index for next round!
      this.currentScanIndex = (this.currentScanIndex + 1) % groupList.length;
      this.isScannerBusy = false;
    }
  }

  private getCurrentInstance(): string {
    return this.instanceName || 'minhabagg-leads';
  }

  // ----------------------------------------------------
  // PUBLIC API HELPERS
  // ----------------------------------------------------

  public getStatus() {
    const ai = getAiRuntimeInfo();
    return {
      status: this.status,
      activationTimestamp: this.activationTimestamp,
      monitoredGroupsCount: this.monitoredGroupJids.size,
      queueSize: this.analysisQueue.length,
      analyzedPhonesCount: this.analyzedPhones.size,
      opportunitiesCount: this.opportunities.length,
      lastProcessedAt: this.lastProcessedTimestamp,
      currentScan: this.currentScanState,
      prefilterMetrics: this.prefilterMetrics,
      ai,
    };
  }

  public setMonitoredGroups(groupJids: string[]) {
    this.monitoredGroupJids = new Set(groupJids);
    this.persistState();
    return Array.from(this.monitoredGroupJids);
  }

  public toggleMonitoredGroup(groupJid: string, isMonitored: boolean) {
    if (isMonitored) {
      this.monitoredGroupJids.add(groupJid);
    } else {
      this.monitoredGroupJids.delete(groupJid);
    }
    this.persistState();
    return this.monitoredGroupJids.has(groupJid);
  }

  public updateOpportunityStage(
    opportunityId: string,
    newStage: RadarOpportunity['stage'],
    assignedUserName?: string
  ) {
    const opp = this.opportunities.find((o) => o.id === opportunityId);
    if (!opp) return null;

    opp.stage = newStage;
    if (newStage === 'concluidas') opp.status = 'converted';
    else if (newStage === 'descartadas') opp.status = 'dismissed';
    else if (newStage === 'em_atendimento') opp.status = 'analyzing';

    if (assignedUserName) {
      opp.assignedTo = {
        id: 'u-1',
        name: assignedUserName,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      };
    }

    opp.history.push({
      id: `h-${Date.now()}`,
      timestamp: 'Agora há pouco',
      action: `Status alterado para ${newStage.replace('_', ' ')}`,
      author: assignedUserName || 'Enzo Santos',
      type: 'user',
    });

    this.persistState();
    return opp;
  }

  /**
   * Iniciar contato / Assumir no CRM:
   * 1. Atribui a oportunidade ao usuário logado
   * 2. Cria ou localiza o contato no CRM com tag "Radar" / "Oportunidade Radar"
   * 3. Vincula oportunidade ao contato
   * 4. Define estágio como 'em_atendimento'
   * 5. Retorna o JID para abrir a conversa no CRM
   */
  public startContactInCrm(params: {
    opportunityId: string;
    assignedUserName: string;
  }) {
    const opp = this.opportunities.find((o) => o.id === params.opportunityId);
    if (!opp) {
      throw new Error('Oportunidade não encontrada');
    }

    // 1. Assign to user
    opp.assignedTo = {
      id: 'u-1',
      name: params.assignedUserName || 'Enzo Santos',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    };
    opp.stage = 'em_atendimento';
    opp.status = 'analyzing';

    opp.history.push({
      id: `h-${Date.now()}`,
      timestamp: 'Agora há pouco',
      action: `Contato iniciado no CRM por ${params.assignedUserName || 'Enzo Santos'}`,
      author: params.assignedUserName || 'Enzo Santos',
      type: 'user',
    });

    // 2. Set CRM stage and tags
    const targetJid = opp.remoteJid;
    this.contactStages.set(targetJid, 'em_atendimento');

    const currentTags = this.contactTags.get(targetJid) || [];
    if (!currentTags.includes('Radar')) currentTags.push('Radar');
    if (!currentTags.includes('Oportunidade Radar')) currentTags.push('Oportunidade Radar');
    this.contactTags.set(targetJid, currentTags);

    this.addActivity({
      title: 'Lead assumido no CRM',
      subtitle: `${opp.contactName} transferido para atendimento por ${params.assignedUserName || 'Enzo Santos'}`,
      type: 'crm_transferred',
      opportunityId: opp.id,
    });

    this.persistState();

    // Register assumption in Atendimento Engine
    try {
      atendimentoEngine.assumeLead(opp.id, params.assignedUserName || 'Enzo Santos');
    } catch {
      // safe fallback
    }

    return {
      success: true,
      opportunity: opp,
      contactJid: targetJid,
      remoteJid: targetJid,
      stage: 'em_atendimento',
      tags: currentTags,
    };
  }

  public setContactStage(jid: string, stage: string) {
    this.contactStages.set(jid, stage);
    this.persistState();
  }

  public getContactStage(jid: string): string | undefined {
    return this.contactStages.get(jid);
  }

  public getContactTags(jid: string): string[] {
    return this.contactTags.get(jid) || [];
  }
}

export const radarEngine = new RadarEngine();
