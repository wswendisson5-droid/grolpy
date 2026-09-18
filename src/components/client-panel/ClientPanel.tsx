import React, { useState, useEffect } from 'react';
import { ClientSidebar } from './ClientSidebar';
import { ClientHeader } from './ClientHeader';
import { ClientHomeView } from './views/ClientHomeView';
import { ClientDivulgacoesView } from './views/ClientDivulgacoesView';
import { ClientNovaDivulgacaoView } from './views/ClientNovaDivulgacaoView';
import { ClientGruposView } from './views/ClientGruposView';
import { ClientAgendamentosView } from './views/ClientAgendamentosView';
import { ClientHistoricoView } from './views/ClientHistoricoView';
import { ClientRelatoriosView } from './views/ClientRelatoriosView';
import { ClientConexaoView } from './views/ClientConexaoView';
import { ClientConfiguracoesView } from './views/ClientConfiguracoesView';
import { ImportarGruposModal } from './modals/ImportarGruposModal';
import { PlanoModal } from './modals/PlanoModal';
import { SuporteModal } from './modals/SuporteModal';
import {
  INITIAL_AGENDA_ITEMS,
  INITIAL_DIVULGACOES,
  INITIAL_CLIENT_GROUPS,
  INITIAL_PLAN_USAGE,
} from './data/mockClientData';
import { ClientTab, AppPanelMode, DivulgacaoCard, ClientGroup, AgendaItem } from './types';
import { clientService } from '../../services/clientService';
import { planService, PlanId } from '../../services/planService';
import { ClientPlanosView } from './views/ClientPlanosView';
import { ClientCheckoutView } from './views/ClientCheckoutView';
import { Home, Megaphone, Users, Calendar, MessageSquare, Menu, History, BarChart3 } from 'lucide-react';

interface ClientPanelProps {
  onSwitchPanel: (mode: AppPanelMode) => void;
}

export const ClientPanel: React.FC<ClientPanelProps> = ({ onSwitchPanel }) => {
  const [currentTab, setCurrentTab] = useState<ClientTab>('inicio');
  const [checkoutPlanId, setCheckoutPlanId] = useState<PlanId>('pro');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Client Data State
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(INITIAL_AGENDA_ITEMS);
  const [campaigns, setCampaigns] = useState<DivulgacaoCard[]>(INITIAL_DIVULGACOES);
  const [groups, setGroups] = useState<ClientGroup[]>(INITIAL_CLIENT_GROUPS);
  const [planUsage, setPlanUsage] = useState(INITIAL_PLAN_USAGE);

  // WhatsApp Profile State (Connected photo & real phone number)
  const [whatsappProfile, setWhatsappProfile] = useState<{
    name?: string;
    number?: string;
    pictureUrl?: string;
    isConnected: boolean;
    isLoading: boolean;
  }>({
    name: 'Wendisson',
    number: '+55 (27) 99659-9231',
    pictureUrl: 'https://pps.whatsapp.net/v/t61.24694-24/727266863_1741805150164968_1070853679651659019_n.jpg?ccb=11-4&oh=01_Q5Aa5gHNiSCD-HPMhoLiyww2yD6mL1f80Hfm7jVKFeJiwEj1uA&oe=6AB25744&_nc_sid=5e03e0&_nc_cat=106',
    isConnected: true,
    isLoading: false,
  });

  // Fetch real data from backend
  const refreshGroups = async (force: boolean = false) => {
    try {
      const real = await clientService.getRealGroups(clientService.getDefaultInstance(), force);
      if (real && real.length > 0) {
        setGroups(real);
      }
    } catch {
      // Keep existing groups if network blips
    }
  };

  const refreshCampaigns = async () => {
    try {
      const data = await clientService.getCampaigns();
      if (data) {
        setCampaigns(data);
        // Build agenda items from campaigns reflecting real sent/scheduled status
        const items: AgendaItem[] = data.map((c) => {
          let itemStatus: 'enviado' | 'enviando' | 'agendado' | 'falha' | 'parcial' = 'agendado';
          let itemStatusLabel = 'Agendado';

          if (c.status === 'concluida') {
            itemStatus = 'enviado';
            itemStatusLabel = `Concluído (${c.totalSent}/${c.groupsCount || c.totalTarget || 1})`;
          } else if (c.status === 'parcial') {
            itemStatus = 'parcial';
            itemStatusLabel = `Envio Parcial (${c.totalSent}/${c.groupsCount || c.totalTarget || 1})`;
          } else if (c.status === 'falha') {
            itemStatus = 'falha';
            itemStatusLabel = 'Falha no Envio';
          } else if (c.status === 'enviando') {
            itemStatus = 'enviando';
            itemStatusLabel = `Enviando (${c.totalSent}/${c.groupsCount || c.totalTarget || 1})`;
          } else if (c.status === 'pausada') {
            itemStatus = 'falha';
            itemStatusLabel = 'Pausada';
          } else if (c.status === 'agendada') {
            itemStatus = 'agendado';
            itemStatusLabel = 'Agendado';
          } else if (c.status === 'ativa') {
            itemStatus = 'agendado';
            itemStatusLabel = 'Ativa';
          }

          return {
            id: `agenda-${c.id}`,
            time: c.scheduleTime || '14:00',
            status: itemStatus,
            statusLabel: itemStatusLabel,
            campaignTitle: c.title,
            groupName: `${c.groupsCount || c.selectedGroupJids?.length || 0} Grupos Selecionados`,
            imageThumbnail: c.imageUrl,
            previewText: c.previewText,
            scheduledDate: c.scheduleDateText || 'Hoje',
            sentCount: c.totalSent || 0,
            totalCount: c.groupsCount || c.totalTarget || 1,
            intervalMinutes: c.intervalMinutes,
            delaySeconds: c.delaySeconds,
          };
        });
        setAgendaItems(items);

        // Keep Plan Usage instantly synchronized with campaign execution state
        const totalSentCalc = data.reduce((acc, c) => acc + (c.totalSent || 0), 0);
        const pendingCalc = data
          .filter((c) => c.status === 'agendada' || c.status === 'enviando' || (c.active && c.status !== 'concluida'))
          .reduce((acc, c) => acc + Math.max(0, (c.groupsCount || 1) - (c.totalSent || 0)), 0);
        
        // Sum totalFailed across all campaigns
        const failedCalc = data.reduce((acc, c) => acc + (c.totalFailed || 0), 0);

        const pctCalc = Math.min(100, Math.round((totalSentCalc / 5000) * 100));

        setPlanUsage((prev) => ({
          ...prev,
          usedMessages: Math.max(prev.usedMessages, totalSentCalc),
          pendingMessages: pendingCalc,
          failedMessages: failedCalc,
          percentage: Math.max(prev.percentage, pctCalc),
        }));
      }
    } catch {
      setCampaigns([]);
      setAgendaItems([]);
    }
  };

  const refreshStats = async () => {
    try {
      const statsRes = await clientService.getDashboardStats();
      if (statsRes?.success && statsRes.usage) {
        setPlanUsage({
          planName: 'Plano Pro',
          validUntil: '20/10/2026',
          usedMessages: statsRes.usage.sent || 0,
          totalMessages: statsRes.usage.limit || 5000,
          percentage: statsRes.usage.percentage || 0,
          pendingMessages: statsRes.usage.pending || 0,
          failedMessages: statsRes.usage.failed || 0,
        });
      }
    } catch {
      // silent
    }
  };

  const refreshWhatsAppStatus = async () => {
    try {
      const statusData = await clientService.getWhatsAppStatus();
      setWhatsappProfile({
        name: statusData.profile?.name || 'Wendisson',
        number: statusData.profile?.number || '+55 (27) 99659-9231',
        pictureUrl: statusData.profile?.pictureUrl,
        isConnected: statusData.isConnected,
        isLoading: false,
      });
    } catch {
      setWhatsappProfile(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    refreshCampaigns();
    refreshGroups();
    refreshStats();
    refreshWhatsAppStatus();

    // Periodic check to keep campaign and WhatsApp status in sync
    const interval = setInterval(() => {
      refreshCampaigns();
      refreshStats();
      refreshWhatsAppStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Modals state
  const [isImportarGruposOpen, setIsImportarGruposOpen] = useState(false);
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState(false);
  const [isSuporteModalOpen, setIsSuporteModalOpen] = useState(false);
  const [bannerAlert, setBannerAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleSendNow = async (campaignId: string) => {
    setBannerAlert({ type: 'info', message: 'Iniciando disparo para os grupos selecionados...' });
    try {
      const res = await clientService.dispatchNow({ campaignId });
      if (res.success) {
        setBannerAlert({
          type: 'success',
          message: `Disparo concluído: ${res.successful} de ${res.totalDispatched || 1} mensagens entregues com sucesso!`,
        });
      } else {
        setBannerAlert({
          type: 'error',
          message: res.error || 'Não foi possível disparar para todos os grupos.',
        });
      }
      await refreshCampaigns();
      await refreshStats();
    } catch (err: any) {
      setBannerAlert({
        type: 'error',
        message: err.message || 'Erro ao comunicar com o servidor de disparo.',
      });
      await refreshCampaigns();
    } finally {
      setTimeout(() => setBannerAlert(null), 6000);
    }
  };

  // Handlers
  const handleToggleCampaignActive = async (id: string) => {
    const camp = campaigns.find((c) => c.id === id);
    if (camp && !camp.active) {
      const activeCheck = planService.canActivateCampaign(campaigns, id);
      if (!activeCheck.allowed) {
        setBannerAlert({
          type: 'error',
          message: `Limite de ${activeCheck.limit} divulgações ativas atingido para seu plano. Pause outra divulgação ou faça um upgrade.`,
        });
        setTimeout(() => setBannerAlert(null), 6000);
        return;
      }

      const campJids = camp.selectedGroupJids || [];
      const reserved = planService.getUniqueGroupJidsInAutomations(campaigns, id);
      const combined = new Set([...reserved, ...campJids]);
      const currentPlan = planService.getSubscription().plan;
      if (combined.size > currentPlan.maxGroups) {
        setBannerAlert({
          type: 'error',
          message: `Ativar esta divulgação excede o limite de ${currentPlan.maxGroups} grupos únicos do plano.`,
        });
        setTimeout(() => setBannerAlert(null), 6000);
        return;
      }
    }

    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextActive = !c.active;
          return {
            ...c,
            active: nextActive,
            status: nextActive ? 'ativa' : 'pausada',
          };
        }
        return c;
      })
    );
    try {
      const res = await clientService.toggleCampaign(id);
      if (!res) {
        setBannerAlert({ type: 'error', message: 'Não foi possível alterar o status da divulgação.' });
      }
    } catch (e: any) {
      setBannerAlert({ type: 'error', message: e.message || 'Erro ao alterar status.' });
    }
    refreshCampaigns();
  };

  const handleSaveCampaign = (_newCamp: DivulgacaoCard, _createAgenda: boolean = true) => {
    refreshCampaigns();
  };

  const handleDeleteCampaign = async (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setAgendaItems((prev) => prev.filter((a) => !a.id.includes(id)));
    await clientService.deleteCampaign(id);
  };

  const handleDuplicateCampaign = (card: DivulgacaoCard) => {
    const duplicated: DivulgacaoCard = {
      ...card,
      id: `div-${Date.now()}`,
      title: `${card.title} (Cópia)`,
      totalSent: 0,
      createdAt: new Date().toISOString(),
    };
    setCampaigns((prev) => [duplicated, ...prev]);
    clientService.createCampaign({
      title: duplicated.title,
      category: duplicated.category,
      scheduleDays: duplicated.scheduleDays,
      scheduleTime: duplicated.scheduleTime,
      previewText: duplicated.previewText,
      imageUrl: duplicated.imageUrl,
      selectedGroupJids: duplicated.selectedGroupJids,
      groupsCount: duplicated.groupsCount,
    });
  };

  const handleImportGroups = async (newGroups: ClientGroup[]) => {
    setGroups(newGroups);
    await clientService.saveImportedGroups(newGroups);
  };

  const uniqueGroupsCount = planService.getUniqueGroupJidsInAutomations(campaigns).size;

  return (
    <div className="min-h-screen bg-[#f8faf9] flex font-sans text-[#11241c] antialiased">
      {/* Client Sidebar */}
      <ClientSidebar
        currentTab={currentTab === 'nova-divulgacao' ? 'divulgacoes' : currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSwitchPanel={onSwitchPanel}
        onOpenPlanModal={() => setCurrentTab('planos')}
        onOpenSupportModal={() => setIsSuporteModalOpen(true)}
        campaignsCount={campaigns.length}
        groupsCount={groups.length}
        uniqueGroupsCount={uniqueGroupsCount}
        whatsappProfilePic={whatsappProfile.isConnected ? whatsappProfile.pictureUrl : undefined}
      />

      {/* Main Client Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <ClientHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onImportGroups={() => setIsImportarGruposOpen(true)}
          onSwitchPanel={onSwitchPanel}
          onOpenPlanModal={() => setCurrentTab('planos')}
          whatsappProfilePic={whatsappProfile.isConnected ? whatsappProfile.pictureUrl : undefined}
          isLoadingProfile={whatsappProfile.isLoading}
          planUsage={planUsage}
        />

        {/* Dynamic Views Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 lg:pb-6">
          {bannerAlert && (
            <div
              className={`mb-4 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in duration-200 ${
                bannerAlert.type === 'success'
                  ? 'bg-[#eaf6ef] text-[#109353] border border-[#c4e6ce]'
                  : bannerAlert.type === 'error'
                  ? 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <span>{bannerAlert.message}</span>
              <button
                onClick={() => setBannerAlert(null)}
                className="ml-3 text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {currentTab === 'inicio' && (
            <ClientHomeView
              agendaItems={agendaItems}
              campaigns={campaigns}
              planUsage={planUsage}
              groupsCount={groups.length}
              onNavigateTab={setCurrentTab}
              onNewCampaign={() => setCurrentTab('nova-divulgacao')}
              onToggleCampaignActive={handleToggleCampaignActive}
              onSendNow={handleSendNow}
              whatsappProfilePic={whatsappProfile.isConnected ? whatsappProfile.pictureUrl : undefined}
              whatsappPhoneNumber={whatsappProfile.isConnected ? whatsappProfile.number : undefined}
              whatsappIsConnected={whatsappProfile.isLoading ? undefined : whatsappProfile.isConnected}
            />
          )}

          {currentTab === 'divulgacoes' && (
            <ClientDivulgacoesView
              campaigns={campaigns}
              groups={groups}
              onToggleActive={handleToggleCampaignActive}
              onNewCampaign={() => setCurrentTab('nova-divulgacao')}
              onDeleteCampaign={handleDeleteCampaign}
              onDuplicateCampaign={handleDuplicateCampaign}
              onSendNow={handleSendNow}
            />
          )}

          {currentTab === 'nova-divulgacao' && (
            <ClientNovaDivulgacaoView
              onBack={() => setCurrentTab('divulgacoes')}
              onSaveCampaign={handleSaveCampaign}
              onNavigateToConnection={() => setCurrentTab('conexao')}
              onNavigateToPlanos={() => setCurrentTab('planos')}
              campaigns={campaigns}
            />
          )}

          {currentTab === 'planos' && (
            <ClientPlanosView
              onOpenCheckout={(planId) => {
                setCheckoutPlanId(planId);
                setCurrentTab('checkout');
              }}
              onPlanChanged={async (planId) => {
                try {
                  await fetch('/api/client/plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId }),
                  });
                } catch (e) {
                  console.error('Failed to update plan on server', e);
                }
                await refreshStats();
              }}
              onOpenSupport={() => setIsSuporteModalOpen(true)}
            />
          )}

          {currentTab === 'checkout' && (
            <ClientCheckoutView
              initialPlanId={checkoutPlanId}
              onBack={() => setCurrentTab('planos')}
              onGoToDashboard={() => {
                refreshStats();
                setCurrentTab('inicio');
              }}
              onGoToPlans={() => {
                refreshStats();
                setCurrentTab('planos');
              }}
              onGoToNovaDivulgacao={() => {
                refreshStats();
                setCurrentTab('nova-divulgacao');
              }}
              onOpenSupport={() => setIsSuporteModalOpen(true)}
            />
          )}

          {currentTab === 'grupos' && (
            <ClientGruposView
              groups={groups}
              onImportGroups={() => setIsImportarGruposOpen(true)}
              onNavigateToConnection={() => setCurrentTab('conexao')}
              onRefresh={() => refreshGroups(true)}
            />
          )}

          {currentTab === 'agendamentos' && (
            <ClientAgendamentosView
              agendaItems={agendaItems}
              onNewCampaign={() => setCurrentTab('nova-divulgacao')}
            />
          )}

          {currentTab === 'historico' && (
            <ClientHistoricoView
              onNewCampaign={() => setCurrentTab('nova-divulgacao')}
            />
          )}

          {currentTab === 'relatorios' && <ClientRelatoriosView />}

          {currentTab === 'conexao' && <ClientConexaoView />}

          {currentTab === 'configuracoes' && <ClientConfiguracoesView />}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation */}
      <nav
        id="client-mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e5ebe7] px-1.5 py-1 sm:px-2 sm:py-1.5 flex items-center justify-around select-none shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      >
        <button
          onClick={() => setCurrentTab('inicio')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer min-w-0 ${
            currentTab === 'inicio' ? 'text-[#109353] font-bold' : 'text-[#6a7d73]'
          }`}
        >
          <Home size={18} className="shrink-0" />
          <span className="text-[10px] leading-tight truncate">Início</span>
        </button>

        <button
          onClick={() => setCurrentTab('divulgacoes')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer min-w-0 ${
            currentTab === 'divulgacoes' || currentTab === 'nova-divulgacao' ? 'text-[#109353] font-bold' : 'text-[#6a7d73]'
          }`}
        >
          <Megaphone size={18} className="shrink-0" />
          <span className="text-[10px] leading-tight truncate">Envios</span>
        </button>

        <button
          onClick={() => setCurrentTab('historico')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer min-w-0 ${
            currentTab === 'historico' ? 'text-[#109353] font-bold' : 'text-[#6a7d73]'
          }`}
        >
          <History size={18} className="shrink-0" />
          <span className="text-[10px] leading-tight truncate">Histórico</span>
        </button>

        <button
          onClick={() => setCurrentTab('relatorios')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer min-w-0 ${
            currentTab === 'relatorios' ? 'text-[#109353] font-bold' : 'text-[#6a7d73]'
          }`}
        >
          <BarChart3 size={18} className="shrink-0" />
          <span className="text-[10px] leading-tight truncate">Relatórios</span>
        </button>

        <button
          onClick={() => setCurrentTab('conexao')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer min-w-0 ${
            currentTab === 'conexao' ? 'text-[#109353] font-bold' : 'text-[#6a7d73]'
          }`}
        >
          <MessageSquare size={18} className="shrink-0" />
          <span className="text-[10px] leading-tight truncate">WhatsApp</span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[#6a7d73] hover:text-[#109353] transition-colors cursor-pointer min-w-0"
        >
          <Menu size={18} className="shrink-0" />
          <span className="text-[10px] leading-tight truncate">Menu</span>
        </button>
      </nav>

      {/* Modals */}
      <ImportarGruposModal
        isOpen={isImportarGruposOpen}
        onClose={() => setIsImportarGruposOpen(false)}
        onImport={handleImportGroups}
        onNavigateToConnection={() => setCurrentTab('conexao')}
      />

      <PlanoModal
        isOpen={isPlanoModalOpen}
        onClose={() => setIsPlanoModalOpen(false)}
        onUpgrade={() => {
          setIsPlanoModalOpen(false);
          setCheckoutPlanId('max');
          setCurrentTab('checkout');
        }}
      />

      <SuporteModal
        isOpen={isSuporteModalOpen}
        onClose={() => setIsSuporteModalOpen(false)}
      />
    </div>
  );
};
