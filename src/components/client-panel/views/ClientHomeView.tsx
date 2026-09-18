import React from 'react';
import { ClientBanner } from '../components/ClientBanner';
import { ClientMetricsRow } from '../components/ClientMetricsRow';
import { ClientAgendaToday } from '../components/ClientAgendaToday';
import { ClientWhatsAppCard } from '../components/ClientWhatsAppCard';
import { ClientNextSendsCard } from '../components/ClientNextSendsCard';
import { ClientActiveDivulgacoes } from '../components/ClientActiveDivulgacoes';
import { ClientPlanUsageCard } from '../components/ClientPlanUsageCard';
import { ClientConexaoView } from './ClientConexaoView';
import { AgendaItem, DivulgacaoCard, ClientPlanUsage, ClientTab } from '../types';

interface ClientHomeViewProps {
  agendaItems: AgendaItem[];
  campaigns: DivulgacaoCard[];
  planUsage: ClientPlanUsage;
  groupsCount?: number;
  onNavigateTab: (tab: ClientTab) => void;
  onNewCampaign: () => void;
  onToggleCampaignActive: (id: string) => void;
  onSendNow?: (id: string) => void;
  whatsappProfilePic?: string;
  whatsappPhoneNumber?: string;
  whatsappIsConnected?: boolean;
}

export const ClientHomeView: React.FC<ClientHomeViewProps> = ({
  agendaItems,
  campaigns,
  planUsage,
  groupsCount = 0,
  onNavigateTab,
  onNewCampaign,
  onToggleCampaignActive,
  onSendNow,
  whatsappProfilePic,
  whatsappPhoneNumber,
  whatsappIsConnected,
}) => {
  if (whatsappIsConnected === false) {
    return <ClientConexaoView />;
  }

  const activeCampaigns = campaigns.filter((c) => c.active);
  const totalSentMessages = campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0);
  const successRate = totalSentMessages > 0 ? '100%' : '0%';

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* 1. 4 METRIC INDICATORS ROW */}
      <ClientMetricsRow
        totalSentMessages={totalSentMessages}
        activeGroupsCount={groupsCount}
        successRate={successRate}
        activeCampaignsCount={activeCampaigns.length}
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
