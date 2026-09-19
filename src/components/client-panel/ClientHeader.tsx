import React, { useState } from 'react';
import { Search, UserPlus, Bell, ChevronDown, Menu, Check, Building, Shield, LogOut, ArrowLeftRight, User, Loader2, Zap, Crown, Flame, AlertCircle } from 'lucide-react';
import { AppPanelMode } from './types';
import { planService } from '../../services/planService';

interface ClientHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileMenu: () => void;
  onImportGroups?: () => void;
  onSwitchPanel?: (mode: AppPanelMode) => void;
  onOpenPlanModal?: () => void;
  whatsappProfilePic?: string;
  whatsappProfileName?: string;
  whatsappPhoneNumber?: string;
  whatsappIsConnected?: boolean;
  isLoadingProfile?: boolean;
  planUsage?: {
    usedMessages: number;
    totalMessages: number;
    percentage: number;
    pendingMessages?: number;
    failedMessages?: number;
  };
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  onImportGroups,
  onSwitchPanel,
  onOpenPlanModal,
  whatsappProfilePic,
  whatsappProfileName,
  whatsappPhoneNumber,
  whatsappIsConnected,
  isLoadingProfile,
  planUsage,
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isPlanUsageDropdownOpen, setIsPlanUsageDropdownOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  let loggedUser = { name: 'Minha Empresa', email: '' };
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('groply_user') : null;
    if (raw) loggedUser = JSON.parse(raw);
  } catch {}

  const displayName = whatsappProfileName || loggedUser.name || 'Minha Conta';

  const sub = planService.getSubscription();
  const currentPlan = sub.plan;
  const maxMonthly = sub.status === 'active' && currentPlan ? currentPlan.maxMonthlySends : (planUsage?.totalMessages || 0);
  const usedMonthly = planUsage?.usedMessages || 0;
  const percentage = maxMonthly > 0 ? Math.min(100, Math.round((usedMonthly / maxMonthly) * 100)) : 0;
  const remainingMonthly = Math.max(0, maxMonthly - usedMonthly);

  // Status color based on percentage
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-[#ef4444] text-[#ef4444]';
    if (pct >= 75) return 'bg-[#f59e0b] text-[#f59e0b]';
    return 'bg-[#109353] text-[#109353]';
  };

  return (
    <header
      id="client-header"
      className="bg-white/95 backdrop-blur-md border-b border-[#e5ebe7] px-3 sm:px-5 lg:px-7 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 select-none w-full max-w-full overflow-visible"
    >
      {/* Mobile Menu Trigger & Logo on mobile */}
      <div className="flex items-center gap-2 lg:hidden shrink-0">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 rounded-xl text-[#3d5145] hover:bg-[#f0f4f1] transition-colors cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center">
          <img
            src="https://i.imgur.com/HqvEmQF.png"
            alt="Grouply"
            referrerPolicy="no-referrer"
            className="h-6 sm:h-7 w-auto object-contain max-w-[100px] sm:max-w-[130px]"
          />
        </div>
      </div>

      {/* Search Bar with ⌘ K shortcut */}
      <div className="hidden sm:flex items-center flex-1 min-w-0 max-w-[200px] md:max-w-xs lg:max-w-sm relative">
        <div className="absolute left-3 text-[#73857b] pointer-events-none flex items-center">
          <Search size={14} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar grupos, mensagens..."
          className="w-full pl-8 pr-8 py-1.5 bg-[#f6f9f7] hover:bg-[#f0f5f2] focus:bg-white text-xs text-[#11241c] placeholder-[#73857b] rounded-xl border border-[#e2eae5] focus:border-[#109353] focus:outline-none transition-all shadow-2xs"
        />
        <div className="absolute right-2.5 hidden md:flex items-center pointer-events-none">
          <kbd className="px-1 py-0.5 text-[9px] font-semibold text-[#73857b] bg-white border border-[#d9e3dd] rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0">
        {/* Compact Plan Usage Metric Widget in Navbar */}
        <div className="relative shrink-0">
          <button
            id="navbar-plan-usage-badge"
            onClick={() => setIsPlanUsageDropdownOpen(!isPlanUsageDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#f6f9f7] hover:bg-[#edf5f0] border border-[#dce8e0] hover:border-[#b8d6c3] rounded-xl text-left transition-all cursor-pointer shadow-2xs group"
            title="Clique para ver detalhes do limite do plano"
          >
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-lg bg-[#e8f7ee] border border-[#cbe9d6] flex items-center justify-center text-[#109353] shrink-0">
              <Zap size={12} className="text-[#109353] fill-[#109353]/30" />
            </div>

            {/* Mobile simplified view */}
            <div className="flex sm:hidden items-center gap-1">
              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                percentage >= 90
                  ? 'bg-red-100 text-red-700'
                  : percentage >= 75
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#e0f5e8] text-[#109353]'
              }`}>
                {percentage}%
              </span>
            </div>

            {/* Tablet/Desktop compact view */}
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-[#152e22] tracking-tight whitespace-nowrap">
                  {usedMonthly.toLocaleString('pt-BR')} / {maxMonthly.toLocaleString('pt-BR')}
                </span>
                <span className={`text-[9px] font-black px-1 py-0.2 rounded ${
                  percentage >= 90
                    ? 'bg-red-100 text-red-700'
                    : percentage >= 75
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-[#e0f5e8] text-[#109353]'
                }`}>
                  {percentage}%
                </span>
              </div>

              {/* Progress mini bar */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-12 lg:w-14 h-1 bg-[#e2ebe6] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentage >= 90 ? 'bg-red-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-[#109353]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold text-[#667d71] whitespace-nowrap">
                  {currentPlan.maxRoundsPerDay}x/dia
                </span>
              </div>
            </div>

            <ChevronDown size={11} className="text-[#7d9085] group-hover:text-[#109353] transition-colors shrink-0" />
          </button>

          {/* Plan Usage Detailed Dropdown Popover */}
          {isPlanUsageDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsPlanUsageDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#e0eae4] p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-[#edf3ef]">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#e8f7ee] text-[#109353]">
                      <Crown size={15} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#11241c] text-sm leading-tight">
                        Plano {currentPlan.name}
                      </h4>
                      <p className="text-[10px] text-[#6d8177]">
                        Válido até {sub.validUntil}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#e8f7ee] text-[#109353] rounded-md text-[10px] font-bold">
                    Ativo
                  </span>
                </div>

                {/* Monthly Dispatches Progress */}
                <div className="py-3 border-b border-[#edf3ef] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#44584e] flex items-center gap-1.5">
                      <Flame size={14} className="text-[#109353]" />
                      Envios no Mês
                    </span>
                    <span className="font-bold text-[#11241c]">
                      {usedMonthly.toLocaleString('pt-BR')} de {maxMonthly.toLocaleString('pt-BR')} ({percentage}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#edf3ef] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentage >= 90 ? 'bg-red-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-[#109353]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#71857a]">
                    <span>Restantes: <strong className="text-[#152e22] font-bold">{remainingMonthly.toLocaleString('pt-BR')}</strong> envios</span>
                    <span>Renova todo mês</span>
                  </div>
                </div>

                {/* Additional Limits Checklist */}
                <div className="py-3 border-b border-[#edf3ef] space-y-2.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#55695f] font-medium">⚡ Limite de Rodadas / Dia:</span>
                    <span className="font-bold text-[#152e22] px-2 py-0.5 bg-[#f3f7f4] rounded-md">
                      Até {currentPlan.maxRoundsPerDay} rodadas/dia por grupo
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#55695f] font-medium">👥 Grupos Únicos do Plano:</span>
                    <span className="font-bold text-[#152e22] px-2 py-0.5 bg-[#f3f7f4] rounded-md">
                      Até {currentPlan.maxGroups} grupos simultâneos
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#55695f] font-medium">📢 Divulgações Ativas:</span>
                    <span className="font-bold text-[#152e22] px-2 py-0.5 bg-[#f3f7f4] rounded-md">
                      Até {currentPlan.maxActiveCampaigns} campanhas
                    </span>
                  </div>
                </div>

                {/* Upgrade Action Button */}
                <div className="pt-3">
                  <button
                    onClick={() => {
                      setIsPlanUsageDropdownOpen(false);
                      onOpenPlanModal && onOpenPlanModal();
                    }}
                    className="w-full py-2 px-3 bg-[#109353] hover:bg-[#0d7d45] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer text-xs"
                  >
                    <Crown size={14} />
                    <span>Fazer Upgrade / Gerenciar Plano</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Importar Grupos Button */}
        <button
          id="btn-importar-grupos"
          onClick={onImportGroups}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-[#f6f9f7] text-[#1a2d24] text-xs font-bold rounded-xl border border-[#d8e2dc] shadow-2xs hover:border-[#b4c8bc] transition-all cursor-pointer shrink-0"
        >
          <UserPlus size={14} className="text-[#109353]" />
          <span>Importar grupos</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => setHasUnreadNotification(!hasUnreadNotification)}
          className="relative p-1.5 rounded-xl text-[#52655b] hover:text-[#11241c] hover:bg-[#f0f5f2] border border-transparent hover:border-[#e2eae5] transition-all cursor-pointer shrink-0"
          aria-label="Notificações"
        >
          <Bell size={17} />
          {hasUnreadNotification && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#ef4444] border-2 border-white" />
          )}
        </button>

        {/* Company Profile Dropdown Pill */}
        <div className="relative shrink-0">
          <button
            id="company-profile-menu-button"
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white hover:bg-[#f6f9f7] border border-[#d8e2dc] shadow-2xs transition-all cursor-pointer"
          >
            {/* Top Navbar Profile Picture: WhatsApp connected photo or user icon */}
            <div className="relative shrink-0">
              {whatsappProfilePic || whatsappIsConnected ? (
                <img
                  src={whatsappProfilePic || '/api/whatsapp/avatar'}
                  alt="Foto do Perfil WhatsApp"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('/api/whatsapp/avatar')) {
                      target.src = '/api/whatsapp/avatar';
                    }
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shadow-xs shrink-0 border-2 border-[#109353]/50"
                />
              ) : isLoadingProfile ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f2f7f4] border border-[#d3e3da] flex items-center justify-center shrink-0">
                  <Loader2 size={13} className="text-[#109353] animate-spin" />
                </div>
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#eaf6ef] border border-[#c4e6ce] flex items-center justify-center text-[#109353] font-bold text-xs shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {whatsappIsConnected && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#25d366] border-2 border-white shadow-2xs" />
              )}
            </div>

            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-[#11241c] leading-tight truncate max-w-[130px]">
                {displayName}
              </span>
              <span className="text-[9px] font-semibold text-[#109353] leading-none flex items-center gap-1 mt-0.5">
                {whatsappIsConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
                    <span>Conectado</span>
                  </>
                ) : (
                  <span>{sub.status === 'active' && currentPlan ? `Plano ${currentPlan.name}` : 'Sem plano'}</span>
                )}
              </span>
            </div>

            <ChevronDown size={11} className="text-[#7d9085] ml-0.5" />
          </button>

          {/* Profile & Panel Switcher Popover */}
          {isProfileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e2eae5] py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                {/* Header Info */}
                <div className="px-3.5 py-2.5 border-b border-[#f0f4f1]">
                  <p className="font-bold text-[#11241c] truncate">{displayName}</p>
                  <p className="text-[#64786d] text-[11px] truncate">{loggedUser.email || (whatsappPhoneNumber || 'Conta Grolpy')}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {whatsappIsConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8f7ee] text-[#109353] rounded text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
                        WhatsApp Conectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">
                        WhatsApp Desconectado
                      </span>
                    )}
                    <span className="inline-block px-2 py-0.5 bg-[#f0f4f1] text-[#4a5e52] rounded text-[10px] font-bold">
                      {sub.status === 'active' && currentPlan ? `Plano ${currentPlan.name}` : 'Sem plano'}
                    </span>
                  </div>
                </div>

                <div className="p-1.5 border-b border-[#f0f4f1]">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      onSwitchPanel && onSwitchPanel('landing');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-red-50 text-red-600 font-bold transition-colors cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>Sair da conta</span>
                  </button>
                </div>

                {/* Options */}
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      onOpenPlanModal && onOpenPlanModal();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-[#f2f7f4] text-[#3c5044] font-medium transition-colors cursor-pointer"
                  >
                    👑 Gerenciar Plano & Assinatura
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
