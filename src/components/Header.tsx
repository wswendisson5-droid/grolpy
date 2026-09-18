import React from 'react';
import { RadarStatus } from '../types/nexus';
import { Search, Pause, Play, Menu } from 'lucide-react';
import { NexusLogo } from './NexusLogo';

interface HeaderProps {
  radarStatus: RadarStatus;
  monitoredGroupsCount: number;
  lastUpdateTime: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleRadar: () => void;
  onOpenMobileMenu?: () => void;
  onAddGroup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  radarStatus,
  monitoredGroupsCount,
  lastUpdateTime,
  searchQuery,
  onSearchChange,
  onToggleRadar,
  onOpenMobileMenu,
  onAddGroup,
}) => {
  const isRunning = radarStatus === 'active';

  return (
    <header
      id="nexus-header"
      className="w-full flex flex-col gap-3 py-1 select-none"
    >
      {/* Mobile Top Row (Only visible on screens < lg) */}
      <div className="flex lg:hidden items-center justify-between gap-2 pb-1 border-b border-[#e9eee9]">
        <div className="flex items-center gap-2">
          <button
            id="mobile-menu-btn"
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl bg-white border border-[#e2e8e4] text-[#143227] hover:bg-[#f2f6f4] transition-colors"
            aria-label="Abrir menu de navegação"
          >
            <Menu size={18} />
          </button>
          <NexusLogo showText size={22} />
        </div>

        <div className="flex items-center gap-1.5 xs:gap-2">
          {/* Quick Add / Manage Groups Button on Mobile */}
          {onAddGroup && (
            <button
              onClick={onAddGroup}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Gerenciar grupos monitorados"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{monitoredGroupsCount} Grupos</span>
            </button>
          )}

          {/* Quick status pill for mobile */}
          <button
            onClick={onToggleRadar}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
              isRunning
                ? 'bg-[#e8f6ed] text-[#124231] border-[#d2ecd9]'
                : 'bg-[#f4f5f4] text-[#4a5550] border-[#e2e6e3]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-[#10b981] animate-pulse' : 'bg-[#94a39b]'
              }`}
            />
            <span className="hidden sm:inline">
              {isRunning ? 'Ativo' : 'Pausado'}
            </span>
          </button>

          {/* Mobile Radar Action Button */}
          <button
            onClick={onToggleRadar}
            className={`p-2 rounded-xl text-white font-semibold shadow-xs shrink-0 cursor-pointer ${
              isRunning
                ? 'bg-[#12382c] hover:bg-[#0c261e]'
                : 'bg-[#059669] hover:bg-[#047857]'
            }`}
            title={isRunning ? 'Pausar radar' : 'Ativar radar'}
            aria-label={isRunning ? 'Pausar radar' : 'Ativar radar'}
          >
            {isRunning ? (
              <Pause size={15} className="fill-white" />
            ) : (
              <Play size={15} className="fill-white" />
            )}
          </button>
        </div>
      </div>

      {/* Main Header Row (Desktop full layout & Mobile secondary row) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left info cluster */}
        <div className="hidden lg:flex flex-wrap items-center gap-3">
          {/* Radar Status Pill */}
          <button
            id="radar-status-indicator-pill"
            onClick={onToggleRadar}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isRunning
                ? 'bg-[#e8f6ed] text-[#124231] border border-[#d2ecd9] hover:bg-[#dff2e6]'
                : 'bg-[#f4f5f4] text-[#4a5550] border border-[#e2e6e3] hover:bg-[#ebeceb]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-[#10b981] animate-pulse' : 'bg-[#94a39b]'
              }`}
            />
            <span>{isRunning ? 'Radar ativo' : 'Radar pausado'}</span>
          </button>

          {/* Monitored count */}
          <span className="text-xs font-semibold text-[#48564f]">
            Monitorando {monitoredGroupsCount} grupos
          </span>

          {/* Last update */}
          <span className="text-xs text-[#7e8e86]">
            Última atualização: {lastUpdateTime}
          </span>
        </div>

        {/* Mobile Info Bar (below top row) */}
        <div className="flex lg:hidden items-center justify-between text-[11px] text-[#6b7b72] px-1">
          <span className="font-semibold text-[#3b4c44]">
            Monitorando {monitoredGroupsCount} grupos
          </span>
          <span>{lastUpdateTime}</span>
        </div>

        {/* Right control cluster: Search + Radar Action Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial justify-end">
          {/* Search input */}
          <div className="relative w-full sm:w-72 md:w-80 lg:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7b8c83]">
              <Search size={15} />
            </div>
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar contatos, grupos ou palavras..."
              className="w-full pl-9 pr-11 py-2 text-xs rounded-xl bg-white border border-[#e2e8e4] text-[#1e2a24] placeholder-[#8c9c94] focus:outline-none focus:ring-2 focus:ring-[#143d2f]/15 focus:border-[#143d2f] transition-all shadow-xs"
            />
            <div className="hidden sm:flex absolute inset-y-0 right-0 pr-2.5 items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-[#7e8e86] bg-[#f1f4f2] border border-[#e0e5e2] rounded">
                ⌘ K
              </kbd>
            </div>
          </div>

          {/* Action Toggle Button: Desktop */}
          <button
            id="toggle-radar-btn"
            onClick={onToggleRadar}
            className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 shadow-sm shrink-0 cursor-pointer ${
              isRunning
                ? 'bg-[#12382c] hover:bg-[#0c261e] text-white border border-[#164335]'
                : 'bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981]'
            }`}
          >
            {isRunning ? (
              <>
                <Pause size={14} className="fill-white" />
                <span>Pausar radar</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-white" />
                <span>Ativar radar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
