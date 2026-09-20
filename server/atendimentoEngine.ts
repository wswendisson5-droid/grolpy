import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { arePhonesEquivalent, cleanPhoneDigits } from './phoneUtils';

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

export interface AIAgentConfig {
  enabled: boolean; // Auto-atendimento ativado/desativado
  mode: 'auto' | 'copilot'; // 'auto' (envia direto) ou 'copilot' (sugere no chat)
  agentName: string; // ex: "Sofia"
  companyName: string; // ex: "Nexus Digital"
  companyPitch: string; // ex: "Ajudamos empresas a conquistarem mais clientes no digital e serem encontradas no Google"
  // Multi-step human flow
  step1GreetingTemplate: string; // Saudação inicial humana rápida
  step2ContextTemplate: string; // Contextualização do grupo e da demanda
  step3PitchTemplate: string; // Apresentação consultiva da solução
  initialTemplate: string; // Fallback compatível
  followUp1Hours: number; // padrão 2 horas
  followUp1Template: string;
  followUp2Days: number; // padrão 2 dias (48h)
  followUp2Template: string;
  operatingHours: {
    enabled: boolean;
    start: string; // "08:00"
    end: string; // "20:00"
  };
  triggerKeywordsHuman: string[]; // ["humano", "atendente", "falar com pessoa", "preço fechado"]
  saveMemories: boolean; // Guarda informações de atendimento
}

export interface InternalNote {
  id: string;
  timestamp: number;
  timeFormatted: string;
  author: string;
  text: string;
  type: 'ai' | 'human' | 'system' | 'followup';
}

export interface CRMLeadMessage {
  id: string;
  sender: 'agent' | 'client' | 'ai';
  senderName: string;
  text: string;
  timestamp: number;
  time: string;
  status: 'sent' | 'delivered' | 'read' | 'received';
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  mediaUrl?: string;
  mimetype?: string;
}

export interface CRMAtendimentoLead {
  id: string;
  opportunityId: string;
  contactJid: string; // ex: 5527999999999@s.whatsapp.net
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
  aiActiveForContact: boolean; // se a IA está ativa nesta conversa específica
  conversationStep: 'greeting_sent' | 'context_sent' | 'pitch_sent' | 'in_dialogue' | 'human_control';
  assignedTo?: string;
  createdAt: number;
  lastInteractionAt: number;
  firstMessageSentAt?: number;
  followUp1SentAt?: number;
  followUp2SentAt?: number;
  clientReplied: boolean;
  collectedInfo: Record<string, string>; // Informações de atendimento guardadas
  notes: InternalNote[];
  messages: CRMLeadMessage[]; // Histórico completo e persistido da conversa no CRM
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'ai_agent_config.json');
// Arquivo principal e exclusivo de persistência de contatos com oportunidades e conversas
const ATENDIMENTOS_FILE = path.join(DATA_DIR, 'crm_contatos_oportunidades.json');
const LEGACY_ATENDIMENTOS_FILE = path.join(DATA_DIR, 'crm_atendimentos.json');

const DEFAULT_CONFIG: AIAgentConfig = {
  enabled: false,
  mode: 'copilot',
  agentName: 'Sofia',
  companyName: 'Nxs Divulgação',
  companyPitch: 'Ajudamos prestadores de serviço, autônomos e comércios locais a automatizarem suas divulgações em grupos de WhatsApp no piloto automático.',
  step1GreetingTemplate: 'Bom dia!',
  step2ContextTemplate: 'Bom dia! Vi sua mensagem no grupo {grupo} divulgando {demanda}. É você quem cuida dessa parte?',
  step3PitchTemplate: 'Legal! Nós desenvolvemos uma ferramenta que automatiza a divulgação em dezenas de grupos de WhatsApp todos os dias, sem precisar postar manualmente. Você já usa algo automático ou faz tudo na mão?',
  initialTemplate: 'Bom dia!',
  followUp1Hours: 2,
  followUp1Template:
    'Oi, tudo bem?\n\nPassando só para ver se conseguiu dar uma olhada na mensagem anterior. Fico à total disposição para tirar qualquer dúvida!',
  followUp2Days: 2,
  followUp2Template:
    'Olá! Tudo bem?\n\nNão quero ser inconveniente! Esse será meu último contato por aqui. Se ainda fizer sentido automatizar suas postagens nos grupos e atrair mais clientes, me avise por aqui. Um abraço!',
  operatingHours: {
    enabled: true,
    start: '08:00',
    end: '20:00',
  },
  triggerKeywordsHuman: ['humano', 'atendente', 'falar com pessoa', 'suporte humano', 'preço final', 'cancelar', 'suporte'],
  saveMemories: true,
};

export class AtendimentoEngine {
  public config: AIAgentConfig = { ...DEFAULT_CONFIG };
  public atendimentos: CRMAtendimentoLead[] = [];
  private workerTimer: NodeJS.Timeout | null = null;
  private evolutionSender?: (targetJid: string, text: string) => Promise<boolean>;
  private persistenceHandler?: (payload: any) => Promise<void> | void;

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
    this.startFollowUpWorker();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('[AtendimentoEngine] Falha ao carregar config:', e);
    }

    try {
      let loadedData: any = null;
      if (fs.existsSync(ATENDIMENTOS_FILE)) {
        const raw = fs.readFileSync(ATENDIMENTOS_FILE, 'utf-8');
        loadedData = JSON.parse(raw);
      } else if (fs.existsSync(LEGACY_ATENDIMENTOS_FILE)) {
        const raw = fs.readFileSync(LEGACY_ATENDIMENTOS_FILE, 'utf-8');
        loadedData = JSON.parse(raw);
      }

      if (Array.isArray(loadedData)) {
        this.atendimentos = loadedData.map((item: any) => {
          const lead: CRMAtendimentoLead = {
            ...item,
            collectedInfo: item.collectedInfo || {},
            notes: Array.isArray(item.notes) ? item.notes : [],
            messages: Array.isArray(item.messages) ? item.messages : [],
          };

          // Se o lead tiver firstMessageSentAt ou nota de IA, mas messages vazias, recuperar a mensagem inicial
          if (lead.messages.length === 0 && lead.notes.length > 0) {
            const aiInitialNote = lead.notes.find((n) => n.type === 'ai' && n.text.includes('"'));
            if (aiInitialNote) {
              const match = aiInitialNote.text.match(/"([^"]+)"/);
              const initialText = match ? match[1] : 'Bom dia!';
              lead.messages.push({
                id: `msg-ia-recovered-${lead.id}`,
                sender: 'ai',
                senderName: `IA ${this.config.agentName}`,
                text: initialText,
                timestamp: aiInitialNote.timestamp || lead.createdAt,
                time: aiInitialNote.timeFormatted || 'Hoje',
                status: 'delivered',
                type: 'text',
              });
            }
          }

          return lead;
        });

        // Salvar cópia no arquivo canônico
        this.saveToDisk();
      }
    } catch (e) {
      console.warn('[AtendimentoEngine] Falha ao carregar contatos com oportunidades:', e);
    }
  }

  public setPersistenceHandler(handler: (payload: any) => Promise<void> | void) {
    this.persistenceHandler = handler;
  }

  public exportState() {
    return { config: this.config, atendimentos: this.atendimentos };
  }

  public hydrateFromState(state: any) {
    if (!state || typeof state !== 'object') return;
    if (state.config && typeof state.config === 'object') {
      this.config = { ...DEFAULT_CONFIG, ...state.config };
    }
    if (Array.isArray(state.atendimentos)) {
      this.atendimentos = state.atendimentos.map((item: any) => ({
        ...item,
        collectedInfo: item.collectedInfo || {},
        notes: Array.isArray(item.notes) ? item.notes : [],
        messages: Array.isArray(item.messages) ? item.messages : [],
      }));
    }
  }

  public saveToDisk() {
    const payload = this.exportState();
    try {
      this.ensureDataDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
      fs.writeFileSync(ATENDIMENTOS_FILE, JSON.stringify(this.atendimentos, null, 2), 'utf-8');
    } catch (e) {
      console.error('[AtendimentoEngine] Falha ao salvar no disco:', e);
    }
    if (this.persistenceHandler) {
      Promise.resolve(this.persistenceHandler(payload)).catch((e) =>
        console.error('[AtendimentoEngine] Falha ao persistir no banco:', e)
      );
    }
  }

  public setEvolutionSender(sender: (targetJid: string, text: string) => Promise<boolean>) {
    this.evolutionSender = sender;
  }

  public updateConfig(newConfig: Partial<AIAgentConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveToDisk();
    return this.config;
  }

  /**
   * Busca um lead pelo ID, JID ou número de telefone (com correspondência inteligente)
   */
  public findLead(query: string): CRMAtendimentoLead | undefined {
    if (!query) return undefined;
    const cleanQ = cleanPhoneDigits(query);

    return this.atendimentos.find((a) => {
      if (a.id === query || a.opportunityId === query || a.contactJid === query) return true;
      if (cleanQ && (arePhonesEquivalent(a.contactPhone, query) || arePhonesEquivalent(a.contactJid, query))) {
        return true;
      }
      return false;
    });
  }

  /**
   * Verifica se já existe um lead cadastrado com este telefone
   */
  public hasContactPhone(phone: string): boolean {
    if (!phone) return false;
    return this.atendimentos.some((a) => arePhonesEquivalent(a.contactPhone, phone) || arePhonesEquivalent(a.contactJid, phone));
  }

  /**
   * Registrar uma oportunidade captada pelo Radar no CRM de Atendimento
   */
  public registerFromRadar(opportunity: {
    id: string;
    contactName: string;
    contactPhone: string;
    avatar?: string;
    groupName: string;
    groupJid: string;
    remoteJid: string;
    originalMessage: string;
    summary: string;
    recommendedService?: string;
    score: number;
    urgency?: string;
  }): CRMAtendimentoLead {
    // Deduplicação estrita: se já existir lead pelo número, JID ou ID de oportunidade, NÃO recriar
    const existing = this.atendimentos.find(
      (a) =>
        a.opportunityId === opportunity.id ||
        a.contactJid === opportunity.remoteJid ||
        arePhonesEquivalent(a.contactPhone, opportunity.contactPhone) ||
        arePhonesEquivalent(a.contactJid, opportunity.remoteJid)
    );

    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (existing) {
      return existing;
    }

    const newLead: CRMAtendimentoLead = {
      id: `atend-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      opportunityId: opportunity.id,
      contactJid: opportunity.remoteJid,
      contactPhone: opportunity.contactPhone,
      contactName: opportunity.contactName,
      contactAvatar: opportunity.avatar,
      groupName: opportunity.groupName,
      groupJid: opportunity.groupJid,
      originalMessage: opportunity.originalMessage,
      demandSummary: opportunity.summary,
      recommendedService: opportunity.recommendedService || 'Consultoria Digital',
      score: opportunity.score,
      urgency: opportunity.urgency || 'Alta',
      status: this.config.enabled && this.config.mode === 'auto' ? 'ia_em_atendimento' : 'aberto',
      aiActiveForContact: this.config.enabled && this.config.mode === 'auto',
      conversationStep: this.config.enabled && this.config.mode === 'auto' ? 'greeting_sent' : 'human_control',
      assignedTo: this.config.enabled && this.config.mode === 'auto' ? `IA ${this.config.agentName}` : undefined,
      createdAt: now,
      lastInteractionAt: now,
      clientReplied: false,
      collectedInfo: {},
      notes: [
        {
          id: `note-${Date.now()}-1`,
          timestamp: now,
          timeFormatted,
          author: 'Sistema Radar',
          text: `🎯 Oportunidade captada no grupo "${opportunity.groupName}" com Score de ${opportunity.score}%. Demanda: "${opportunity.summary}".`,
          type: 'system',
        },
      ],
      messages: [],
    };

    // Só dispara automaticamente quando a IA estiver habilitada em modo auto.
    // A saudação acompanha o horário local do servidor e não inclui o nome do contato.
    if (this.config.enabled && this.config.mode === 'auto') {
      const currentHour = new Date().getHours();
      let greetingText = 'Bom dia!';
      if (currentHour >= 12 && currentHour < 18) greetingText = 'Boa tarde!';
      else if (currentHour >= 18 || currentHour < 5) greetingText = 'Boa noite!';

      // Só registra como enviada depois de confirmação real da Evolution.
      if (this.evolutionSender) {
        this.evolutionSender(opportunity.remoteJid, greetingText)
          .then((ok) => {
            if (!ok) return;
            const sentAt = Date.now();
            newLead.firstMessageSentAt = sentAt;
            newLead.messages.push({
              id: `msg-ia-initial-${sentAt}`,
              sender: 'ai',
              senderName: `IA ${this.config.agentName}`,
              text: greetingText,
              timestamp: sentAt,
              time: new Date(sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              status: 'delivered',
              type: 'text',
            });
            newLead.notes.push({
              id: `note-${sentAt}-2`,
              timestamp: sentAt,
              timeFormatted: new Date(sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              author: `IA ${this.config.agentName}`,
              text: `🤖 IA ${this.config.agentName} enviou a saudação inicial: "${greetingText}".`,
              type: 'ai',
            });
            this.saveToDisk();
          })
          .catch((err) => console.error('[AtendimentoEngine] Falha ao enviar abordagem inicial:', err));
      } else {
        console.warn('[AtendimentoEngine] Abordagem automática não enviada: Evolution sender indisponível.');
      }
    }

    this.atendimentos.unshift(newLead);
    this.saveToDisk();
    return newLead;
  }

  /**
   * Assumir atendimento manualmente por um humano
   */
  public assumeLead(leadIdOrJid: string, userName: string = 'Enzo Santos') {
    const lead = this.findLead(leadIdOrJid);
    if (!lead) return null;

    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    lead.status = 'humano_assumiu';
    lead.aiActiveForContact = false;
    lead.assignedTo = userName;
    lead.lastInteractionAt = now;

    lead.notes.push({
      id: `note-${Date.now()}`,
      timestamp: now,
      timeFormatted,
      author: userName,
      text: `👤 Atendente ${userName} assumiu o atendimento. As respostas automáticas da IA foram pausadas para este contato.`,
      type: 'human',
    });

    this.saveToDisk();
    return lead;
  }

  /**
   * Alternar estado da IA para um contato específico (pausar ou retomar)
   */
  public toggleAiForContact(leadIdOrJid: string, active: boolean, userName: string = 'Enzo Santos') {
    const lead = this.findLead(leadIdOrJid);
    if (!lead) return null;

    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    lead.aiActiveForContact = active;
    lead.lastInteractionAt = now;
    if (active) {
      lead.status = 'ia_em_atendimento';
      lead.notes.push({
        id: `note-${Date.now()}`,
        timestamp: now,
        timeFormatted,
        author: userName,
        text: `🤖 Atendimento automático da IA reativado para este contato por ${userName}.`,
        type: 'ai',
      });
    } else {
      lead.status = 'humano_assumiu';
      lead.notes.push({
        id: `note-${Date.now()}`,
        timestamp: now,
        timeFormatted,
        author: userName,
        text: `⏸️ Atendimento da IA pausado para este contato por ${userName}.`,
        type: 'human',
      });
    }

    this.saveToDisk();
    return lead;
  }

  /**
   * Registra mensagem enviada manualmente pelo atendente humano no chat do CRM
   */
  public addHumanMessage(leadIdOrJid: string, text: string, senderName: string = 'Enzo Santos'): CRMLeadMessage | null {
    const lead = this.findLead(leadIdOrJid);
    if (!lead) return null;

    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Humano enviou mensagem: pausar IA e marcar status
    lead.aiActiveForContact = false;
    lead.status = 'humano_assumiu';
    lead.assignedTo = senderName;
    lead.lastInteractionAt = now;

    const msg: CRMLeadMessage = {
      id: `msg-human-${Date.now()}`,
      sender: 'agent',
      senderName,
      text,
      timestamp: now,
      time: timeFormatted,
      status: 'sent',
      type: 'text',
    };

    lead.messages.push(msg);
    this.saveToDisk();
    return msg;
  }

  /**
   * Sincroniza mensagens externas da Evolution API sem duplicar
   */
  public syncMessages(leadIdOrJid: string, externalMessages: CRMLeadMessage[]) {
    const lead = this.findLead(leadIdOrJid);
    if (!lead || !Array.isArray(externalMessages)) return;

    let modified = false;
    const existingIds = new Set(lead.messages.map((m) => m.id));

    for (const ext of externalMessages) {
      if (!existingIds.has(ext.id)) {
        // Checar também se não é mensagem idêntica enviada no mesmo timestamp de 3 segundos
        const duplicate = lead.messages.some(
          (m) => Math.abs(m.timestamp - ext.timestamp) < 3000 && m.text.trim() === ext.text.trim()
        );
        if (!duplicate) {
          lead.messages.push(ext);
          existingIds.add(ext.id);
          modified = true;
        }
      }
    }

    if (modified) {
      lead.messages.sort((a, b) => a.timestamp - b.timestamp);
      this.saveToDisk();
    }
  }

  /**
   * Atualiza status/funil da oportunidade no CRM
   */
  public updateLeadStatus(leadIdOrJid: string, newStatus: string, assignedUserName?: string) {
    const lead = this.findLead(leadIdOrJid);
    if (!lead) return null;

    const validStatuses: Array<CRMAtendimentoLead['status']> = [
      'aberto',
      'ia_em_atendimento',
      'humano_assumiu',
      'respondido_cliente',
      'convertido',
      'descartado',
    ];

    if (validStatuses.includes(newStatus as any)) {
      lead.status = newStatus as any;
    }

    if (assignedUserName) {
      lead.assignedTo = assignedUserName;
    }

    lead.lastInteractionAt = Date.now();
    this.saveToDisk();
    return lead;
  }

  /**
   * Notificar que o cliente respondeu no WhatsApp e orquestrar o próximo passo humano da IA
   */
  public async handleIncomingClientMessage(contactJid: string, text: string) {
    const lead = this.findLead(contactJid);
    if (!lead) return;

    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    lead.clientReplied = true;
    lead.lastInteractionAt = now;

    // 1. Salvar a mensagem do cliente no histórico de conversas permanente do CRM
    const clientMsg: CRMLeadMessage = {
      id: `msg-client-${now}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'client',
      senderName: lead.contactName,
      text,
      timestamp: now,
      time: timeFormatted,
      status: 'received',
      type: 'text',
    };
    lead.messages.push(clientMsg);

    // Checar se o cliente pediu atendimento humano
    const textLower = text.toLowerCase();
    const wantsHuman = this.config.triggerKeywordsHuman.some((kw) => textLower.includes(kw));

    if (wantsHuman) {
      lead.aiActiveForContact = false;
      lead.status = 'humano_assumiu';
      lead.conversationStep = 'human_control';
      lead.notes.push({
        id: `note-${Date.now()}`,
        timestamp: now,
        timeFormatted,
        author: 'Sistema',
        text: `🚨 O cliente solicitou atendimento humano ("${safeUnicodeTruncate(text, 60)}"). IA pausada imediatamente para atendimento manual.`,
        type: 'system',
      });
      this.saveToDisk();
      return;
    }

    // Registrar nota da mensagem do cliente
    lead.notes.push({
      id: `note-${Date.now()}`,
      timestamp: now,
      timeFormatted,
      author: lead.contactName,
      text: `💬 Cliente respondeu no WhatsApp: "${safeUnicodeTruncate(text, 140)}".`,
      type: 'system',
    });

    // Se o atendimento da IA estiver ativo, gerar resposta contextual analisando TODO o histórico
    if (this.config.enabled && lead.aiActiveForContact && this.config.mode === 'auto') {
      lead.status = 'ia_em_atendimento';
      lead.conversationStep = 'in_dialogue';
      await this.generateContextualAiReply(lead, text);
    } else {
      lead.status = 'respondido_cliente';
    }

    this.saveToDisk();
  }

  /**
   * Revisa TODO o histórico da conversa e gera a resposta contextual mais humana e adequada
   */
  private async generateContextualAiReply(lead: CRMAtendimentoLead, latestMessage: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Verificar se já sabemos o nome real do cliente ou se ainda é genérico
    const knownName = (
      lead.collectedInfo['nome'] ||
      (lead.contactName &&
      !lead.contactName.toLowerCase().includes('contato') &&
      !lead.contactName.includes('55') &&
      !lead.contactName.toLowerCase().includes('amigo')
        ? lead.contactName
        : '')
    ).trim();

    // Montar o histórico cronológico completo de mensagens trocadas
    const messagesHistory = lead.messages
      .map((m) => {
        const sender = m.sender === 'client' ? (knownName || 'Cliente') : `IA (${this.config.agentName})`;
        return `[${sender}]: "${m.text}"`;
      })
      .join('\n');

    let replyText = '';
    let detectedName = '';
    let extractedMemories: Record<string, string> = {};

    if (apiKey) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Você é ${this.config.agentName}, uma consultora comercial amigável, educada e muito humana da empresa "${this.config.companyName}".
Proposta da empresa: "${this.config.companyPitch}".

OBJETIVO DA PROSPECÇÃO:
Oferecer nossa FERRAMENTA DE DIVULGAÇÃO AUTOMÁTICA EM GRUPOS DE WHATSAPP para pessoas que estão divulgando produtos, serviços ou negócios manualmente nos grupos.

CONTEXTO DO CONTATO:
- Grupo do WhatsApp onde o contato foi captado: "${lead.groupName}"
- Mensagem original postada no grupo: "${lead.originalMessage}"
- O que ele divulga / Atividade: "${lead.demandSummary}"
- Solução oferecida: "${lead.recommendedService}"
- Nome já conhecido do cliente: ${knownName ? `"${knownName}"` : 'AINDA NÃO INFORMADO'}
- Informações já memorizadas do atendimento: ${JSON.stringify(lead.collectedInfo)}

HISTÓRICO COMPLETO DA CONVERSA NO WHATSAPP (EM ORDEM CRONOLÓGICA):
${messagesHistory}

ÚLTIMA MENSAGEM DO CLIENTE:
"${latestMessage}"

FLUXO DA CONVERSA (ADAPTE AO CONTEXTO REAL):
1. Se for a primeira resposta após a saudação inicial ("Bom dia, tudo bem?", "Quem é?", "Em que posso ajudar?"):
   - Dê contexto e confirme se a pessoa é a responsável pelo serviço/negócio:
   - Exemplo: "Bom dia! Vi sua mensagem no grupo ${lead.groupName} divulgando ${lead.demandSummary}. É você quem cuida dessa parte?"
2. Se a pessoa confirmar que é ela quem cuida / é a responsável ("Sim", "Sou eu", "Sim, eu mesmo", "Trabalho com isso"):
   - Apresente a nossa solução de divulgação automática em grupos:
   - Exemplo: "Legal! Nós desenvolvemos uma ferramenta que automatiza a divulgação em dezenas de grupos de WhatsApp todos os dias, sem você precisar ficar postando um por um manualmente. Você já usa algo automático ou faz as divulgações na mão?"
3. Se a pessoa demonstrar interesse ("Como funciona?", "Quero saber mais", "Faço na mão", "Pode mandar"):
   - Ofereça uma demonstração prática ou vídeo rápido:
   - Exemplo: "Show! Quer que eu te envie uma demonstração rápida de 2 minutinhos mostrando a ferramenta postando no piloto automático?"
4. Se perguntar sobre preço ou investimento:
   - Explique de forma simples e acessível, e pergunte se gostaria de ver a demonstração funcionando.
5. Se for dúvida complexa, suporte técnico ou pedir humano:
   - Indique que vai transferir para um especialista da equipe humana continuar.
6. DIRETRIZES GERAIS:
   - Mantenha respostas curtas (1 a 2 frases), naturais e conversacionais, como alguém digitando no WhatsApp.
   - NUNCA repita perguntas que a pessoa já respondeu.
   - NUNCA soe como um robô com menu de opções.

Retorne EXCLUSIVAMENTE um JSON no seguinte formato:
{
  "replyText": "texto curto da sua resposta",
  "detectedName": "nome do contato caso ele tenha acabado de se apresentar ou dizer seu nome, ou vazio se não",
  "extractedMemories": {
    "chave": "valor extraído de interesse, nicho, se é responsável ou confirmação"
  },
  "needsHumanTransfer": false
}`;

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text);
            if (parsed.replyText && parsed.replyText.trim()) {
              replyText = parsed.replyText.trim();
              if (parsed.detectedName && typeof parsed.detectedName === 'string' && parsed.detectedName.trim()) {
                detectedName = parsed.detectedName.trim();
              }
              if (parsed.extractedMemories && typeof parsed.extractedMemories === 'object') {
                extractedMemories = parsed.extractedMemories;
              }
              if (parsed.needsHumanTransfer === true) {
                lead.aiActiveForContact = false;
                lead.status = 'humano_assumiu';
                lead.conversationStep = 'human_control';
                lead.notes.push({
                  id: `note-${Date.now()}`,
                  timestamp: now,
                  timeFormatted,
                  author: 'IA ' + this.config.agentName,
                  text: `🚨 IA identificou necessidade de suporte/negociação humana e transferiu o atendimento.`,
                  type: 'system',
                });
              }
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[AtendimentoEngine] Falha no modelo ${model}:`, err?.message || err);
        }
      }
    }

    // Se Gemini não gerou resposta (sem API key ou limite excedido), usar fallback determinístico contextual
    if (!replyText) {
      const fallbackResult = this.generateDeterministicContextualReply(lead, latestMessage, knownName);
      replyText = fallbackResult.replyText;
      if (fallbackResult.detectedName) detectedName = fallbackResult.detectedName;
      if (fallbackResult.extractedMemories) extractedMemories = fallbackResult.extractedMemories;
    }

    // Atualizar nome do cliente se identificado
    if (detectedName) {
      lead.contactName = detectedName;
      lead.collectedInfo['nome'] = detectedName;
    }

    // Atualizar memórias
    if (this.config.saveMemories && Object.keys(extractedMemories).length > 0) {
      lead.collectedInfo = { ...lead.collectedInfo, ...extractedMemories };
    }

    // Registrar nota de atendimento
    lead.notes.push({
      id: `note-${Date.now()}`,
      timestamp: now,
      timeFormatted,
      author: `IA ${this.config.agentName}`,
      text: `🤖 IA ${this.config.agentName} analisou o contexto e respondeu:\n\n"${replyText}"`,
      type: 'ai',
    });

    const aiMsg: CRMLeadMessage = {
      id: `msg-ia-dialogue-${now}`,
      sender: 'ai',
      senderName: `IA ${this.config.agentName}`,
      text: replyText,
      timestamp: now,
      time: timeFormatted,
      status: 'sent',
      type: 'text',
    };
    lead.messages.push(aiMsg);

    if (this.evolutionSender) {
      try {
        await this.evolutionSender(lead.contactJid, replyText);
        aiMsg.status = 'delivered';
      } catch (err) {
        console.error('[AtendimentoEngine] Falha ao enviar resposta contextual:', err);
      }
    }
  }

  /**
   * Fallback determinístico contextual altamente inteligente
   * Fluxo: Saudação → Contexto / Confirmação do Responsável → Apresentação da Solução (Divulgação Automática) → Demo → Suporte
   */
  private generateDeterministicContextualReply(
    lead: CRMAtendimentoLead,
    latestMessage: string,
    currentKnownName: string
  ): { replyText: string; detectedName?: string; extractedMemories?: Record<string, string> } {
    const textLower = latestMessage.toLowerCase().trim();
    const extractedMemories: Record<string, string> = {};
    let detectedName = currentKnownName;

    // 1. Tentar detectar se a pessoa informou o nome na mensagem
    const nameMatch = latestMessage.match(
      /(?:me chamo|sou o|sou a|aqui é o|aqui é a|meu nome é|pode me chamar de)\s+([a-zA-ZÀ-ÿ]{2,20})/i
    );
    if (nameMatch && nameMatch[1]) {
      detectedName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
      extractedMemories['nome'] = detectedName;
    }

    // Contar quantas mensagens o cliente já enviou nesta conversa
    const clientMessagesCount = lead.messages.filter((m) => m.sender === 'client').length;
    const hasAskedResponsibleBefore = lead.messages.some(
      (m) =>
        m.sender === 'ai' &&
        (m.text.toLowerCase().includes('é você quem cuida') || m.text.toLowerCase().includes('responsável'))
    );
    const hasPitchedBefore = lead.messages.some(
      (m) =>
        m.sender === 'ai' &&
        (m.text.toLowerCase().includes('divulgação automática') ||
          m.text.toLowerCase().includes('automatiza') ||
          m.text.toLowerCase().includes('ferramenta'))
    );

    // FLUXO ETAPA 1: Primeira resposta do cliente
    if (clientMessagesCount <= 1 && !hasAskedResponsibleBefore) {
      const nameGreeting = detectedName ? `, ${detectedName}` : '';
      return {
        replyText: `Bom dia${nameGreeting}! Vi sua mensagem no grupo ${lead.groupName} divulgando ${lead.demandSummary}. É você quem cuida dessa parte?`,
        detectedName,
        extractedMemories,
      };
    }

    // FLUXO ETAPA 2: Confirmação de responsável (se respondeu que sim ou se apresentou)
    if (
      hasAskedResponsibleBefore &&
      !hasPitchedBefore &&
      (textLower.includes('sim') ||
        textLower.includes('sou eu') ||
        textLower.includes('eu mesmo') ||
        textLower.includes('isso') ||
        textLower.includes('faço') ||
        textLower.includes('trabalho') ||
        textLower.includes('opa') ||
        textLower.includes('sou'))
    ) {
      extractedMemories['responsavel'] = 'sim';
      const namePrefix = detectedName ? `${detectedName}, ` : '';
      return {
        replyText: `Legal! ${namePrefix}nós temos uma ferramenta que automatiza a divulgação dos seus anúncios em vários grupos de WhatsApp todos os dias, sem você precisar ficar postando manualmente um por um. Você já usa algo automático ou divulga tudo na mão?`,
        detectedName,
        extractedMemories,
      };
    }

    // FLUXO ETAPA 3: Dúvidas sobre preço / investimento
    if (
      textLower.includes('preço') ||
      textLower.includes('preco') ||
      textLower.includes('quanto custa') ||
      textLower.includes('valor') ||
      textLower.includes('tabela') ||
      textLower.includes('orçamento') ||
      textLower.includes('orcamento')
    ) {
      extractedMemories['duvida_preco'] = 'true';
      return {
        replyText:
          'Os planos são bem acessíveis e cabem no bolso de qualquer autônomo ou comércio. Posso te mandar uma demonstração rápida de 2 minutinhos mostrando a ferramenta funcionando no piloto automático?',
        detectedName,
        extractedMemories,
      };
    }

    // FLUXO ETAPA 4: Cliente diz que faz na mão ou não tem automação
    if (
      textLower.includes('na mão') ||
      textLower.includes('na mao') ||
      textLower.includes('manual') ||
      textLower.includes('não uso') ||
      textLower.includes('nao uso') ||
      textLower.includes('ainda não') ||
      textLower.includes('ainda nao')
    ) {
      extractedMemories['modo_divulgacao'] = 'manual';
      return {
        replyText:
          'Postar em grupo por grupo consome muito tempo mesmo! Nossa ferramenta poupa horas do seu dia e mantém seus anúncios rodando sempre. Quer ver uma demonstração rápida de como funciona?',
        detectedName,
        extractedMemories,
      };
    }

    // FLUXO ETAPA 5: Cliente demonstra interesse em saber mais ou ver demonstração
    if (
      textLower.includes('sim') ||
      textLower.includes('pode mandar') ||
      textLower.includes('quero') ||
      textLower.includes('manda aí') ||
      textLower.includes('manda ai') ||
      textLower.includes('como funciona') ||
      textLower.includes('como é') ||
      textLower.includes('com certeza') ||
      textLower.includes('pode ser')
    ) {
      extractedMemories['interesse'] = 'alto';
      return {
        replyText:
          'Show de bola! Você prefere que eu te envie o vídeo demonstrativo por aqui ou prefere que um especialista da equipe te chame para tirar dúvidas?',
        detectedName,
        extractedMemories,
      };
    }

    // FLUXO ETAPA 6: Cliente já usa outra ferramenta
    if (
      textLower.includes('já uso') ||
      textLower.includes('ja uso') ||
      textLower.includes('já tenho') ||
      textLower.includes('ja tenho')
    ) {
      extractedMemories['ja_tem_ferramenta'] = 'sim';
      return {
        replyText:
          'Que ótimo! E a sua ferramenta atual tem proteção contra bloqueios e suporte direto no WhatsApp? Nossa plataforma é 100% atualizada.',
        detectedName,
        extractedMemories,
      };
    }

    // Resposta padrão contextual de condução
    const namePrefix = detectedName ? `${detectedName}, ` : '';
    return {
      replyText: `Perfeito! ${namePrefix}quer que eu te envie uma demonstração prática de como a ferramenta automatiza seus anúncios nos grupos de WhatsApp?`,
      detectedName,
      extractedMemories,
    };
  }

  /**
   * Régua de Follow-up em Segundo Plano:
   * 1. Follow-up 1 após X horas se cliente não respondeu
   * 2. Follow-up 2 após Y dias se ainda não respondeu
   */
  private startFollowUpWorker() {
    if (this.workerTimer) clearInterval(this.workerTimer);

    this.workerTimer = setInterval(() => {
      this.checkFollowUps();
    }, 45000); // verifica a cada 45 segundos
  }

  private async checkFollowUps() {
    if (!this.config.enabled || this.config.mode !== 'auto' || !this.evolutionSender) return;

    const now = Date.now();
    const f1ThresholdMs = (this.config.followUp1Hours || 2) * 60 * 60 * 1000;
    const f2ThresholdMs = (this.config.followUp2Days || 2) * 24 * 60 * 60 * 1000;

    for (const lead of this.atendimentos) {
      // Se cliente já respondeu ou IA não está ativa para o lead, não mandar follow-up
      if (lead.clientReplied || !lead.aiActiveForContact || lead.status === 'convertido' || lead.status === 'descartado') {
        continue;
      }

      if (!lead.firstMessageSentAt) continue;

      const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Follow-up 1 check
      if (!lead.followUp1SentAt && now - lead.firstMessageSentAt >= f1ThresholdMs) {
        const text = this.interpolateTemplate(this.config.followUp1Template, {
          nome: lead.contactName.split(' ')[0] || 'amigo(a)',
          grupo: lead.groupName,
          demanda: lead.demandSummary,
        });

        lead.followUp1SentAt = now;
        lead.lastInteractionAt = now;
        lead.notes.push({
          id: `note-${Date.now()}`,
          timestamp: now,
          timeFormatted,
          author: `IA ${this.config.agentName}`,
          text: `⏱️ 1º Follow-up automático enviado após ${this.config.followUp1Hours}h sem resposta:\n\n"${text}"`,
          type: 'followup',
        });

        lead.messages.push({
          id: `msg-ia-followup1-${now}`,
          sender: 'ai',
          senderName: `IA ${this.config.agentName}`,
          text,
          timestamp: now,
          time: timeFormatted,
          status: 'sent',
          type: 'text',
        });

        try {
          await this.evolutionSender(lead.contactJid, text);
        } catch (err) {
          console.error('[AtendimentoEngine] Falha ao enviar follow-up 1:', err);
        }
        this.saveToDisk();
        continue;
      }

      // Follow-up 2 check (último follow-up após 2 dias)
      if (lead.followUp1SentAt && !lead.followUp2SentAt && now - lead.followUp1SentAt >= f2ThresholdMs) {
        const text = this.interpolateTemplate(this.config.followUp2Template, {
          nome: lead.contactName.split(' ')[0] || 'amigo(a)',
          grupo: lead.groupName,
          demanda: lead.demandSummary,
        });

        lead.followUp2SentAt = now;
        lead.lastInteractionAt = now;
        lead.notes.push({
          id: `note-${Date.now()}`,
          timestamp: now,
          timeFormatted,
          author: `IA ${this.config.agentName}`,
          text: `🏁 2º e último Follow-up automático enviado após ${this.config.followUp2Days} dias sem resposta:\n\n"${text}"`,
          type: 'followup',
        });

        lead.messages.push({
          id: `msg-ia-followup2-${now}`,
          sender: 'ai',
          senderName: `IA ${this.config.agentName}`,
          text,
          timestamp: now,
          time: timeFormatted,
          status: 'sent',
          type: 'text',
        });

        try {
          await this.evolutionSender(lead.contactJid, text);
        } catch (err) {
          console.error('[AtendimentoEngine] Falha ao enviar follow-up 2:', err);
        }
        this.saveToDisk();
      }
    }
  }

  private interpolateTemplate(template: string, vars: { nome: string; grupo: string; demanda: string }): string {
    return template
      .replace(/{nome}/g, vars.nome)
      .replace(/{grupo}/g, vars.grupo)
      .replace(/{demanda}/g, vars.demanda);
  }
}

export const atendimentoEngine = new AtendimentoEngine();
