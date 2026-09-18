import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  atendimentoService,
  CRMAtendimentoLead,
  InternalNote,
} from '../../services/atendimentoService';
import { crmService } from '../../services/crmService';
import { connectionService } from '../../services/connectionService';
import {
  CRMContact,
  ChatMessage,
  CRMMainViewMode,
  CRMInboxFilter,
  CRMDetailTab,
  CRMStage,
  CRMAssignee,
  CRMTask,
} from '../../types/crm';
import { CrmHeader } from './CrmHeader';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { ContactDetailPanel } from './ContactDetailPanel';
import { PipelineView } from './PipelineView';
import {
  Bot,
  UserCheck,
  Sparkles,
  Zap,
  Sliders,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface CrmAtendimentoViewProps {
  onOpenMobileMenu?: () => void;
  onNavigateToRadar?: () => void;
  onNavigateToConfig?: () => void;
}

const CURRENT_AGENT: CRMAssignee = {
  id: 'usr-enzo',
  name: 'Enzo Santos',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Atendente Comercial',
};

export const CrmAtendimentoView: React.FC<CrmAtendimentoViewProps> = ({
  onOpenMobileMenu,
  onNavigateToRadar,
  onNavigateToConfig,
}) => {
  // Leads from backend atendimento engine (armazenados no arquivo crm_contatos_oportunidades.json)
  const [atendimentoLeads, setAtendimentoLeads] = useState<CRMAtendimentoLead[]>([]);
  // Contatos do CRM de Atendimento
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>(() => {
    return sessionStorage.getItem('nexus_crm_selected_id') || '';
  });
  const selectedContactIdRef = useRef<string>(selectedContactId);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
    if (selectedContactId) {
      sessionStorage.setItem('nexus_crm_selected_id', selectedContactId);
    }
  }, [selectedContactId]);

  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<CRMMainViewMode>('conversas');
  const [inboxFilter, setInboxFilter] = useState<CRMInboxFilter>('conversas');
  const [activeDetailTab, setActiveDetailTab] = useState<CRMDetailTab>('detalhes');
  const [isDesktopDetailsOpen, setIsDesktopDetailsOpen] = useState(true);

  // Atendimento Specific Filters: 'todos_radar' | 'ia_ativa' | 'humano' | 'todos'
  const [atendimentoFilter, setAtendimentoFilter] = useState<'todos_radar' | 'ia_ativa' | 'humano' | 'todos'>('todos_radar');

  // Evolution Instance State
  const [activeInstance, setActiveInstance] = useState<string>('nexus-crm-01');
  const [availableInstances, setAvailableInstances] = useState<
    Array<{ name: string; connectionStatus: string; profileName?: string; contactCount?: number }>
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile View Navigation State: 'list' -> 'chat' -> 'details'
  const [mobileScreen, setMobileScreen] = useState<'list' | 'chat' | 'details'>('list');

  // Modal / Drawer for AI Notes & Internal Logs
  const [showAiNotesModal, setShowAiNotesModal] = useState(false);

  // Load instances on mount
  useEffect(() => {
    let mounted = true;
    const fetchInstances = async () => {
      const res = await connectionService.getInstances();
      if (mounted && res.success && res.instances.length > 0) {
        setAvailableInstances(res.instances);
        const target = connectionService.getSelectedInstance() || res.currentInstance || 'nexus-crm-01';
        setActiveInstance(target);
      }
    };
    fetchInstances();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync Leads and Contacts (estritamente oportunidades com contatos salvos no arquivo JSON)
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Radar Atendimento leads directly from persistent backend storage (crm_contatos_oportunidades.json)
      const leads = await atendimentoService.getLeads();
      setAtendimentoLeads(leads);

      // 2. Map every persistent lead to CRMContact model
      const mappedContacts: CRMContact[] = leads.map((lead) => {
        const lastMsg = lead.messages && lead.messages.length > 0 ? lead.messages[lead.messages.length - 1] : null;
        return {
          id: lead.id,
          remoteJid: lead.contactJid,
          name: lead.contactName || lead.contactPhone || 'Cliente WhatsApp',
          subtitle: lead.demandSummary,
          avatar: lead.contactAvatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
          phone: lead.contactPhone,
          location: 'Vitória - ES',
          segment: 'Oportunidade Comercial',
          typeCategory: 'Atendimento',
          tags: ['Radar IA', lead.recommendedService || 'Oportunidade', lead.aiActiveForContact ? 'IA Ativa 🤖' : 'Humano 👤'],
          score: lead.score,
          status:
            lead.status === 'convertido'
              ? 'concluido'
              : lead.status === 'descartado'
              ? 'descartado'
              : lead.status === 'aberto'
              ? 'novo'
              : 'em_atendimento',
          statusLabel:
            lead.status === 'convertido'
              ? 'Concluído'
              : lead.status === 'descartado'
              ? 'Descartado'
              : lead.status === 'aberto'
              ? 'Novo'
              : 'Em atendimento',
          assignedTo: CURRENT_AGENT,
          originGroup: { id: lead.groupJid, name: lead.groupName },
          detectedAt: new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          originalMessage: { text: lead.originalMessage, time: 'Hoje' },
          identificationReasons: ['Detectado via Radar de Grupos', lead.demandSummary],
          isFavorite: false,
          unreadCount: 0,
          lastMessageTime: lastMsg
            ? lastMsg.timestamp
            : new Date(lead.lastInteractionAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          lastMessageSnippet: lastMsg
            ? lastMsg.content
            : (lead.notes[lead.notes.length - 1]?.text || lead.demandSummary),
          isOnline: true,
          notes: lead.notes.map((n) => ({
            id: n.id,
            contactId: lead.contactJid,
            author: { id: 'usr-agent', name: n.author, avatar: '', role: n.type === 'ai' ? 'IA' : 'Atendente' },
            createdAt: n.timeFormatted,
            timestamp: n.timestamp,
            content: n.text,
          })),
          tasks: [],
          history: [],
        };
      });

      setContacts(mappedContacts);

      // PRESERVAÇÃO ESTRITA DA CONVERSA SELECIONADA:
      // Nunca pula para outra conversa se o usuário já estiver em uma conversa válida!
      setSelectedContactId((current) => {
        const targetId = current || selectedContactIdRef.current || sessionStorage.getItem('nexus_crm_selected_id') || '';
        if (targetId && mappedContacts.some((c) => c.id === targetId || c.remoteJid === targetId)) {
          return targetId;
        }
        const defaultFirst = mappedContacts[0]?.id || '';
        if (defaultFirst) {
          selectedContactIdRef.current = defaultFirst;
          sessionStorage.setItem('nexus_crm_selected_id', defaultFirst);
        }
        return defaultFirst;
      });
    } catch (err) {
      console.error('[CrmAtendimentoView] Erro ao sincronizar dados:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [activeInstance]);

  // Active contact object - robust to either id or remoteJid match
  const activeContact =
    contacts.find((c) => c.id === selectedContactId || c.remoteJid === selectedContactId) ||
    contacts[0];

  // Matching lead object for active contact
  const activeLead = useMemo(() => {
    if (!activeContact) return undefined;
    return atendimentoLeads.find(
      (l) =>
        l.id === activeContact.id ||
        l.contactJid === activeContact.remoteJid ||
        (l.contactPhone && activeContact.phone?.includes(l.contactPhone.replace(/\D/g, '')))
    );
  }, [activeContact, atendimentoLeads]);

  // Load chat messages when activeContact changes
  useEffect(() => {
    if (!activeContact?.remoteJid) return;
    const contactKey = activeContact.id;
    const jid = activeContact.remoteJid;

    let mounted = true;
    crmService.getMessages(jid).then((res) => {
      if (mounted && res.success && res.messages) {
        setChatMessages((prev) => ({
          ...prev,
          [contactKey]: res.messages,
        }));
      }
    });

    return () => {
      mounted = false;
    };
  }, [activeContact?.id, activeContact?.remoteJid]);

  const currentMessages = (activeContact ? chatMessages[activeContact.id] : undefined) || [];

  // Filter contacts based on search and atendimentoFilter
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // 1. Text search
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        (contact.subtitle && contact.subtitle.toLowerCase().includes(query)) ||
        (contact.originGroup?.name && contact.originGroup.name.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // 2. Inbox filter
      if (inboxFilter === 'nao_lidas' && contact.unreadCount === 0) return false;
      if (inboxFilter === 'favoritas' && !contact.isFavorite) return false;

      // 3. Atendimento filter
      const isRadarLead = contact.tags?.includes('Radar IA');
      const leadMatch = atendimentoLeads.find(
        (l) => l.contactJid === contact.remoteJid || (l.contactPhone && contact.phone?.includes(l.contactPhone.replace(/\D/g, '')))
      );

      if (atendimentoFilter === 'todos_radar') {
        return isRadarLead || Boolean(leadMatch);
      }
      if (atendimentoFilter === 'ia_ativa') {
        return leadMatch ? leadMatch.aiActiveForContact : contact.tags?.includes('IA Ativa 🤖');
      }
      if (atendimentoFilter === 'humano') {
        return leadMatch ? !leadMatch.aiActiveForContact : contact.tags?.includes('Humano 👤');
      }

      return true;
    });
  }, [contacts, searchQuery, inboxFilter, atendimentoFilter, atendimentoLeads]);

  // Handle Assume Lead
  const handleAssumeLead = async () => {
    if (!activeLead) return;
    const updated = await atendimentoService.assumeLead(activeLead.id, CURRENT_AGENT.name);
    if (updated) {
      setAtendimentoLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      loadData();
    }
  };

  // Handle Toggle AI for lead
  const handleToggleAi = async (active: boolean) => {
    if (!activeLead) return;
    const updated = await atendimentoService.toggleAi(activeLead.id, active, CURRENT_AGENT.name);
    if (updated) {
      setAtendimentoLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      loadData();
    }
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!activeContact?.remoteJid || !text.trim()) return;

    const jid = activeContact.remoteJid;
    const optimisticMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: activeContact.id,
      senderId: 'agent',
      senderName: 'Enzo Santos',
      isFromLead: false,
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      type: 'text',
      status: 'sent',
    };

    setChatMessages((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), optimisticMsg],
    }));

    try {
      await crmService.sendMessage(jid, text);
      if (activeLead && activeLead.aiActiveForContact) {
        handleAssumeLead();
      }
    } catch (err) {
      console.error('[CrmAtendimentoView] Erro ao enviar mensagem:', err);
    }
  };

  // Status / Stage update
  const handleUpdateStatus = (contactId: string, newStatus: CRMStage) => {
    const stageLabels: Record<CRMStage, string> = {
      novo: 'Novo',
      em_atendimento: 'Em atendimento',
      proposta_enviada: 'Proposta enviada',
      concluido: 'Concluído',
      descartado: 'Descartado',
    };

    const leadStatusMap: Record<CRMStage, string> = {
      novo: 'aberto',
      em_atendimento: 'humano_assumiu',
      proposta_enviada: 'humano_assumiu',
      concluido: 'convertido',
      descartado: 'descartado',
    };

    crmService.updateContactStage(contactId, newStatus).catch(() => {});

    // Sincronizar com o arquivo de contatos e oportunidades
    const matchingLead = atendimentoLeads.find(
      (l) => l.id === contactId || l.contactJid === contactId
    );
    if (matchingLead) {
      atendimentoService
        .updateStatus(matchingLead.id, leadStatusMap[newStatus] || newStatus, CURRENT_AGENT.name)
        .catch(() => {});
    }

    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId || c.remoteJid === contactId) {
          return {
            ...c,
            status: newStatus,
            statusLabel: stageLabels[newStatus],
          };
        }
        return c;
      })
    );
  };

  // Update assignee
  const handleUpdateAssignee = (assignee: CRMAssignee) => {
    if (!activeContact) return;
    setContacts((prev) =>
      prev.map((c) => (c.id === activeContact.id ? { ...c, assignedTo: assignee } : c))
    );
  };

  // Discard contact
  const handleDiscard = () => {
    if (!activeContact) return;
    handleUpdateStatus(activeContact.id, 'descartado');
  };

  // Add note
  const handleAddNote = (content: string) => {
    if (!activeContact) return;
    const newNote = {
      id: `n-${Date.now()}`,
      contactId: activeContact.id,
      author: CURRENT_AGENT,
      createdAt: 'agora',
      timestamp: Date.now(),
      content,
    };
    setContacts((prev) =>
      prev.map((c) => (c.id === activeContact.id ? { ...c, notes: [newNote, ...c.notes] } : c))
    );
  };

  // Tasks
  const handleToggleTask = (taskId: string) => {
    if (!activeContact) return;
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeContact.id
          ? {
              ...c,
              tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
            }
          : c
      )
    );
  };

  const handleAddTask = (task: Omit<CRMTask, 'id' | 'contactId' | 'timestamp'>) => {
    if (!activeContact) return;
    const newTask: CRMTask = {
      id: `t-${Date.now()}`,
      contactId: activeContact.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority || 'Média',
      assignedTo: task.assignedTo,
      completed: false,
      timestamp: Date.now(),
    };
    setContacts((prev) =>
      prev.map((c) => (c.id === activeContact.id ? { ...c, tasks: [newTask, ...c.tasks] } : c))
    );
  };

  // Select contact
  const handleSelectContact = (contact: CRMContact) => {
    setSelectedContactId(contact.id);
    selectedContactIdRef.current = contact.id;
    sessionStorage.setItem('nexus_crm_selected_id', contact.id);
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c))
    );
    setMobileScreen('chat');
  };

  // Format step human description
  const getStepDescription = (step?: string) => {
    switch (step) {
      case 'greeting_sent':
        return 'Passo 1: Saudação enviada ("Boa tarde!")';
      case 'context_sent':
        return 'Passo 2: Contexto do grupo enviado';
      case 'pitch_sent':
        return 'Passo 3: Proposta consultiva enviada';
      case 'in_dialogue':
        return 'Em diálogo consultivo contínuo';
      case 'human_control':
        return 'Atendente humano no controle';
      default:
        return 'Aguardando interação';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8faf9] overflow-hidden">
      {/* 1. Header Bar (Matching CRM with Atendimento Features) */}
      <CrmHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMobileMenu={onOpenMobileMenu}
        instanceName={activeInstance}
        instances={availableInstances}
        onSelectInstance={(name) => {
          setActiveInstance(name);
        }}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Sub-bar with Atendimento Filters & Navigation */}
      <div className="h-11 px-4 lg:px-6 bg-white border-b border-[#eaefec] flex items-center justify-between gap-3 shrink-0 text-xs select-none">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="hidden sm:inline-flex font-bold text-gray-700 items-center gap-1.5 shrink-0">
            <Bot className="w-3.5 h-3.5 text-emerald-600" />
            CRM Atendimento:
          </span>

          <button
            onClick={() => setAtendimentoFilter('todos_radar')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors shrink-0 ${
              atendimentoFilter === 'todos_radar'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Radar IA ({atendimentoLeads.length})
          </button>

          <button
            onClick={() => setAtendimentoFilter('ia_ativa')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors shrink-0 flex items-center gap-1 ${
              atendimentoFilter === 'ia_ativa'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            IA Ativa ({atendimentoLeads.filter((l) => l.aiActiveForContact).length})
          </button>

          <button
            onClick={() => setAtendimentoFilter('humano')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors shrink-0 flex items-center gap-1 ${
              atendimentoFilter === 'humano'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            Humano Assumiu ({atendimentoLeads.filter((l) => !l.aiActiveForContact).length})
          </button>

          <button
            onClick={() => setAtendimentoFilter('todos')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors shrink-0 ${
              atendimentoFilter === 'todos'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos WhatsApp ({contacts.length})
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToConfig && (
            <button
              onClick={onNavigateToConfig}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors"
            >
              <Sliders className="w-3 h-3" />
              <span className="hidden md:inline">Regras da IA</span>
            </button>
          )}

          {onNavigateToRadar && (
            <button
              onClick={onNavigateToRadar}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200 transition-colors"
            >
              <TrendingUp className="w-3 h-3" />
              <span className="hidden md:inline">Ver Radar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Responsive Views */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP LAYOUT (>= lg) */}
        <div className="hidden lg:flex flex-1 h-full overflow-hidden">
          {viewMode === 'conversas' ? (
            <>
              {/* Column 1: Conversation List */}
              <ConversationList
                contacts={filteredContacts}
                allContacts={contacts}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                inboxFilter={inboxFilter}
                onChangeInboxFilter={setInboxFilter}
              />

              {/* Column 2: Chat Window + Top Opportunity Card */}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-white border-r border-[#eaefec]">
                {/* TOP RADAR OPPORTUNITY BANNER */}
                {activeContact && (
                  <div className="bg-gradient-to-r from-emerald-950 via-[#103328] to-[#0c241c] text-white px-4 py-2.5 border-b border-emerald-800/40 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0 select-none">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                            Radar Oportunidade
                          </span>
                          {activeLead && (
                            <span className="text-[10px] bg-emerald-900/90 text-emerald-200 border border-emerald-700/60 font-bold px-1.5 py-0.2 rounded-sm">
                              Score {activeLead.score}%
                            </span>
                          )}
                          <span className="text-[11px] text-emerald-100/70 truncate">
                            🏷️ {activeLead?.groupName || activeContact.originGroup?.name || 'Grupo WhatsApp'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white truncate max-w-lg">
                          🎯 {activeLead?.demandSummary || activeContact.subtitle || 'Demanda comercial detectada'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-black/30 border border-white/10">
                        {activeLead?.aiActiveForContact ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-300">
                              IA Sofia ({getStepDescription(activeLead.conversationStep)})
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-amber-200">👤 Atendimento Humano</span>
                          </>
                        )}
                      </div>

                      {/* Action buttons */}
                      {activeLead && activeLead.aiActiveForContact ? (
                        <button
                          onClick={handleAssumeLead}
                          className="px-2.5 py-1 text-xs font-bold text-gray-900 bg-white hover:bg-gray-100 rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                          Assumir Atendimento
                        </button>
                      ) : activeLead ? (
                        <button
                          onClick={() => handleToggleAi(true)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          Reativar IA Sofia
                        </button>
                      ) : null}

                      {activeLead && (
                        <button
                          onClick={() => setShowAiNotesModal(true)}
                          title="Ver histórico de notas e memórias da IA"
                          className="p-1.5 rounded-md text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat Window Component */}
                {activeContact ? (
                  <ChatWindow
                    contact={activeContact}
                    messages={currentMessages}
                    onSendMessage={handleSendMessage}
                    onToggleFavorite={() => {
                      setContacts((prev) =>
                        prev.map((c) =>
                          c.id === activeContact.id ? { ...c, isFavorite: !c.isFavorite } : c
                        )
                      );
                    }}
                    isDetailsPanelOpen={isDesktopDetailsOpen}
                    onToggleDetailsPanel={() => setIsDesktopDetailsOpen(!isDesktopDetailsOpen)}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageSquare className="w-12 h-12 stroke-[1.5] mb-2" />
                    <p className="text-sm font-medium">Nenhuma conversa selecionada</p>
                  </div>
                )}
              </div>

              {/* Column 3: Contact Detail Panel */}
              {activeContact && isDesktopDetailsOpen && (
                <ContactDetailPanel
                  contact={activeContact}
                  activeTab={activeDetailTab}
                  onChangeTab={setActiveDetailTab}
                  onClose={() => setIsDesktopDetailsOpen(false)}
                  onUpdateStatus={(newStatus) => handleUpdateStatus(activeContact.id, newStatus)}
                  onUpdateAssignee={handleUpdateAssignee}
                  onDiscard={handleDiscard}
                  onAddNote={handleAddNote}
                  onToggleTask={handleToggleTask}
                  onAddTask={handleAddTask}
                />
              )}
            </>
          ) : (
            /* Pipeline View (Desktop) */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-3 bg-white border-b border-[#eaefec] flex items-center justify-between">
                <div className="bg-[#f0f4f1] p-1 rounded-xl flex items-center w-64">
                  <button
                    onClick={() => setViewMode('conversas')}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-[#55695e] hover:text-[#12382c] cursor-pointer"
                  >
                    Conversas
                  </button>
                  <button
                    onClick={() => setViewMode('pipeline')}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-[#12382c] text-white shadow-xs cursor-pointer"
                  >
                    Pipeline
                  </button>
                </div>
              </div>
              <PipelineView
                contacts={filteredContacts}
                onSelectContact={(c) => {
                  handleSelectContact(c);
                  setViewMode('conversas');
                }}
                onUpdateStage={handleUpdateStatus}
              />
            </div>
          )}
        </div>

        {/* MOBILE LAYOUT (< lg): Fluid 1-screen navigation: List -> Chat -> Details */}
        <div className="lg:hidden flex-1 flex flex-col h-full overflow-hidden">
          {viewMode === 'pipeline' ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-3 bg-white border-b border-[#eaefec] flex items-center">
                <div className="bg-[#f0f4f1] p-1 rounded-xl flex items-center w-full">
                  <button
                    onClick={() => setViewMode('conversas')}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-[#55695e] hover:text-[#12382c]"
                  >
                    Conversas
                  </button>
                  <button
                    onClick={() => setViewMode('pipeline')}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-[#12382c] text-white shadow-xs"
                  >
                    Pipeline
                  </button>
                </div>
              </div>
              <PipelineView
                contacts={filteredContacts}
                onSelectContact={(c) => {
                  handleSelectContact(c);
                  setViewMode('conversas');
                }}
                onUpdateStage={handleUpdateStatus}
              />
            </div>
          ) : (
            <>
              {/* Screen 1: Mobile Conversation List */}
              {mobileScreen === 'list' && (
                <ConversationList
                  contacts={filteredContacts}
                  allContacts={contacts}
                  selectedContactId={selectedContactId}
                  onSelectContact={handleSelectContact}
                  viewMode={viewMode}
                  onChangeViewMode={setViewMode}
                  inboxFilter={inboxFilter}
                  onChangeInboxFilter={setInboxFilter}
                />
              )}

              {/* Screen 2: Mobile Chat Window */}
              {mobileScreen === 'chat' && activeContact && (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                  {/* Top Mobile Opportunity Bar */}
                  {activeLead && (
                    <div className="bg-[#12382c] text-white px-3 py-2 text-xs flex items-center justify-between gap-2 border-b border-emerald-800">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-300 uppercase">Radar</span>
                          <span className="text-[10px] bg-emerald-800 text-emerald-100 px-1 rounded">
                            Score {activeLead.score}%
                          </span>
                        </div>
                        <p className="text-[11px] text-white truncate max-w-[200px]">
                          {activeLead.demandSummary}
                        </p>
                      </div>

                      {activeLead.aiActiveForContact ? (
                        <button
                          onClick={handleAssumeLead}
                          className="px-2 py-1 text-[11px] font-bold bg-white text-gray-900 rounded shadow-xs"
                        >
                          Assumir
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleAi(true)}
                          className="px-2 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded shadow-xs"
                        >
                          Reativar IA
                        </button>
                      )}
                    </div>
                  )}

                  <ChatWindow
                    contact={activeContact}
                    messages={currentMessages}
                    onSendMessage={handleSendMessage}
                    onToggleFavorite={() => {
                      setContacts((prev) =>
                        prev.map((c) =>
                          c.id === activeContact.id ? { ...c, isFavorite: !c.isFavorite } : c
                        )
                      );
                    }}
                    onBackMobile={() => setMobileScreen('list')}
                    onOpenDetailsMobile={() => setMobileScreen('details')}
                  />
                </div>
              )}

              {/* Screen 3: Mobile Contact Detail Panel */}
              {mobileScreen === 'details' && activeContact && (
                <ContactDetailPanel
                  contact={activeContact}
                  activeTab={activeDetailTab}
                  onChangeTab={setActiveDetailTab}
                  onClose={() => setMobileScreen('chat')}
                  onUpdateStatus={(newStatus) => handleUpdateStatus(activeContact.id, newStatus)}
                  onUpdateAssignee={handleUpdateAssignee}
                  onDiscard={handleDiscard}
                  onAddNote={handleAddNote}
                  onToggleTask={handleToggleTask}
                  onAddTask={handleAddTask}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Notes & Memories Modal / Drawer */}
      {showAiNotesModal && activeLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Memória & Histórico de IA ({activeLead.contactName})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {getStepDescription(activeLead.conversationStep)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiNotesModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Oportunidade Original */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="font-bold text-emerald-900 block mb-1">
                  📡 Mensagem Captada no Grupo ({activeLead.groupName}):
                </span>
                <p className="text-gray-700 italic bg-white p-2.5 rounded-lg border border-emerald-100">
                  "{activeLead.originalMessage}"
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    Score: {activeLead.score}%
                  </span>
                  <span className="text-[10px] text-gray-600">
                    Demanda: {activeLead.demandSummary}
                  </span>
                </div>
              </div>

              {/* Memórias Coletadas */}
              {activeLead.collectedInfo && Object.keys(activeLead.collectedInfo).length > 0 && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                  <span className="font-bold text-purple-900 block mb-1">
                    🧠 Memórias Extraídas da Conversa:
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(activeLead.collectedInfo).map(([key, val]) => (
                      <div key={key} className="bg-white p-2 rounded-lg border border-purple-100">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">{key}</span>
                        <span className="text-xs text-gray-800 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linha do Tempo de Ações da IA */}
              <div>
                <span className="font-bold text-gray-800 block mb-2">
                  📜 Auditoria de Mensagens & Ações:
                </span>
                <div className="space-y-2">
                  {activeLead.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-xl border ${
                        note.type === 'ai'
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : note.type === 'system'
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                          {note.type === 'ai' && <Bot className="w-3.5 h-3.5 text-emerald-600" />}
                          {note.author}
                        </span>
                        <span className="text-[10px] text-gray-400">{note.timeFormatted}</span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAiNotesModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
