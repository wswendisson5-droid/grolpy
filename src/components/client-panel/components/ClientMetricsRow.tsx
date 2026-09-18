import React from 'react';
import { Send, Users, Clock, CalendarCheck } from 'lucide-react';

interface ClientMetricsRowProps {
  totalSentMessages?: number;
  activeGroupsCount?: number;
  successRate?: string | number;
  activeCampaignsCount?: number;
}

export const ClientMetricsRow: React.FC<ClientMetricsRowProps> = ({
  totalSentMessages = 0,
  activeGroupsCount = 0,
  successRate = '0%',
  activeCampaignsCount = 0,
}) => {
  const formattedRate = typeof successRate === 'number' ? `${successRate}%` : (successRate || '0%');

  const metrics = [
    {
      id: 'm-1',
      icon: Send,
      value: (totalSentMessages || 0).toLocaleString('pt-BR'),
      label: 'Mensagens enviadas',
      badgeText: totalSentMessages > 0 ? '↑ Ativo' : '0%',
      badgeSub: 'total de envios',
      badgeType: totalSentMessages > 0 ? 'up' : 'neutral',
    },
    {
      id: 'm-2',
      icon: Users,
      value: (activeGroupsCount || 0).toLocaleString('pt-BR'),
      label: 'Grupos ativos',
      badgeText: activeGroupsCount > 0 ? `${activeGroupsCount} sinc.` : '0 grupos',
      badgeSub: 'sincronizados',
      badgeType: activeGroupsCount > 0 ? 'up' : 'neutral',
    },
    {
      id: 'm-3',
      icon: Clock,
      value: formattedRate,
      label: 'Taxa de sucesso',
      badgeText: totalSentMessages > 0 ? '100%' : '0%',
      badgeSub: 'entregas concluídas',
      badgeType: totalSentMessages > 0 ? 'up' : 'neutral',
    },
    {
      id: 'm-4',
      icon: CalendarCheck,
      value: (activeCampaignsCount || 0).toLocaleString('pt-BR'),
      label: 'Divulgações ativas',
      badgeText: activeCampaignsCount > 0 ? `${activeCampaignsCount} ativas` : '0 ativas',
      badgeSub: 'em andamento',
      badgeType: activeCampaignsCount > 0 ? 'up' : 'neutral',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.id}
            id={`metric-card-${m.id}`}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#e5ebe7] shadow-xs flex flex-col justify-between transition-all hover:shadow-sm"
          >
            {/* Top row: Icon & Trend comparison */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#eaf6ef] flex items-center justify-center text-[#109353] shrink-0">
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col items-end text-right">
                <span className={`text-xs font-bold leading-none ${
                  m.badgeType === 'up' ? 'text-[#109353]' : 'text-amber-600'
                }`}>
                  {m.badgeText}
                </span>
                <span className="text-[10px] text-[#718479] font-medium mt-0.5">
                  {m.badgeSub}
                </span>
              </div>
            </div>

            {/* Bottom: Value & Label */}
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#11241c] leading-tight tracking-tight">
                {m.value}
              </span>
              <span className="text-xs sm:text-[13px] text-[#607468] font-medium leading-tight mt-0.5 truncate">
                {m.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

