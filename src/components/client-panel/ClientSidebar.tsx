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
  HelpCircle,
  MoreVertical,
  X,
  LogOut
} from 'lucide-react';
import { ClientTab, AppPanelMode } from './types';
import { planService } from '../../services/planService';
import { sessionService } from '../../services/sessionService';
import { SafeAvatar } from '../common/SafeAvatar';

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
  whatsappProfileName?: string;
  whatsappPhoneNumber?: string;
  whatsappIsConnected?: boolean;
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
  whatsappProfileName,
  whatsappPhoneNumber,
  whatsappIsConnected,
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

  // ONLY: Início, Divulgações, Histórico, Relatórios, Conexão WhatsApp, Central de Ajuda e Configurações
  const navItems: { id: ClientTab; label: string; icon: React.FC<{ size?: number; className?: string }>; badge?: number }[] = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'divulgacoes', label: 'Divulgações', icon: Megaphone, badge: campaignsCount > 0 ? campaignsCount : undefined },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'conexao', label: 'Conexão WhatsApp', icon: MessageSquare },
    { id: 'ajuda', label: 'Central de Ajuda', icon: HelpCircle },
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
          {/* Card 1: Dynamic Subscription Box */}
          <div
            id="client-plan-box"
            className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col gap-2 ${
              subscription.status === 'active' && subscription.planId
                ? 'bg-[#fffdf5] border-[#fef3c7]'
                : 'bg-[#fef8f8] border-[#fee2e2]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    subscription.status === 'active' && subscription.planId
                      ? 'bg-[#fef08a] text-[#b45309]'
                      : 'bg-[#fee2e2] text-[#b91c1c]'
                  }`}
                >
                  <Crown
                    size={15}
                    className={
                      subscription.status === 'active' && subscription.planId
                        ? 'fill-[#b45309]'
                        : 'fill-[#b91c1c]'
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold leading-tight ${
                      subscription.status === 'active' && subscription.planId
                        ? 'text-[#78350f]'
                        : 'text-[#991b1b]'
                    }`}
                  >
                    {subscription.status === 'active' && subscription.planId
                      ? `Plano ${currentPlan.name}`
                      : 'Sem Plano Ativo'}
                  </span>
                  <span
                    className={`text-[10px] ${
                      subscription.status === 'active' && subscription.planId
                        ? 'text-[#92400e]'
                        : 'text-[#b91c1c]'
                    }`}
                  >
                    {subscription.status === 'active' && subscription.planId
                      ? (subscription.validUntil ? `Ativo até ${subscription.validUntil}` : 'Assinatura ativa')
                      : 'Assine para liberar os envios'}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {subscription.status === 'active' && subscription.planId && (
              <>
                <div className="w-full bg-[#fde68a] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#109353] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((uniqueGroupsCount / (currentPlan.maxGroups || 1)) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#92400e]">
                  <span>{uniqueGroupsCount} de {currentPlan.maxGroups} grupos</span>
                  <span className="font-bold">
                    {Math.min(100, Math.round((uniqueGroupsCount / (currentPlan.maxGroups || 1)) * 100))}%
                  </span>
                </div>
              </>
            )}

            <button
              onClick={() => onSelectTab('planos')}
              className={`w-full py-1.5 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center shadow-2xs ${
                subscription.status === 'active' && subscription.planId
                  ? 'bg-white hover:bg-[#fffbeb] text-[#78350f] border border-[#fde68a]'
                  : 'bg-[#109353] hover:bg-[#0d7c46] text-white'
              }`}
            >
              {subscription.status === 'active' && subscription.planId ? 'Gerenciar plano' : 'Escolher plano'}
            </button>
          </div>

          {/* User Profile & TROCA DE PAINEL */}
          {(() => {
            let loggedUser: { name: string; email: string; role?: string } = { name: 'Cliente', email: '', role: 'client' };
            const sessionUser = sessionService.getUser();
            if (sessionUser) loggedUser = { ...loggedUser, ...sessionUser };

            const displayName = whatsappProfileName || loggedUser.name || 'Cliente';
            const displaySubtitle = whatsappIsConnected
              ? (whatsappPhoneNumber || 'WhatsApp Conectado')
              : (subscription.status === 'active' && subscription.planId ? `Plano ${currentPlan.name}` : 'Sem plano');

            return (
              <div className="relative">
                <div
                  id="client-user-profile"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#eff5f1] transition-colors cursor-pointer border border-transparent hover:border-[#e2ebe5]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <SafeAvatar
                        src={whatsappProfilePic}
                        alt={displayName}
                        fallbackText={displayName}
                        shape="circle"
                        sizeClassName="w-8 h-8"
                        className="border-2 border-[#109353]/50"
                      />
                      {whatsappIsConnected && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#25d366] border-2 border-white" />
                      )}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-xs font-bold text-[#11241c] leading-tight truncate max-w-[125px]">
                        {displayName}
                      </span>
                      <span className="text-[11px] text-[#63756b] truncate max-w-[125px] flex items-center gap-1">
                        {whatsappIsConnected && <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] shrink-0 inline-block" />}
                        <span className="truncate">{displaySubtitle}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    className="p-1 text-[#83968d] hover:text-[#11241c] shrink-0"
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
                        <p className="font-bold text-[#11241c] truncate">{displayName}</p>
                        <p className="text-[#64786d] text-[11px] truncate">{loggedUser.email || (whatsappPhoneNumber || 'Conta Grolpy')}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {whatsappIsConnected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8f6ee] text-[#109353] rounded text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
                              WhatsApp Conectado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">
                              WhatsApp Desconectado
                            </span>
                          )}
                          <span className="inline-block px-2 py-0.5 bg-[#f0f4f1] text-[#4a5e52] rounded text-[10px] font-bold">
                            {subscription.status === 'active' && subscription.planId ? `Plano ${currentPlan.name}` : 'Sem plano'}
                          </span>
                        </div>
                      </div>

                      <div className="p-1.5 border-b border-[#f0f4f1] space-y-1">
                        {(loggedUser.role === 'admin' || loggedUser.email === 'wswendisson5@gmail.com' || loggedUser.email === 'mateus@gmail.com') && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onSwitchPanel && onSwitchPanel('admin');
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#eaf6ef] text-[#109353] font-bold cursor-pointer transition-colors"
                          >
                            <span>�a� Painel Admin (Radar)</span>
                          </button>
                        )}
                        <button onClick={()=>{setIsUserMenuOpen(false);onSwitchPanel&&onSwitchPanel('landing')}} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-red-50 text-red-600 font-bold cursor-pointer"><LogOut size={15}/>Sair da conta</button>
                      </div>

                      <div className="p-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleNavClick('configuracoes');
                          }}
                          className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-[#f2f7f4] text-[#3c5044] font-medium transition-colors cursor-pointer"
                        >
                          �a"️ Configurações da Conta
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </aside>
    </>
  );
};
