import React, { useState, useEffect } from 'react';
import {
  CRMContact,
  CRMMainViewMode,
  CRMInboxFilter,
  CRMDetailTab,
  CRMStage,
  CRMAssignee,
  CRMTask,
  ChatMessage,
} from '../../types/crm';
import { CURRENT_AGENT } from '../../data/crmMockData';
import { crmService } from '../../services/crmService';
import { connectionService } from '../../services/connectionService';
import { evolutionService } from '../../services/evolutionService';
import { CrmHeader } from './CrmHeader';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { ContactDetailPanel } from './ContactDetailPanel';
import { PipelineView } from './PipelineView';
import { HugeIcon, WhatsappIcon } from '../icons/HugeIcon';

interface CrmViewProps {
  onOpenMobileMenu?: () => void;
  onNavigateToConnection?: () => void;
}

export const CrmView: React.FC<CrmViewProps> = ({ onOpenMobileMenu, onNavigateToConnection }) => {
  // 1. Core State: Starts empty waiting for real WhatsApp data
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<CRMMainViewMode>('conversas');
  const [inboxFilter, setInboxFilter] = useState<CRMInboxFilter>('conversas');
  const [activeDetailTab, setActiveDetailTab] = useState<CRMDetailTab>('detalhes');
  const [isDesktopDetailsOpen, setIsDesktopDetailsOpen] = useState(true);

  // Evolution Instance State: defaults to configured or active instance
  const [activeInstance, setActiveInstance] = useState<string>('nexus-crm-01');
  const [availableInstances, setAvailableInstances] = useState<
    Array<{ name: string; connectionStatus: string; profileName?: string; contactCount?: number }>
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile View Navigation State: 'list' -> 'chat' -> 'details'
  const [mobileScreen, setMobileScreen] = useState<'list' | 'chat' | 'details'>('list');

  // Load instances on mount
  useEffect(() => {
    let mounted = true;
    const fetchInstances = async () => {
      const res = await connectionService.getInstances();
      if (mounted && res.success && res.instances.length > 0) {
        setAvailableInstances(res.instances);
        const target = connectionService.getSelectedInstance() || res.currentInstance || 'nexus-crm-01';
        setActiveInstance(target);
        loadRealContacts(target);
      }
    };
    fetchInstances();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch real contacts from Evolution API
  const loadRealContacts = async (targetInstance?: string) => {
    setIsRefreshing(true);
    const inst = targetInstance || activeInstance;
    try {
      const res = await crmService.getContacts(inst);
      if (res.success && res.contacts) {
        setContacts(res.contacts);
        if (res.instanceName && res.instanceName !== activeInstance) {
          setActiveInstance(res.instanceName);
        }
        if (res.contacts.length > 0) {
          const directChats = res.contacts.filter((c: any) => !c.isGroup && !c.remoteJid?.includes('@g.us'));
          const targetPool = directChats.length > 0 ? directChats : res.contacts;
          if (!selectedContactId || !res.contacts.some((c) => c.id === selectedContactId)) {
            setSelectedContactId(targetPool[0].id);
          }
        } else {
          setSelectedContactId('');
        }
      } else {
        setContacts([]);
        setSelectedContactId('');
      }
    } catch {
      setContacts([]);
      setSelectedContactId('');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial contacts load and whenever activeInstance changes
  useEffect(() => {
    loadRealContacts(activeInstance);
  }, [activeInstance]);

  // Active contact object
  const activeContact =
    contacts.find((c) => c.id === selectedContactId) || contacts[0];

  // Active messages list
  const currentMessages = (activeContact ? chatMessages[activeContact.id] : undefined) || [];

  // Helper: Deduplicate chat messages by ID and reconcile temporary outbound messages
  const deduplicateMessages = (existing: ChatMessage[] = [], incoming: ChatMessage[] = []): ChatMessage[] => {
    const map = new Map<string, ChatMessage>();

    for (const m of existing) {
      if (m.id) map.set(m.id, m);
    }

    for (const m of incoming) {
      if (!m.id) continue;

      // Reconcile optimistic/temporary outbound messages with confirmed ones
      for (const [key, item] of map.entries()) {
        if (
          key.startsWith('msg-') &&
          !item.isFromLead &&
          !m.isFromLead &&
          item.text === m.text
        ) {
          map.delete(key);
          break;
        }
      }

      map.set(m.id, m);
    }

    return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  };

  // Load real messages when active contact changes
  useEffect(() => {
    if (!activeContact?.remoteJid) return;

    let isMounted = true;
    const loadMessages = async () => {
      const res = await crmService.getMessages(activeContact.remoteJid, activeInstance);
      if (isMounted && res.success && res.messages.length > 0) {
        setChatMessages((prev) => {
          const current = prev[activeContact.id] || [];
          return {
            ...prev,
            [activeContact.id]: deduplicateMessages(current, res.messages),
          };
        });
      }
    };

    loadMessages();

    // Poll messages every 8 seconds for active conversation
    const interval = setInterval(loadMessages, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeContact?.remoteJid, activeInstance]);

  // Filter contacts by search and inbox filter
  const filteredContacts = contacts.filter((c) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        c.name.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.lastMessageSnippet.toLowerCase().includes(q) ||
        c.phone.includes(q);
      if (!match) return false;
    }

    // Inbox tab filter: todos | conversas | grupos | nao_lidos
    if (inboxFilter === 'conversas') {
      return !c.isGroup && !c.remoteJid?.includes('@g.us');
    }
    if (inboxFilter === 'grupos') {
      return Boolean(c.isGroup || c.remoteJid?.includes('@g.us'));
    }
    if (inboxFilter === 'nao_lidos') {
      return c.unreadCount > 0;
    }
    return true;
  });

  // Listen to live Evolution events
  useEffect(() => {
    const unsubMsg = evolutionService.onMessageReceived((msg) => {
      setChatMessages((prev) => {
        const key = msg.conversationId;
        const current = prev[key] || [];
        if (current.some((m) => m.id === msg.id)) {
          return prev;
        }
        return {
          ...prev,
          [key]: deduplicateMessages(current, [msg]),
        };
      });
    });

    const unsubStatus = evolutionService.onMessageStatusChanged((update) => {
      setChatMessages((prev) => {
        const next: Record<string, ChatMessage[]> = { ...prev };
        for (const [convId, list] of Object.entries(next) as [string, ChatMessage[]][]) {
          const idx = list.findIndex((m) => m.id === update.messageId);
          if (idx !== -1) {
            const updated = [...list];
            updated[idx] = { ...updated[idx], status: update.status };
            next[convId] = updated;
          }
        }
        return next;
      });
    });

    return () => {
      unsubMsg();
      unsubStatus();
    };
  }, []);

  // Handle Send Message
  const handleSendMessage = async (
    text: string,
    type: 'text' | 'image' | 'audio' | 'document' = 'text',
    mediaUrl?: string,
    fileName?: string
  ) => {
    if (!activeContact) return;

    // Try sending real message via Evolution API proxy first
    const sendResult = await crmService.sendMessage(
      activeContact.remoteJid,
      text,
      activeInstance
    );

    let newMsg: ChatMessage;
    if (sendResult.success && sendResult.message) {
      newMsg = sendResult.message;
    } else {
      // Fallback
      newMsg = await evolutionService.sendMessage({
        contactId: activeContact.id,
        remoteJid: activeContact.remoteJid,
        text,
        type,
        mediaUrl,
        fileName,
      });
    }

    // Append to local state with deduplication
    setChatMessages((prev) => {
      const current = prev[activeContact.id] || [];
      return {
        ...prev,
        [activeContact.id]: deduplicateMessages(current, [newMsg]),
      };
    });

    // Update last message snippet & time on contact
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === activeContact.id) {
          return {
            ...c,
            lastMessageTime: newMsg.time,
            lastMessageSnippet: text || (type === 'image' ? '[Foto]' : type === 'audio' ? '[Áudio]' : '[Documento]'),
            unreadCount: 0,
          };
        }
        return c;
      })
    );
  };

  // Select contact
  const handleSelectContact = (contact: CRMContact) => {
    setSelectedContactId(contact.id);
    // Mark as read
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c))
    );
    // On mobile, navigate to chat
    setMobileScreen('chat');
  };

  // Toggle favorite
  const handleToggleFavorite = () => {
    if (!activeContact) return;
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeContact.id ? { ...c, isFavorite: !c.isFavorite } : c
      )
    );
  };

  // Update Status / Stage
  const handleUpdateStatus = (contactId: string, newStatus: CRMStage) => {
    const stageLabels: Record<CRMStage, string> = {
      novo: 'Novo contato',
      em_atendimento: 'Em atendimento',
      interessado: 'Interessado',
      proposta_enviada: 'Planos enviados',
      follow_up: 'Follow-up',
      assinatura_concluida: 'Assinatura concluída',
      concluido: 'Concluído',
      sem_retorno: 'Sem retorno',
      cancelado: 'Cancelado',
      descartado: 'Descartado',
    };

    // Persist to backend and radarEngine
    crmService.updateContactStage(contactId, newStatus).catch(() => {});

    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          const newHistoryItem = {
            id: `h-${Date.now()}`,
            contactId,
            title: 'Etapa alterada',
            subtitle: `De ${c.statusLabel} → ${stageLabels[newStatus]}`,
            timestamp: new Date().toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            type: 'stage_changed' as const,
          };

          return {
            ...c,
            status: newStatus,
            statusLabel: stageLabels[newStatus],
            history: [newHistoryItem, ...c.history],
          };
        }
        return c;
      })
    );
  };

  // Update Assignee
  const handleUpdateAssignee = (assignee: CRMAssignee) => {
    if (!activeContact) return;
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === activeContact.id) {
          const newHistoryItem = {
            id: `h-${Date.now()}`,
            contactId: c.id,
            title: `Atribuído para ${assignee.name}`,
            timestamp: new Date().toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            type: 'assigned' as const,
          };

          return {
            ...c,
            assignedTo: assignee,
            history: [newHistoryItem, ...c.history],
          };
        }
        return c;
      })
    );
  };

  // Discard Contact
  const handleDiscard = () => {
    if (!activeContact) return;
    handleUpdateStatus(activeContact.id, 'descartado');
  };

  // Add Note
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

    const newHistoryItem = {
      id: `h-${Date.now()}`,
      contactId: activeContact.id,
      title: 'Nota adicionada',
      subtitle: `“${content.substring(0, 40)}...”`,
      timestamp: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: 'note_added' as const,
    };

    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === activeContact.id) {
          return {
            ...c,
            notes: [newNote, ...c.notes],
            history: [newHistoryItem, ...c.history],
          };
        }
        return c;
      })
    );
  };

  // Toggle Task
  const handleToggleTask = (taskId: string) => {
    if (!activeContact) return;
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === activeContact.id) {
          return {
            ...c,
            tasks: c.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    completed: !t.completed,
                    completedAt: !t.completed
                      ? new Date().toLocaleDateString('pt-BR')
                      : undefined,
                  }
                : t
            ),
          };
        }
        return c;
      })
    );
  };

  // Add Task
  const handleAddTask = (
    taskData: Omit<CRMTask, 'id' | 'contactId' | 'timestamp'>
  ) => {
    if (!activeContact) return;

    const newTask: CRMTask = {
      ...taskData,
      id: `t-${Date.now()}`,
      contactId: activeContact.id,
      timestamp: Date.now(),
    };

    const newHistoryItem = {
      id: `h-${Date.now()}`,
      contactId: activeContact.id,
      title: 'Tarefa criada',
      subtitle: taskData.title,
      timestamp: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: 'task_created' as const,
    };

    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === activeContact.id) {
          return {
            ...c,
            tasks: [newTask, ...c.tasks],
            history: [newHistoryItem, ...c.history],
          };
        }
        return c;
      })
    );
  };

  // Change inbox filter and ensure active contact is aligned
  const handleInboxFilterChange = (newFilter: CRMInboxFilter) => {
    setInboxFilter(newFilter);
    const pool = contacts.filter((c) => {
      if (newFilter === 'conversas') return !c.isGroup && !c.remoteJid?.includes('@g.us');
      if (newFilter === 'grupos') return Boolean(c.isGroup || c.remoteJid?.includes('@g.us'));
      if (newFilter === 'nao_lidos') return c.unreadCount > 0;
      return true;
    });
    if (pool.length > 0 && !pool.some((c) => c.id === selectedContactId)) {
      setSelectedContactId(pool[0].id);
    }
  };

  return (
    <div
      id="crm-main-container"
      className="flex-1 flex flex-col h-screen overflow-hidden bg-white"
    >
      {/* 1. Global Header Bar */}
      <CrmHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMobileMenu={onOpenMobileMenu}
        instanceName={activeInstance}
        instances={availableInstances}
        onSelectInstance={(name) => {
          setActiveInstance(name);
          connectionService.selectInstance(name);
          loadRealContacts(name);
        }}
        onRefresh={() => loadRealContacts(activeInstance)}
        isRefreshing={isRefreshing}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* DESKTOP LAYOUT (lg and above): Always 3 columns (or 2 when details collapsed) */}
        <div className="hidden lg:flex flex-1 h-full overflow-hidden">
          {viewMode === 'conversas' ? (
            <>
              {/* Column 1: Conversations List */}
              <ConversationList
                contacts={filteredContacts}
                allContacts={contacts}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                inboxFilter={inboxFilter}
                onChangeInboxFilter={handleInboxFilterChange}
              />

              {/* Column 2: Chat Window */}
              {activeContact ? (
                <ChatWindow
                  contact={activeContact}
                  messages={currentMessages}
                  onSendMessage={handleSendMessage}
                  onToggleFavorite={handleToggleFavorite}
                  isDetailsPanelOpen={isDesktopDetailsOpen}
                  onToggleDetailsPanel={() =>
                    setIsDesktopDetailsOpen((prev) => !prev)
                  }
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#fbfdfc]">
                  <div className="w-16 h-16 rounded-3xl bg-[#eef6f2] flex items-center justify-center text-[#108e66] mb-4 shadow-xs">
                    <HugeIcon icon={WhatsappIcon} size={32} />
                  </div>
                  <h3 className="text-base font-bold text-[#142d23]">
                    Aguardando conversas do WhatsApp
                  </h3>
                  <p className="text-xs text-[#62756b] max-w-sm mt-1.5 leading-relaxed">
                    Nenhuma conversa registrada ainda nesta instância. Assim que o WhatsApp for conectado e trocar mensagens, elas aparecerão aqui automaticamente.
                  </p>
                  {onNavigateToConnection && (
                    <button
                      onClick={onNavigateToConnection}
                      className="mt-5 px-5 py-2.5 bg-[#12382c] text-white rounded-xl text-xs font-bold hover:bg-[#1a4a3b] active:scale-[0.98] transition-all cursor-pointer shadow-xs flex items-center gap-2"
                    >
                      <HugeIcon icon={WhatsappIcon} size={15} className="text-emerald-300" />
                      <span>Conectar WhatsApp no QR Code</span>
                    </button>
                  )}
                </div>
              )}

              {/* Column 3: Contact Detail Panel */}
              {isDesktopDetailsOpen && activeContact && (
                <ContactDetailPanel
                  contact={activeContact}
                  activeTab={activeDetailTab}
                  onChangeTab={setActiveDetailTab}
                  onClose={() => setIsDesktopDetailsOpen(false)}
                  onUpdateStatus={(newStatus) =>
                    handleUpdateStatus(activeContact.id, newStatus)
                  }
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
                  onChangeInboxFilter={handleInboxFilterChange}
                />
              )}

              {/* Screen 2: Mobile Chat Window */}
              {mobileScreen === 'chat' && activeContact && (
                <ChatWindow
                  contact={activeContact}
                  messages={currentMessages}
                  onSendMessage={handleSendMessage}
                  onToggleFavorite={handleToggleFavorite}
                  onBackMobile={() => setMobileScreen('list')}
                  onOpenDetailsMobile={() => setMobileScreen('details')}
                />
              )}

              {/* Screen 3: Mobile Contact Detail Panel */}
              {mobileScreen === 'details' && activeContact && (
                <ContactDetailPanel
                  contact={activeContact}
                  activeTab={activeDetailTab}
                  onChangeTab={setActiveDetailTab}
                  onClose={() => setMobileScreen('chat')}
                  onUpdateStatus={(newStatus) =>
                    handleUpdateStatus(activeContact.id, newStatus)
                  }
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
    </div>
  );
};
