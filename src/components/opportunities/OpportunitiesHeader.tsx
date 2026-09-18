import React from 'react';
import {
  HugeIcon,
  Search01Icon,
  FilterHorizontalIcon,
  Message02Icon,
  SparklesIcon,
} from '../icons/HugeIcon';
import { MonitoredGroup } from '../../types/nexus';

interface OpportunitiesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGroup: string;
  onSelectedGroupChange: (group: string) => void;
  selectedScoreFilter: string;
  onSelectedScoreFilterChange: (filter: string) => void;
  groups: MonitoredGroup[];
  totalCount: number;
  onOpenMobileMenu?: () => void;
}

export const OpportunitiesHeader: React.FC<OpportunitiesHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedGroup,
  onSelectedGroupChange,
  selectedScoreFilter,
  onSelectedScoreFilterChange,
  groups,
  totalCount,
}) => {
  return (
    <div
      id="opportunities-top-header"
      className="flex flex-col gap-3 py-1 select-none"
    >
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#75867e]">
            <HugeIcon icon={Search01Icon} size={16} />
          </div>
          <input
            id="opportunities-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por lead, mensagem, grupo ou segmento..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-[13px] rounded-xl bg-white border border-[#e1eae5] text-[#1c2923] placeholder-[#8d9d95] focus:outline-none focus:ring-2 focus:ring-[#143d2f]/15 focus:border-[#143d2f] transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#7e8e86] hover:text-[#18392d]"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Filter Controls Cluster */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
          {/* Group Filter Dropdown */}
          <div className="relative">
            <select
              id="filter-by-group"
              value={selectedGroup}
              onChange={(e) => onSelectedGroupChange(e.target.value)}
              className="appearance-none bg-white border border-[#e1eae5] text-[#2c3d35] text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-[#143d2f] shadow-xs cursor-pointer"
            >
              <option value="all">Todos os grupos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#778980]">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Score Filter */}
          <div className="relative">
            <select
              id="filter-by-score"
              value={selectedScoreFilter}
              onChange={(e) => onSelectedScoreFilterChange(e.target.value)}
              className="appearance-none bg-white border border-[#e1eae5] text-[#2c3d35] text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-[#143d2f] shadow-xs cursor-pointer"
            >
              <option value="all">Qualquer Score</option>
              <option value="80+">Score 80+ (Alta qualificação)</option>
              <option value="70+">Score 70+</option>
              <option value="60+">Score 60+</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#778980]">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Opportunities Counter Badge */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#eef5f1] border border-[#dbe7e1] text-xs font-bold text-[#143c2e] shrink-0">
            <HugeIcon icon={SparklesIcon} size={14} className="text-[#059669]" />
            <span>{totalCount} leads</span>
          </div>
        </div>
      </div>
    </div>
  );
};
