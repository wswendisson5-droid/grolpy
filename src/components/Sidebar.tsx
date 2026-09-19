import React, { useState } from 'react';
import { NexusLogo } from './NexusLogo';
import {
  HugeIcon,
  RadarIcon,
  Target02Icon,
  Message01Icon,
  WhatsappIcon,
  DashboardSquare01Icon,
  UserMultipleIcon,
  Message02Icon,
  ChartBarLineIcon,
  Settings01Icon,
  Cancel01Icon,
  MoreHorizontalIcon,
  ChevronDownIcon,
  LightningIcon,
} from './icons/HugeIcon';
import { Wifi, LogOut, Megaphone } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  evolutionStatus?: string;
  onSwitchPanel?: (mode: 'landing' | 'admin' | 'client') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeCount = 12,
  isOpenMobile = false,
  onCloseMobile,
  evolutionStatus = 'Conectado',
  onSwitchPanel,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems = [
    { id: 'radar', label: 'Radar', icon: RadarIcon, count: undefined },
    { id: 'assinantes', label: 'Assinantes', icon: UserMultipleIcon, count: undefined },
    { id: 'oportunidades', label: 'Oportunidades', icon: Target02Icon, count: activeCount },
    { id: 'crm', label: 'CRM', icon: Message01Icon, count: undefined },
    { id: 'crm_atendimento', label: 'CRM Atendimento', icon: LightningIcon, badge: 'IA', count: undefined },
    { id: 'ia_config', label: 'Configuração IA', icon: Settings01Icon, count: undefined },
    { id: 'conexao', label: 'Conexão', icon: WhatsappIcon, count: undefined },
    { id: 'contatos', label: 'Contatos', icon: UserMultipleIcon, count: undefined },
    { id: 'grupos', label: 'Grupos', icon: Message02Icon, count: undefined },
    { id: 'relatorios', label: 'Relatórios', icon: ChartBarLineIcon, count: undefined },
    { id: 'configuracoes', label: 'Configurações', icon: Settings01Icon, count: undefined },
  ];

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="nexus-sidebar"
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-72 lg:w-60 shrink-0 bg-white border-r border-[#eaefec] flex flex-col justify-between py-5 lg:py-6 px-4 select-none h-screen transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col gap-6 lg:gap-7 overflow-y-auto">
          {/* Brand Header with Mobile Close Button */}
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <NexusLogo size={32} />
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-[#6b7b72] hover:text-[#18392d] hover:bg-[#f1f5f3]"
              aria-label="Fechar menu"
            >
              <HugeIcon icon={Cancel01Icon} size={20} />
            </button>
          </div>

          {/* Navigation List */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#d8ece4] text-[#12382c] font-semibold shadow-[0_1px_3px_rgba(18,56,44,0.05)]'
                      : 'text-[#506057] hover:text-[#18392d] hover:bg-[#f3f7f4]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HugeIcon
                      icon={icon}
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.6}
                      className={isActive ? 'text-[#12382c]' : 'text-[#63756b]'}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white tracking-wide uppercase">
                      {item.badge}
                    </span>
                  )}

                  {item.count !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isActive
                          ? 'bg-[#12382c] text-white'
                          : 'bg-[#1a2621] text-white'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Evolution API Status Card & User Profile */}
        <div className="flex flex-col gap-3.5 lg:gap-4 mt-4 pt-3 border-t border-[#f0f4f1]">
          {/* Evolution API Card */}
          <div
            id="evolution-api-card"
            onClick={() => handleNavClick('conexao')}
            className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e5ebe7] flex flex-col gap-2 hover:bg-[#f1f6f3] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#12382c] flex items-center justify-center text-emerald-400 shrink-0">
                  <HugeIcon icon={LightningIcon} size={14} className="fill-emerald-400 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#142d23] leading-tight">
                    Evolution
                  </span>
                  <span className={`text-[11px] font-semibold leading-none ${
                    evolutionStatus === 'Conectado'
                      ? 'text-[#059669]'
                      : evolutionStatus === 'Conectando...'
                      ? 'text-amber-600'
                      : 'text-[#6b7b72]'
                  }`}>
                    {evolutionStatus}
                  </span>
                </div>
              </div>
              <HugeIcon icon={ChevronDownIcon} size={14} className="text-[#8c9e94]" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6b7b72] pt-1 border-t border-[#ebf0ec]">
              <span>3 grupos ativos</span>
              <span>Última msg há 2 min</span>
            </div>
          </div>

          {/* Current User Card with Panel Switcher */}
          <div className="relative">
            <div
              id="user-profile-card"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[#f3f7f4] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
                    alt="Enzo Santos"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-[#d9e4de]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#172d24] leading-tight">
                    Enzo Santos
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[11px] text-[#55665d]">Online • Admin</span>
                  </div>
                </div>
              </div>

              <button
                id="user-options-btn"
                aria-label="Opções de usuário"
                className="p-1 rounded-lg text-[#7c8d84] hover:text-[#18392d] hover:bg-[#e7eee9]"
              >
                <HugeIcon icon={MoreHorizontalIcon} size={16} />
              </button>
            </div>

            {/* TROCA DE PAINEL MENU POPUP */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e2eae5] py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-[#f0f4f1]">
                    <p className="font-bold text-[#11241c]">Enzo Santos</p>
                    <p className="text-[#64786d] text-[11px]">Administrador do Sistema</p>
                  </div>

                  <div className="p-1.5 border-b border-[#f0f4f1] space-y-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSwitchPanel && onSwitchPanel('client');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#eaf6ef] text-[#109353] font-bold cursor-pointer transition-colors"
                    >
                      <Megaphone size={15} />
                      <span>Ir para o Painel do Cliente</span>
                    </button>
                    <button onClick={()=>{setIsUserMenuOpen(false);onSwitchPanel&&onSwitchPanel('landing')}} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-red-50 text-red-600 font-bold"><LogOut size={15}/>Sair da conta</button>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleNavClick('configuracoes');
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-[#f2f7f4] text-[#3c5044] font-medium transition-colors cursor-pointer"
                    >
                      ⚙️ Configurações Gerais
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
