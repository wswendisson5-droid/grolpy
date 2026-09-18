import React, { useState } from 'react';
import {
  HugeIcon,
  Search01Icon,
  Notification01Icon,
  UserIcon,
  WhatsappIcon,
  ChevronDownIcon,
  RefreshIcon,
} from '../icons/HugeIcon';
import { Menu } from 'lucide-react';

interface CrmHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileMenu?: () => void;
  instanceName?: string;
  instances?: Array<{
    name: string;
    connectionStatus: string;
    profileName?: string;
    contactCount?: number;
  }>;
  onSelectInstance?: (name: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const CrmHeader: React.FC<CrmHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  instanceName = 'minhabagg-store-209',
  instances = [],
  onSelectInstance,
  onRefresh,
  isRefreshing = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header
      id="crm-header-bar"
      className="h-16 px-4 lg:px-6 bg-white border-b border-[#eaefec] flex items-center justify-between gap-4 shrink-0 select-none z-10"
    >
      {/* Left: Mobile Menu Trigger + Global Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            aria-label="Abrir menu"
            className="lg:hidden p-2 rounded-xl text-[#52665b] hover:text-[#12382c] hover:bg-[#f1f6f3] transition-colors"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#75887e]">
            <HugeIcon icon={Search01Icon} size={16} />
          </div>
          <input
            type="text"
            id="crm-global-search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas, contatos ou mensagens..."
            className="w-full pl-10 pr-12 py-2 bg-[#f6f9f7] hover:bg-[#f1f5f3] focus:bg-white text-xs text-[#1a2e24] placeholder-[#75887e] border border-transparent focus:border-[#c5d8cf] focus:ring-2 focus:ring-[#12382c]/10 rounded-xl transition-all outline-hidden"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-[#75887e] bg-white border border-[#dde6e1] rounded-md shadow-2xs">
              ⌘ K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Evolution Live Status Pill & Instance Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh contacts button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-[#5c7065] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer border border-[#e4ebe6]"
            title="Atualizar conversas do WhatsApp"
          >
            <HugeIcon
              icon={RefreshIcon}
              size={16}
              className={isRefreshing ? 'animate-spin text-[#12382c]' : ''}
            />
          </button>
        )}

        {/* Active Instance Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f4faf6] hover:bg-[#eaf4ef] border border-[#d8ebe0] transition-colors cursor-pointer"
            title="Trocar instância da Evolution API"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="absolute w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-40" />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[11px] font-bold text-[#12382c] font-mono truncate max-w-[120px] sm:max-w-[160px]">
                {instanceName}
              </span>
              <span className="text-[9px] text-[#556b60]">
                WhatsApp Conectado
              </span>
            </div>
            <HugeIcon icon={ChevronDownIcon} size={14} className="text-[#556b60]" />
          </button>

          {/* Instance Selection Menu */}
          {isDropdownOpen && instances.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e0e8e3] rounded-2xl shadow-xl z-50 p-2 text-xs">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#63766c] border-b border-[#f0f4f1] mb-1">
                  Instâncias da Evolution API
                </div>
                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                  {instances.map((inst) => {
                    const isSelected = inst.name === instanceName;
                    const isOpen = inst.connectionStatus === 'open';
                    return (
                      <button
                        key={inst.name}
                        onClick={() => {
                          if (onSelectInstance) onSelectInstance(inst.name);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#12382c] text-white font-semibold'
                            : 'hover:bg-[#f2f7f4] text-[#142d23]'
                        }`}
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-mono text-xs truncate">
                            {inst.name}
                          </span>
                          <span
                            className={`text-[10px] ${
                              isSelected ? 'text-white/80' : 'text-[#6c7f75]'
                            }`}
                          >
                            {inst.profileName || 'WhatsApp'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                            isOpen
                              ? isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-[#eaf5ef] text-[#108e66]'
                              : isSelected
                              ? 'bg-amber-400/30 text-amber-100'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isOpen ? 'Conectada' : 'Aguardando'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notification Bell */}
        <button
          id="crm-notification-btn"
          aria-label="Notificações"
          className="relative p-2 rounded-xl text-[#5c7065] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer border border-[#e4ebe6]"
        >
          <HugeIcon icon={Notification01Icon} size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>

        {/* User Profile Shortcut */}
        <button
          id="crm-user-btn"
          aria-label="Perfil do usuário"
          className="p-2 rounded-xl text-[#5c7065] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer border border-[#e4ebe6]"
        >
          <HugeIcon icon={UserIcon} size={18} />
        </button>
      </div>
    </header>
  );
};
