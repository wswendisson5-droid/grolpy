import React from 'react';
import { ClientBanner } from '../components/ClientBanner';
import { ClientMetricsRow } from '../components/ClientMetricsRow';
import { ClientAgendaToday } from '../components/ClientAgendaToday';
import { ClientWhatsAppCard } from '../components/ClientWhatsAppCard';
import { ClientNextSendsCard } from '../components/ClientNextSendsCard';
import { ClientActiveDivulgacoes } from '../components/ClientActiveDivulgacoes';
import { ClientPlanUsageCard } from '../components/ClientPlanUsageCard';

import { AgendaItem, DivulgacaoCard, ClientPlanUsage, ClientTab } from '../types';

interface ClientHomeViewProps {
  agendaItems: AgendaItem[];
  campaigns: DivulgacaoCard[];
  planUsage: ClientPlanUsage;
  groupsCount?: number;
  stats?: {
    messagesSent?: number;
    sentToday?: number;
    activeGroups?: number;
    successRate?: number | string;
    activeCampaigns?: number;
    scheduledToday?: number;
    pending?: number;
    failed?: number;
  };
  onNavigateTab: (tab: ClientTab) => void;
  onNewCampaign: () => void;
  onToggleCampaignActive: (id: string) => void;
  onSendNow?: (id: string) => void;
  whatsappProfilePic?: string;
  whatsappProfileName?: string;
  whatsappPhoneNumber?: string;
  whatsappIsConnected?: boolean;
}

export const ClientHomeView: React.FC<ClientHomeViewProps> = ({
  agendaItems,
  campaigns,
  planUsage,
  groupsCount = 0,
  stats,
  onNavigateTab,
  onNewCampaign,
  onToggleCampaignActive,
  onSendNow,
  whatsappProfilePic,
  whatsappProfileName,
  whatsappPhoneNumber,
  whatsappIsConnected,
}) => {
  const activeCampaigns = campaigns.filter((c) => c.active);
  const totalSentMessages = stats?.messagesSent !== undefined
    ? stats.messagesSent
    : (planUsage.usedMessages || campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0));
  const activeGroups = whatsappIsConnected === true ? groupsCount : 0;
  const successRate = stats?.successRate !== undefined ? `${stats.successRate}%` : (totalSentMessages > 0 ? '100%' : '0%');
  const activeCampaignsCount = stats?.activeCampaigns !== undefined ? stats.activeCampaigns : activeCampaigns.length;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {whatsappIsConnected === false && groupsCount === 0 && !whatsappPhoneNumber && !whatsappProfilePic && (
        <div className="bg-white border border-[#dce8e1] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#173126]">WhatsApp ainda não conectado</p>
            <p className="text-xs text-[#667b70] mt-0.5">Conecte seu número para começar a enviar divulgações.</p>
          </div>
          <button onClick={() => onNavigateTab('conexao')} className="shrink-0 px-4 py-2 rounded-xl bg-[#109353] text-white text-xs font-bold hover:bg-[#0d7f47] transition-colors">
            Conectar
          </button>
        </div>
      )}
      {/* 1. 4 METRIC INDICATORS ROW */}
      <ClientMetricsRow
        totalSentMessages={totalSentMessages}
        activeGroupsCount={activeGroups}
        successRate={successRate}
        activeCampaignsCount={activeCampaignsCount}
      />

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        
        {/* Left Column (8 cols): Agenda + Divulgações Ativas */}
        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-5">
          <ClientAgendaToday
            items={agendaItems}
            onOpenDetails={() => onNavigateTab('agendamentos')}
          />
          <ClientActiveDivulgacoes
            campaigns={campaigns}
            onToggleActive={onToggleCampaignActive}
            onViewAll={() => onNavigateTab('divulgacoes')}
            onSendNow={onSendNow}
          />
        </div>

        {/* Right Column (4 cols): WhatsApp + Próximos Envios + Uso da Conta */}
        <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-5">
          <ClientWhatsAppCard
            groupsCount={groupsCount}
            onNavigateToConnection={() => onNavigateTab('conexao')}
            initialProfilePic={whatsappProfilePic}
            initialProfileName={whatsappProfileName}
            initialPhoneNumber={whatsappPhoneNumber}
            whatsappIsConnected={whatsappIsConnected}
          />
          <ClientPlanUsageCard
            usage={planUsage}
            onNewCampaign={onNewCampaign}
          />
          <ClientNextSendsCard
            items={agendaItems.filter((item) => item.status === 'agendado' || item.status === 'enviando')}
            onViewAll={() => onNavigateTab('agendamentos')}
            onNewCampaign={onNewCampaign}
          />
        </div>

      </div>
    </div>
  );
};
