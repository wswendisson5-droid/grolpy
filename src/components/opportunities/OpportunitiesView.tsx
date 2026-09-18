import React, { useState, useMemo } from 'react';
import { Opportunity, MonitoredGroup, OpportunityStage } from '../../types/nexus';
import { OpportunitiesHeader } from './OpportunitiesHeader';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityDetailPanel } from './OpportunityDetailPanel';
import { HugeIcon, SparklesIcon, FilterIcon } from '../icons/HugeIcon';

interface OpportunitiesViewProps {
  opportunities: Opportunity[];
  groups: MonitoredGroup[];
  onUpdateOpportunityStatus: (id: string, newStage: OpportunityStage) => void;
  onAssignOpportunityUser: (id: string, userName: string) => void;
  onStartContact?: (opp: Opportunity) => void;
  onOpenMobileMenu?: () => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  opportunities,
  groups,
  onUpdateOpportunityStatus,
  onAssignOpportunityUser,
  onStartContact,
  onOpenMobileMenu,
}) => {
  // Current active stage tab
  const [activeStage, setActiveStage] = useState<OpportunityStage>('nao_atribuidas');
  // Selected opportunity for detail panel
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  // Filters
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedScoreFilter, setSelectedScoreFilter] = useState('all');
  // Mobile detail fullscreen state
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Tab definitions
  const tabs: { id: OpportunityStage; label: string }[] = [
    { id: 'minhas', label: 'Minhas' },
    { id: 'nao_atribuidas', label: 'Não atribuídas' },
    { id: 'em_atendimento', label: 'Em atendimento' },
    { id: 'concluidas', label: 'Concluídas' },
    { id: 'descartadas', label: 'Descartadas' },
  ];

  // Calculate counts for each tab
  const tabCounts = useMemo(() => {
    const counts: Record<OpportunityStage, number> = {
      minhas: 0,
      nao_atribuidas: 0,
      em_atendimento: 0,
      concluidas: 0,
      descartadas: 0,
    };
    opportunities.forEach((opp) => {
      if (counts[opp.stage] !== undefined) {
        counts[opp.stage]++;
      }
    });
    return counts;
  }, [opportunities]);

  // Filter opportunities based on activeStage, search, group, and score
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Stage match
      if (opp.stage !== activeStage) return false;

      // Group match
      if (selectedGroup !== 'all' && opp.groupName !== selectedGroup) return false;

      // Score filter match
      if (selectedScoreFilter === '80+' && opp.score < 80) return false;
      if (selectedScoreFilter === '70+' && opp.score < 70) return false;
      if (selectedScoreFilter === '60+' && opp.score < 60) return false;

      // Search query match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = opp.title.toLowerCase().includes(query);
        const matchesContact = opp.contactName.toLowerCase().includes(query);
        const matchesMessage = opp.messageOriginal.toLowerCase().includes(query);
        const matchesSegment = opp.segment.toLowerCase().includes(query);
        const matchesGroup = opp.groupName.toLowerCase().includes(query);
        return (
          matchesTitle ||
          matchesContact ||
          matchesMessage ||
          matchesSegment ||
          matchesGroup
        );
      }

      return true;
    });
  }, [opportunities, activeStage, selectedGroup, selectedScoreFilter, searchQuery]);

  // Find currently selected opportunity object
  const selectedOpportunity = useMemo(() => {
    if (!selectedOpportunityId) {
      // Default to first item if available on desktop
      return filteredOpportunities[0] || null;
    }
    return (
      opportunities.find((o) => o.id === selectedOpportunityId) ||
      filteredOpportunities[0] ||
      null
    );
  }, [selectedOpportunityId, opportunities, filteredOpportunities]);

  const handleSelectOpportunity = (opp: Opportunity) => {
    setSelectedOpportunityId(opp.id);
    // On mobile screens (< 1024px / lg), open fullscreen overlay
    if (window.innerWidth < 1024) {
      setIsMobileDetailOpen(true);
    }
  };

  const handleCloseMobileDetail = () => {
    setIsMobileDetailOpen(false);
  };

  return (
    <div id="opportunities-page-container" className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f7f5]">
      {/* Top Header Controls: Search & Group/Score Filters */}
      <div className="bg-white px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[#e5ebe7] shrink-0">
        <OpportunitiesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGroup={selectedGroup}
          onSelectedGroupChange={setSelectedGroup}
          selectedScoreFilter={selectedScoreFilter}
          onSelectedScoreFilterChange={setSelectedScoreFilter}
          groups={groups}
          totalCount={filteredOpportunities.length}
          onOpenMobileMenu={onOpenMobileMenu}
        />

        {/* Stage Filter Tabs (Minhas, Não atribuídas, Em atendimento, Concluídas, Descartadas) */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-3 overflow-x-auto no-scrollbar border-t border-[#f0f4f1] mt-2.5">
          {tabs.map((tab) => {
            const isActive = activeStage === tab.id;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                id={`stage-tab-${tab.id}`}
                onClick={() => {
                  setActiveStage(tab.id);
                  // Auto-select first in new tab if available
                  const firstInTab = opportunities.find((o) => o.stage === tab.id);
                  if (firstInTab) {
                    setSelectedOpportunityId(firstInTab.id);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#12382c] text-white shadow-xs'
                    : 'bg-[#f4f7f5] text-[#596b63] hover:bg-[#e9f0ec] hover:text-[#18392d]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#e2ebe6] text-[#4d5f56]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split-Screen Main Content: Opportunities List (Left) + Detail Panel (Right on Desktop) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Column: List of Opportunities */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3">
          {filteredOpportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-[#d8e3dc]">
              <div className="w-12 h-12 rounded-full bg-[#f0f5f2] flex items-center justify-center text-[#12382c] mb-3">
                <HugeIcon icon={FilterIcon} size={22} />
              </div>
              <h4 className="text-sm font-bold text-[#1a2f26]">
                Nenhuma oportunidade nesta etapa
              </h4>
              <p className="text-xs text-[#687a71] max-w-sm mt-1">
                Não há leads correspondentes aos filtros selecionados. Tente ajustar a busca ou escolher outra aba.
              </p>
            </div>
          ) : (
            filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                isSelected={selectedOpportunity?.id === opp.id}
                onSelect={handleSelectOpportunity}
              />
            ))
          )}
        </div>

        {/* Right Column: Detail Panel (DESKTOP MASTER-DETAIL) */}
        {selectedOpportunity && (
          <div className="hidden lg:flex w-[430px] xl:w-[480px] shrink-0 h-full border-l border-[#e4ece7]">
            <OpportunityDetailPanel
              opportunity={selectedOpportunity}
              onClose={() => setSelectedOpportunityId(null)}
              onUpdateStatus={onUpdateOpportunityStatus}
              onAssignUser={onAssignOpportunityUser}
              onStartContact={onStartContact}
            />
          </div>
        )}
      </div>

      {/* MOBILE FULLSCREEN DETAIL VIEW */}
      {/* "No mobile, não coloque o painel de detalhes abaixo da lista. Ao clicar em uma oportunidade, abra os detalhes em uma tela/modal fullscreen sobre a página, com botão de voltar/fechar no topo. Ao fechar, o usuário deve retornar exatamente à posição anterior da lista." */}
      {isMobileDetailOpen && selectedOpportunity && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white">
          <OpportunityDetailPanel
            opportunity={selectedOpportunity}
            onClose={handleCloseMobileDetail}
            onUpdateStatus={onUpdateOpportunityStatus}
            onAssignUser={onAssignOpportunityUser}
            onStartContact={onStartContact}
            isMobileFullscreen={true}
          />
        </div>
      )}
    </div>
  );
};
