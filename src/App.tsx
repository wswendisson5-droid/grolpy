/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricsRow } from './components/MetricsRow';
import { MonitoredGroups } from './components/MonitoredGroups';
import { QuickFilters, FilterType } from './components/QuickFilters';
import { OpportunityRadar } from './components/OpportunityRadar';
import { ActivityFeed } from './components/ActivityFeed';
import { RecentOpportunities } from './components/RecentOpportunities';
import { OpportunityDetailsModal } from './components/OpportunityDetailsModal';
import { AddGroupModal } from './components/AddGroupModal';
import { OpportunitiesView } from './components/opportunities/OpportunitiesView';
import { CrmView } from './components/crm/CrmView';
import { CrmAtendimentoView } from './components/crm/CrmAtendimentoView';
import { AiAgentConfigView } from './components/ai/AiAgentConfigView';
import { ConnectionView } from './components/connection/ConnectionView';
import { ClientPanel } from './components/client-panel/ClientPanel';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AppPanelMode } from './components/client-panel/types';
import { radarService } from './services/radarService';
import {
  Opportunity,
  MonitoredGroup,
  ActivityEvent,
  RadarStatus,
  OpportunityStage,
  CurrentScanState,
} from './types/nexus';
import {
  HugeIcon,
  RadarIcon,
  Target02Icon,
  Message01Icon,
  Message02Icon,
  WhatsappIcon,
  FilterHorizontalIcon,
  LightningIcon,
} from './components/icons/HugeIcon';
import { Menu } from 'lucide-react';
import { ClientPlanosView } from './components/client-panel/views/ClientPlanosView';
import { ClientCheckoutView } from './components/client-panel/views/ClientCheckoutView';
import { PlanId } from './services/planService';
import { SubscriptionsAdminView } from './components/admin/SubscriptionsAdminView';
import { RepresentativesAdminView } from './components/admin/RepresentativesAdminView';
import { RepresentativeDashboard } from './components/representative/RepresentativeDashboard';
import { representativeService } from './services/representativeService';
import { sessionService } from './services/sessionService';

export default function App() {
  const referralPath = window.location.pathname.match(/^\/representante(?:\/([a-zA-Z0-9_-]+))?\/?$/);
  const [panelMode, setPanelMode] = useState<any>(referralPath ? 'referral-loading' : 'loading');

  const logout = async () => {
    await sessionService.logout();
    setPanelMode('landing');
  };

  const handleSwitchPanel = (mode: any) => {
    if (mode === 'landing') {
      void logout();
      return;
    }
    if (mode === 'admin' || mode === 'client') sessionService.setPreferredPanel(mode);
    if (mode === 'admin') setCurrentTab('radar');
    setPanelMode(mode);
  };

  useEffect(() => {
    if (referralPath) {
      const slug = referralPath[1] || 'representante';
      representativeService.track(slug).catch(() => {}).finally(() => { window.history.replaceState({}, '', '/'); setPanelMode('landing'); });
      return;
    }
    let alive = true;
    (async () => {
      try {
        const d = await sessionService.status();
        if (!alive) return;
        if (d?.user?.role === 'representative') {
          setPanelMode('representative');
        } else if (d?.user?.role === 'admin') {
          setCurrentTab('radar');
          setPanelMode('admin');
        } else if (d?.access) setPanelMode('client');
        else if (d?.subscription) setPanelMode('public-checkout');
        else setPanelMode('public-plans');
      } catch (err: any) {
        if (!alive) return;
        sessionService.clear();
        setPanelMode(err?.status === 401 ? 'landing' : 'login');
      }
    })();
    return () => { alive = false; };
  }, []);
  const [publicPlanId,setPublicPlanId]=useState<PlanId>('pro');
  const [currentTab, setCurrentTab] = useState<'radar' | 'assinantes' | 'representantes' | 'oportunidades' | 'crm' | 'crm_atendimento' | 'ia_config' | 'conexao' | 'contatos' | 'grupos' | 'relatorios' | 'configuracoes'>('radar');
  const [radarStatus, setRadarStatus] = useState<RadarStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Todos');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Mobile View Switcher (for small screens when on Radar tab: 'radar' | 'atividade' | 'grupos')
  const [mobileActiveView, setMobileActiveView] = useState<'radar' | 'atividade' | 'grupos'>('radar');

  // Core Real Data Collections (starts from real data, never fictitious mocks)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [groups, setGroups] = useState<MonitoredGroup[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [currentScan, setCurrentScan] = useState<CurrentScanState | null>(null);
  const [radarStats, setRadarStats] = useState({
    status: 'active' as RadarStatus,
    queueSize: 0,
    analyzedCount: 0,
    opportunitiesCount: 0,
  });

  // Selection & Modals for Radar
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Synchronize with Radar Engine backend
  const fetchRealRadarData = async () => {
    try {
      const [opps, grps, acts, statusRes] = await Promise.all([
        radarService.getOpportunities(),
        radarService.getRealGroups(),
        radarService.getActivities(),
        radarService.getStatus(),
      ]);

      setOpportunities(opps);
      setGroups(grps.filter((g) => g.isMonitored));
      setActivities(acts);
      if (statusRes) {
        setRadarStatus(statusRes.status);
        if (statusRes.currentScan) {
          setCurrentScan(statusRes.currentScan);
        }
        setRadarStats({
          status: statusRes.status,
          queueSize: statusRes.queueSize || 0,
          analyzedCount: statusRes.analyzedPhonesCount || 0,
          opportunitiesCount: opps.length,
        });
      }
    } catch {
      // safe fallback
    }
  };

  useEffect(() => {
    if (panelMode !== 'admin') return;
    fetchRealRadarData();
    const interval = setInterval(fetchRealRadarData, 3000);
    return () => clearInterval(interval);
  }, [panelMode]);

  // Toggle Radar Play / Pause
  const handleToggleRadar = async () => {
    const next = radarStatus === 'active' ? 'paused' : 'active';
    setRadarStatus(next);
    await radarService.setStatus(next);
  };

  // Dynamic real metrics computed strictly from current state
  const metrics = useMemo(() => {
    const activeOpps = opportunities.filter((o) => o.stage !== 'descartadas').length;
    const highPriorityCount = opportunities.filter((o) => o.score >= 80).length;

    return [
      {
        id: 'active_opps',
        label: 'Oportunidades no Radar',
        value: activeOpps.toString(),
        change: activeOpps > 0 ? `+${activeOpps} capturadas` : 'Aguardando fluxo',
        changeType: 'positive' as const,
        description: 'Qualificadas pela IA',
      },
      {
        id: 'analyzed_msgs',
        label: 'Mensagens Analisadas',
        value: (radarStats.analyzedCount || 0).toString(),
        change: radarStats.queueSize > 0 ? `${radarStats.queueSize} na fila` : 'Fila zerada',
        changeType: 'neutral' as const,
        description: 'Filtros + Semântica',
      },
      {
        id: 'monitored_groups',
        label: 'Grupos Monitorados',
        value: groups.length.toString(),
        change: groups.length > 0 ? `${groups.length} ativos` : '0 configurados',
        changeType: 'positive' as const,
        description: 'WhatsApp Real',
      },
      {
        id: 'high_priority',
        label: 'Alta Prioridade (Score ≥80)',
        value: highPriorityCount.toString(),
        change: highPriorityCount > 0 ? 'Ação recomendada' : 'Sem alertas críticos',
        changeType: highPriorityCount > 0 ? ('positive' as const) : ('neutral' as const),
        description: 'Prontos para contato',
      },
    ];
  }, [opportunities, radarStats, groups.length]);

  // Filtered opportunities for Radar
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          opp.title.toLowerCase().includes(q) ||
          opp.segment.toLowerCase().includes(q) ||
          opp.groupName.toLowerCase().includes(q) ||
          opp.contactName.toLowerCase().includes(q) ||
          opp.messageOriginal.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Quick filter
      if (activeFilter === 'Todos') return true;
      if (activeFilter === 'Lojas') return opp.category === 'Lojas' || opp.segment.includes('Varejo');
      if (activeFilter === 'Serviços') return opp.category === 'Serviços';
      if (activeFilter === 'Produtos') return opp.category === 'Produtos' || opp.category === 'Moda';
      if (activeFilter === 'Não atribuídas') return opp.stage === 'nao_atribuidas';
      if (activeFilter === 'Alta prioridade') return opp.score >= 75;
      if (activeFilter === 'Recentes') return true;

      return true;
    });
  }, [opportunities, searchQuery, activeFilter]);

  // Handle Opportunity Selection from Radar or Recent Carousel
  const handleSelectOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
  };

  const handleSelectOpportunityById = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (opp) {
      setSelectedOpportunity(opp);
    }
  };

  // Handle Stage / Status update on Opportunities page
  const handleUpdateOpportunityStatus = (id: string, newStage: OpportunityStage) => {
    setOpportunities((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedHistory = [
            ...(item.history || []),
            {
              id: `h-${Date.now()}`,
              timestamp: 'Agora há pouco',
              action: `Status alterado para ${newStage.replace('_', ' ')}`,
              author: 'Enzo Santos',
              type: 'user' as const,
            },
          ];

          return {
            ...item,
            stage: newStage,
            status:
              newStage === 'concluidas'
                ? 'converted'
                : newStage === 'descartadas'
                ? 'dismissed'
                : newStage === 'em_atendimento'
                ? 'analyzing'
                : 'new',
            history: updatedHistory,
          };
        }
        return item;
      })
    );
  };

  // Handle Assignee update
  const handleAssignOpportunityUser = (id: string, userName: string) => {
    setOpportunities((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          let assignedToObj = null;
          let newStage = item.stage;

          if (userName === 'Enzo Santos') {
            assignedToObj = {
              id: 'u-1',
              name: 'Enzo Santos',
              avatar:
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
            };
            if (newStage === 'nao_atribuidas') newStage = 'minhas';
          } else if (userName === 'Mariana Lima') {
            assignedToObj = {
              id: 'u-2',
              name: 'Mariana Lima',
              avatar:
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            };
            if (newStage === 'nao_atribuidas') newStage = 'em_atendimento';
          } else {
            assignedToObj = null;
            newStage = 'nao_atribuidas';
          }

          const updatedHistory = [
            ...(item.history || []),
            {
              id: `h-${Date.now()}`,
              timestamp: 'Agora há pouco',
              action: `Responsável alterado para ${userName}`,
              author: 'Enzo Santos',
              type: 'user' as const,
            },
          ];

          return {
            ...item,
            assignedTo: assignedToObj,
            stage: newStage,
            history: updatedHistory,
          };
        }
        return item;
      })
    );
  };

  // Add new monitored group
  const handleAddGroup = (newGroup: MonitoredGroup) => {
    setGroups((prev) => [newGroup, ...prev.filter((g) => g.id !== newGroup.id)]);
  };

  // Handle start contact: assigns user, marks em_atendimento in backend & local state, and navigates to CRM
  const handleStartContact = async (opp: Opportunity) => {
    try {
      await radarService.startContact(opp.id, 'Enzo Santos');
    } catch {}

    handleAssignOpportunityUser(opp.id, 'Enzo Santos');
    handleUpdateOpportunityStatus(opp.id, 'em_atendimento');
    setSelectedOpportunity(null);
    setCurrentTab('crm');
  };

  // Unassigned count for sidebar badge
  const unassignedCount = useMemo(() => {
    return opportunities.filter((o) => o.stage === 'nao_atribuidas').length;
  }, [opportunities]);

  if (panelMode === 'loading' || panelMode === 'referral-loading') {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center p-4 selection:bg-[#00c968] selection:text-white">
        <div className="flex flex-col items-center gap-4">
          <img
            src="https://i.imgur.com/HqvEmQF.png"
            alt="Grolpy"
            referrerPolicy="no-referrer"
            className="h-10 w-auto object-contain max-w-[170px] animate-pulse"
          />
          <div className="w-8 h-8 border-3 border-[#109353] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#5b6e63]">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // If Landing Page mode is active, render the Index / Landing Page
  if (panelMode === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setPanelMode('public-plans')}
        onLogin={() => setPanelMode('login')}
        onNavigateToPlans={() => setPanelMode('public-plans')}
      />
    );
  }

  if (panelMode === 'public-plans') {
    return <div className="min-h-screen bg-[#f8faf9] px-4 py-8 sm:px-8"><div className="max-w-7xl mx-auto"><button onClick={()=>setPanelMode('landing')} className="mb-6 text-sm font-bold text-[#109353]">← Voltar</button><ClientPlanosView publicMode onOpenCheckout={(id)=>{setPublicPlanId(id);setPanelMode('register');}} /></div></div>;
  }

  // If Login page mode is active
  if (panelMode === 'login') {
    return (
      <LoginPage
        onLoginSuccess={async () => {
          try {
            const d = await sessionService.status();
            if (d?.user?.role === 'representative') {
              setPanelMode('representative');
              return;
            }
            if (d?.user?.role === 'admin') {
              setCurrentTab('radar');
              setPanelMode('admin');
              return;
            }
            setPanelMode(d?.access ? 'client' : (d?.subscription ? 'public-checkout' : 'public-plans'));
          } catch {
            sessionService.clear();
            setPanelMode('login');
          }
        }}
        onNavigateRegister={() => setPanelMode('public-plans')}
        onNavigateHome={() => setPanelMode('landing')}
      />
    );
  }

  // If Register page mode is active
  if (panelMode === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={() => setPanelMode('public-checkout')}
        onNavigateLogin={() => setPanelMode('login')}
        onNavigateHome={() => setPanelMode('landing')}
      />
    );
  }

  if (panelMode === 'public-checkout') {
    return <ClientCheckoutView initialPlanId={publicPlanId} onboardingMode onBack={()=>setPanelMode('public-plans')} onGoToDashboard={()=>setPanelMode('client')} onGoToPlans={()=>setPanelMode('public-plans')} onGoToNovaDivulgacao={()=>setPanelMode('client')} />;
  }

  if (panelMode === 'representative') {
    return <RepresentativeDashboard onLogout={logout} />;
  }

  // If Client Panel mode is active, render Client Dashboard
  if (panelMode === 'client') {
    return <ClientPanel onSwitchPanel={handleSwitchPanel} />;
  }

  if(panelMode !== 'admin') { setPanelMode('landing'); return null; }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex font-sans text-[#1a201c] antialiased">
      {/* Sidebar: Fixed on Desktop (lg+), Slide-in Drawer with Backdrop on Mobile */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab as any)}
        activeCount={unassignedCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSwitchPanel={handleSwitchPanel}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {currentTab === 'assinantes' && <div className="flex-1 overflow-y-auto"><SubscriptionsAdminView /></div>}

                {currentTab === 'representantes' && <RepresentativesAdminView />}

          {/* VIEW 1: OPORTUNIDADES PAGE */}
        {currentTab === 'oportunidades' && (
          <OpportunitiesView
            opportunities={opportunities}
            groups={groups}
            onUpdateOpportunityStatus={handleUpdateOpportunityStatus}
            onAssignOpportunityUser={handleAssignOpportunityUser}
            onStartContact={handleStartContact}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          />
        )}

        {/* VIEW 2: RADAR PAGE (DEFAULT / CENTRAL RADAR) */}
        {currentTab === 'radar' && (
          <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-5 gap-3.5 sm:gap-4.5 pb-24 lg:pb-5">
            {/* 1. Header Bar with Mobile Menu trigger & Groups button */}
            <Header
              radarStatus={radarStatus}
              monitoredGroupsCount={groups.length}
              lastUpdateTime="há poucos segundos"
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleRadar={handleToggleRadar}
              onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
              onAddGroup={() => setIsAddGroupOpen(true)}
            />

            {/* 2. Top Monochromatic Indicators Row (4 stats cards) */}
            <MetricsRow metrics={metrics} />

            {/* Mobile View Switcher Tabs (Only visible on small screens < xl) */}
            <div className="flex xl:hidden items-center p-1 bg-[#edf3ef] rounded-xl text-xs font-semibold select-none">
              <button
                onClick={() => setMobileActiveView('radar')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  mobileActiveView === 'radar'
                    ? 'bg-white text-[#12382c] shadow-xs font-bold'
                    : 'text-[#53655c]'
                }`}
              >
                Radar Central
              </button>
              <button
                onClick={() => setMobileActiveView('atividade')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  mobileActiveView === 'atividade'
                    ? 'bg-white text-[#12382c] shadow-xs font-bold'
                    : 'text-[#53655c]'
                }`}
              >
                Atividade ({activities.length})
              </button>
              <button
                onClick={() => setMobileActiveView('grupos')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  mobileActiveView === 'grupos'
                    ? 'bg-white text-[#12382c] shadow-xs font-bold'
                    : 'text-[#53655c]'
                }`}
              >
                Grupos ({groups.length})
              </button>
            </div>

            {/* 3. Main Central Section */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
              {/* Left Column: Monitored Groups + Quick Filters */}
              <div
                className={`xl:col-span-3 flex flex-col gap-3.5 ${
                  mobileActiveView === 'grupos' ? 'flex' : 'hidden xl:flex'
                }`}
              >
                <MonitoredGroups
                  groups={groups}
                  onAddGroup={() => setIsAddGroupOpen(true)}
                  onSelectGroup={(id) =>
                    setSelectedGroupId((prev) => (prev === id ? null : id))
                  }
                  selectedGroupId={selectedGroupId}
                />

                <QuickFilters
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              </div>

              {/* Center Column: OpportunityRadar */}
              <div
                className={`xl:col-span-6 flex flex-col ${
                  mobileActiveView === 'radar' ? 'flex' : 'hidden xl:flex'
                }`}
              >
                <OpportunityRadar
                  opportunities={filteredOpportunities}
                  radarStatus={radarStatus}
                  selectedOpportunityId={selectedOpportunity?.id}
                  onSelectOpportunity={handleSelectOpportunity}
                  onToggleStatus={handleToggleRadar}
                  groups={groups}
                  currentScan={currentScan || undefined}
                  onAddGroup={() => setIsAddGroupOpen(true)}
                />
              </div>

              {/* Right Column: Real-time Activity Feed */}
              <div
                className={`xl:col-span-3 flex flex-col ${
                  mobileActiveView === 'atividade' ? 'flex' : 'hidden xl:flex'
                }`}
              >
                <ActivityFeed
                  activities={activities}
                  onSelectOpportunityById={handleSelectOpportunityById}
                />
              </div>
            </div>

            {/* 4. Bottom Horizontal Carousel: Oportunidades recentes */}
            <div className="mt-1">
              <RecentOpportunities
                opportunities={filteredOpportunities}
                totalCount={filteredOpportunities.length}
                selectedOpportunityId={selectedOpportunity?.id}
                onSelectOpportunity={handleSelectOpportunity}
                onViewAll={() => {
                  setCurrentTab('oportunidades');
                }}
              />
            </div>
          </main>
        )}

        {/* CRM TAB */}
        {currentTab === 'crm' && (
          <CrmView
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onNavigateToConnection={() => setCurrentTab('conexao')}
          />
        )}

        {/* CRM ATENDIMENTO TAB (RADAR LEADS ONLY + AI AUTORESPONDER) */}
        {currentTab === 'crm_atendimento' && (
          <CrmAtendimentoView
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onNavigateToRadar={() => setCurrentTab('radar')}
            onNavigateToConfig={() => setCurrentTab('ia_config')}
          />
        )}

        {/* AI AGENT CONFIGURATION TAB */}
        {currentTab === 'ia_config' && (
          <AiAgentConfigView
            onNavigateToAtendimento={() => setCurrentTab('crm_atendimento')}
            onNavigateToRadar={() => setCurrentTab('radar')}
          />
        )}

        {/* CONEXÃO TAB (Evolution API WhatsApp Connection) */}
        {currentTab === 'conexao' && (
          <ConnectionView onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />
        )}

        {/* OTHER SECONDARY TABS FALLBACK: CONTATOS, GRUPOS, ETC. */}
        {currentTab !== 'radar' && currentTab !== 'oportunidades' && currentTab !== 'crm' && currentTab !== 'crm_atendimento' && currentTab !== 'ia_config' && currentTab !== 'conexao' && currentTab !== 'assinantes' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f7faf8]">
            <div className="w-14 h-14 rounded-2xl bg-[#eaf4ef] flex items-center justify-center text-[#12382c] mb-4">
              <HugeIcon icon={Target02Icon} size={28} />
            </div>
            <h2 className="text-lg font-bold text-[#142d23] capitalize">
              Módulo {currentTab}
            </h2>
            <p className="text-xs text-[#63756b] max-w-md mt-1 mb-5 leading-relaxed">
              Integração completa com a Evolution API e sincronização em tempo real de mensagens e contatos qualificados.
            </p>
            <button
              onClick={() => setCurrentTab('crm')}
              className="px-4 py-2 bg-[#12382c] text-white rounded-xl text-xs font-bold hover:bg-[#1a4a3b] transition-all cursor-pointer shadow-xs"
            >
              Abrir CRM
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Supreme ergonomic mobile access) */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e5ebe7] px-1 py-1 sm:px-2 sm:py-1.5 flex items-center justify-around select-none shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      >
        <button
          onClick={() => {
            setCurrentTab('radar');
            setMobileActiveView('radar');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors cursor-pointer min-w-0 ${
            currentTab === 'radar'
              ? 'text-[#12382c] font-bold'
              : 'text-[#6a7d73]'
          }`}
        >
          <HugeIcon icon={RadarIcon} size={18} strokeWidth={currentTab === 'radar' ? 2.3 : 1.7} />
          <span className="text-[10px] leading-tight truncate">Radar</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('oportunidades');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors relative cursor-pointer min-w-0 ${
            currentTab === 'oportunidades'
              ? 'text-[#12382c] font-bold'
              : 'text-[#6a7d73]'
          }`}
        >
          <div className="relative">
            <HugeIcon icon={Target02Icon} size={18} strokeWidth={currentTab === 'oportunidades' ? 2.3 : 1.7} />
            <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-[#12382c] text-white text-[9px] font-bold rounded-full">
              {unassignedCount}
            </span>
          </div>
          <span className="text-[10px] leading-tight truncate">Leads</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('crm');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors relative cursor-pointer min-w-0 ${
            currentTab === 'crm'
              ? 'text-[#12382c] font-bold'
              : 'text-[#6a7d73]'
          }`}
        >
          <HugeIcon icon={Message01Icon} size={18} strokeWidth={currentTab === 'crm' ? 2.3 : 1.7} />
          <span className="text-[10px] leading-tight truncate">CRM</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('crm_atendimento');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors relative cursor-pointer min-w-0 ${
            currentTab === 'crm_atendimento'
              ? 'text-[#12382c] font-bold'
              : 'text-[#6a7d73]'
          }`}
        >
          <div className="relative">
            <HugeIcon icon={LightningIcon} size={18} strokeWidth={currentTab === 'crm_atendimento' ? 2.3 : 1.7} />
            <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-emerald-600 text-white text-[8px] font-bold rounded-full">
              IA
            </span>
          </div>
          <span className="text-[10px] leading-tight truncate">IA Chat</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('conexao');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors relative cursor-pointer min-w-0 ${
            currentTab === 'conexao'
              ? 'text-[#12382c] font-bold'
              : 'text-[#6a7d73]'
          }`}
        >
          <HugeIcon icon={WhatsappIcon} size={18} strokeWidth={currentTab === 'conexao' ? 2.3 : 1.7} />
          <span className="text-[10px] leading-tight truncate">WhatsApp</span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[#6a7d73] hover:text-[#12382c] transition-colors cursor-pointer min-w-0"
        >
          <Menu size={18} />
          <span className="text-[10px] leading-tight truncate">Menu</span>
        </button>
      </nav>

      {/* Opportunity Details Inspection Modal for Radar view */}
      <OpportunityDetailsModal
        opportunity={selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        onStartContact={handleStartContact}
        onStatusChange={(id, newStatus) => {
          setOpportunities((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: newStatus } : item
            )
          );
        }}
      />

      {/* Add Monitored Group Modal */}
      <AddGroupModal
        isOpen={isAddGroupOpen}
        onClose={() => setIsAddGroupOpen(false)}
        onAddGroup={handleAddGroup}
        onGroupsUpdated={(monitored) => setGroups(monitored)}
      />
    </div>
  );
}
