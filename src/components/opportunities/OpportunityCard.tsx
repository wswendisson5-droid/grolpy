import React from 'react';
import { Opportunity } from '../../types/nexus';
import {
  HugeIcon,
  Message01Icon,
  Clock01Icon,
  UserIcon,
} from '../icons/HugeIcon';

interface OpportunityCardProps {
  opportunity: Opportunity;
  isSelected: boolean;
  onSelect: (opportunity: Opportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isSelected,
  onSelect,
}) => {
  // Map stage to friendly status text and styling
  const getStatusBadge = () => {
    switch (opportunity.stage) {
      case 'minhas':
        return {
          label: 'Minha carteira',
          classes: 'bg-[#e8f6ed] text-[#059669] border-[#cbe9d4]',
        };
      case 'nao_atribuidas':
        return {
          label: 'Não atribuída',
          classes: 'bg-[#f4f7f5] text-[#55695f] border-[#e2e9e5]',
        };
      case 'em_atendimento':
        return {
          label: 'Em atendimento',
          classes: 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]',
        };
      case 'concluidas':
        return {
          label: 'Concluída',
          classes: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
        };
      case 'descartadas':
        return {
          label: 'Descartada',
          classes: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
        };
      default:
        return {
          label: 'Nova',
          classes: 'bg-[#f4f7f5] text-[#55695f] border-[#e2e9e5]',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      id={`opp-list-card-${opportunity.id}`}
      onClick={() => onSelect(opportunity)}
      className={`group relative w-full bg-white rounded-2xl p-3.5 sm:p-4 border transition-all duration-150 cursor-pointer select-none flex flex-col gap-2.5 ${
        isSelected
          ? 'border-[#12382c] ring-2 ring-[#12382c]/10 shadow-sm bg-[#fafdfb]'
          : 'border-[#eaefec] hover:border-[#d5e0d9] hover:bg-[#fafcfb] shadow-[0_1px_3px_rgba(18,56,44,0.02)]'
      }`}
    >
      {/* Top row: Avatar + Name/Segment + Score + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with status indicator */}
          <div className="relative shrink-0">
            <img
              src={opportunity.avatar}
              alt={opportunity.title}
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-[#e2eae5]"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                opportunity.score >= 80
                  ? 'bg-emerald-500'
                  : opportunity.score >= 65
                  ? 'bg-teal-500'
                  : 'bg-slate-400'
              }`}
            />
          </div>

          {/* Lead Name and Segment */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142d23] leading-tight truncate">
                {opportunity.title}
              </h3>
            </div>
            <span className="text-xs font-medium text-[#6c7d75] truncate mt-0.5">
              {opportunity.segment} • {opportunity.category}
            </span>
          </div>
        </div>

        {/* Right Header Cluster: Score Pill & Status Badge */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div
            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 border shadow-xs ${
              opportunity.score >= 80
                ? 'bg-[#ecf7f1] text-[#059669] border-[#cce8d6]'
                : opportunity.score >= 70
                ? 'bg-[#f0fdf9] text-[#0d9488] border-[#ccfbf1]'
                : 'bg-[#f1f5f3] text-[#4b5d53] border-[#e2e8e4]'
            }`}
          >
            <span className="text-[10px] font-semibold text-[#667a70] uppercase">Score</span>
            <span>{opportunity.score}</span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${statusBadge.classes}`}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Middle row: Detected message excerpt from WhatsApp */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-[#f7faf8] border border-[#e7ede9] text-xs text-[#2e3e36] leading-relaxed line-clamp-2">
        <span className="font-bold text-[#173a2d] mr-1">
          {opportunity.contactName}:
        </span>
        "{opportunity.messageOriginal}"
      </div>

      {/* Bottom row: WhatsApp Group, Relative Time, and Assignee */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#718279]">
        <div className="flex items-center gap-3">
          {/* WhatsApp Group */}
          <div className="flex items-center gap-1.5 font-medium text-[#485950] truncate max-w-[200px]">
            <HugeIcon icon={Message01Icon} size={13} className="text-[#059669] shrink-0" />
            <span className="truncate">{opportunity.groupName}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1 text-[#8b9c93]">
            <HugeIcon icon={Clock01Icon} size={12} className="shrink-0" />
            <span>{opportunity.relativeTime}</span>
          </div>
        </div>

        {/* Responsible Person / Assignee */}
        <div className="flex items-center gap-1.5">
          {opportunity.assignedTo ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f1f6f3] border border-[#e2e9e4]">
              <img
                src={opportunity.assignedTo.avatar}
                alt={opportunity.assignedTo.name}
                referrerPolicy="no-referrer"
                className="w-3.5 h-3.5 rounded-full object-cover"
              />
              <span className="text-[10.5px] font-semibold text-[#18392d]">
                {opportunity.assignedTo.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10.5px] text-[#86978f]">
              <HugeIcon icon={UserIcon} size={12} />
              <span>Sem responsável</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
