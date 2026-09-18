import React, { useState, useEffect } from 'react';
import {
  Home,
  Megaphone,
  Users,
  Calendar,
  History,
  BarChart3,
  MessageSquare,
  Settings,
  Crown,
  Headphones,
  MoreVertical,
  X,
  LogOut
} from 'lucide-react';
import { ClientTab, AppPanelMode } from './types';
import { planService } from '../../services/planService';

interface ClientSidebarProps {
  currentTab: ClientTab;
  onSelectTab: (tab: ClientTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onSwitchPanel?: (mode: AppPanelMode) => void;
  onOpenPlanModal?: () => void;
  onOpenSupportModal?: () => void;
  campaignsCount?: number;
  groupsCount?: number;
  uniqueGroupsCount?: number;
  whatsappProfilePic?: string;
}

export const ClientSidebar: React.FC<ClientSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile,
  onSwitchPanel,
  onOpenPlanModal,
  onOpenSupportModal,
  campaignsCount = 0,
  groupsCount = 0,
  uniqueGroupsCount = 0,
  whatsappProfilePic,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(planService.getCurrentPlan());
  const [subscription, setSubscription] = useState(planService.getSubscription());

  useEffect(() => {
    const unsub = planService.subscribe(() => {
      setCurrentPlan(planService.getCurrentPlan());
      setSubscription(planService.getSubscription());
    });
    return unsub;
  }, []);

  // ONLY: Início, Divulgações, Histórico, Relatórios, Conexão WhatsApp e Configurações
  const navItems: { id: ClientTab; label: string; icon: React.FC<{ size?: number; className?: string }>; badge?: number }[] = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'divulgacoes', label: 'Divulgações', icon: Megaphone, badge: campaignsCount > 0 ? campaignsCount : undefined },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'conexao', label: 'Conexão WhatsApp', icon: MessageSquare },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleNavClick = (tab: ClientTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="client-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="client-sidebar"
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-72 lg:w-64 shrink-0 bg-[#fafcfb] border-r border-[#e5ebe7] flex flex-col justify-between py-5 px-3.5 select-none h-screen transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Logo & Navigation */}
        <div className="flex flex-col gap-5 overflow-y-auto pr-1">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <img
              src="https://i.imgur.com/HqvEmQF.png"
              alt="Grouply"
              referrerPolicy="no-referrer"
              className="h-10 w-auto object-contain max-w-[170px]"
            />

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-[#6b7b72] hover:bg-[#ebf2ee]"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`client-nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13.5px] font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#e7f6ed] text-[#0c7a44] shadow-xs'
                      : 'text-[#53655b] hover:text-[#11241c] hover:bg-[#eff5f1]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={isActive ? 'text-[#0c7a44] stroke-[2.4]' : 'text-[#6b7e73] stroke-[1.8]'}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isActive
                          ? 'bg-[#0c7a44] text-white'
                          : 'bg-[#e2ebe5] text-[#3d5145]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Plan Card + Support Card + User Card */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-[#ebf1ed] mt-2">
          {/* Card 1: Plano Pro / Start / Max */}
          <div
            id="client-plan-box"
            className="p-3.5 rounded-2xl bg-[#fffdf5] border border-[#fef3c7] shadow-2xs flex flex-col gap-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#fef08a] flex items-center justify-center text-[#b45309]">
                  <Crown size={15} className="fill-[#b45309]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#78350f] leading-tight">Plano {currentPlan.name}</span>
                  <span className="text-[10px] text-[#92400e]">Ativo até {subscription.validUntil}</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#fde68a] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#109353] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((uniqueGroupsCount / currentPlan.maxGroups) * 100))}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#92400e]">
              <span>{uniqueGroupsCount} de {currentPlan.maxGroups} grupos utilizados</span>
              <span className="font-bold">
                {Math.min(100, Math.round((uniqueGroupsCount / currentPlan.maxGroups) * 100))}%
              </span>
            </div>

            <button
              onClick={() => onSelectTab('planos')}
              className="w-full py-1.5 px-2 bg-white hover:bg-[#fffbeb] text-[#78350f] text-xs font-bold rounded-xl border border-[#fde68a] transition-all cursor-pointer text-center shadow-2xs"
            >
              Gerenciar plano
            </button>
          </div>

          {/* User Profile & TROCA DE PAINEL */}
          <div className="relative">
            <div
              id="client-user-profile"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#eff5f1] transition-colors cursor-pointer border border-transparent hover:border-[#e2ebe5]"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={whatsappProfilePic || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"}
                  alt="Wendisson Santos"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-[#c8d9cf]"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[#11241c] leading-tight">
                    Wendisson Santos
                  </span>
                  <span className="text-[11px] text-[#63756b]">Minha empresa</span>
                </div>
              </div>

              <button
                className="p-1 text-[#83968d] hover:text-[#11241c]"
                aria-label="Opções"
              >
                <MoreVertical size={16} />
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
                    <p className="font-bold text-[#11241c]">Wendisson Santos</p>
                    <p className="text-[#64786d] text-[11px]">Minha empresa • Plano Pro</p>
                  </div>

                  <div className="p-1.5 border-b border-[#f0f4f1]">
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
                      ⚙️ Configurações da Conta
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
