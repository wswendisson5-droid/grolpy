import React from 'react';
import { Plus } from 'lucide-react';
import { ClientPlanUsage } from '../types';

interface ClientPlanUsageCardProps {
  usage: ClientPlanUsage;
  onNewCampaign?: () => void;
}

export const ClientPlanUsageCard: React.FC<ClientPlanUsageCardProps> = ({
  usage,
  onNewCampaign,
}) => {
  // SVG Donut calculation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const visualPercentage = usage.usedMessages > 0 
    ? Math.max(2, Math.min(100, usage.percentage)) 
    : 0;
  const strokeDashoffset = circumference - (visualPercentage / 100) * circumference;

  const displayPercentage = usage.percentage > 0 
    ? `${usage.percentage}%` 
    : usage.usedMessages > 0 
    ? `< 1%` 
    : `0%`;

  return (
    <div
      id="client-plan-usage-card"
      className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] shadow-xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f1]">
        <h3 className="text-base font-bold text-[#11241c]">Uso da sua conta</h3>
        <span className="text-xs font-semibold text-[#667a6f]">{usage.planName}</span>
      </div>

      {/* Donut Chart & Legend Row */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
        {/* Donut Radial Chart */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#e8efe9"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Active Progress Ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#109353"
              strokeWidth="9"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold text-[#11241c] leading-none">
              {displayPercentage}
            </span>
          </div>
        </div>

        {/* Legend Details */}
        <div className="flex flex-col gap-2 min-w-[140px]">
          <div className="text-[11px] text-[#63776c] font-medium mb-1">
            <span className="font-bold text-[#11241c]">{usage.usedMessages.toLocaleString('pt-BR')}</span> de {usage.totalMessages.toLocaleString('pt-BR')} no mês
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#109353]" />
              <span className="text-[#3d5145] font-medium">Enviadas</span>
            </div>
            <span className="font-bold text-[#11241c]">{usage.usedMessages.toLocaleString('pt-BR')}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
              <span className="text-[#3d5145] font-medium">Pendentes</span>
            </div>
            <span className="font-bold text-[#11241c]">{usage.pendingMessages}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              <span className="text-[#3d5145] font-medium">Falharam</span>
            </div>
            <span className="font-bold text-[#11241c]">{usage.failedMessages}</span>
          </div>
        </div>
      </div>

      {/* Action Button Card: Nova Divulgação */}
      <button
        id="btn-nova-divulgacao"
        onClick={onNewCampaign}
        className="mt-3 w-full p-3.5 rounded-2xl border-2 border-dashed border-[#cfe0d5] hover:border-[#109353] bg-[#f9fbf9] hover:bg-[#ebf6ef] flex items-center justify-center gap-3 transition-all cursor-pointer text-left group"
      >
        <div className="w-9 h-9 rounded-full bg-white border border-[#c6d7cc] group-hover:border-[#109353] flex items-center justify-center text-[#109353] shadow-2xs shrink-0">
          <Plus size={20} className="stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-bold text-[#11241c] group-hover:text-[#109353] transition-colors leading-tight">
            Nova divulgação
          </span>
          <span className="text-[11px] text-[#63756b] leading-tight">
            Crie uma nova campanha em poucos passos
          </span>
        </div>
      </button>
    </div>
  );
};
