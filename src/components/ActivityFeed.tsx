import React, { useState } from 'react';
import { ActivityEvent } from '../types/nexus';
import { Target, MessageSquare, MinusCircle, ChevronDown } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityEvent[];
  onSelectOpportunityById?: (opportunityId: string) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  onSelectOpportunityById,
}) => {
  const [selectedFilterGroup, setSelectedFilterGroup] = useState('Todos os grupos');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const groupOptions = [
    'Todos os grupos',
    'Empreendedores ES',
    'Vendas Geral',
    'Achadinhos',
  ];

  return (
    <div
      id="activity-feed-card"
      className="bg-white rounded-2xl p-4 border border-[#e8eee9] shadow-[0_1px_3px_rgba(18,56,44,0.02)] flex flex-col gap-3 select-none h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#f1f4f2]">
        <h2 className="text-[13.5px] font-bold text-[#142d23]">
          Atividade em tempo real
        </h2>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            id="activity-group-filter-btn"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 text-xs text-[#526359] hover:text-[#18392d] px-2 py-1 rounded-lg hover:bg-[#f3f7f4] transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span className="font-medium text-[11.5px]">{selectedFilterGroup}</span>
            <ChevronDown size={12} className="text-[#889890]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#e2e8e4] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {groupOptions.map((group) => (
                <button
                  key={group}
                  onClick={() => {
                    setSelectedFilterGroup(group);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    selectedFilterGroup === group
                      ? 'bg-[#eef6f2] text-[#12382c] font-semibold'
                      : 'text-[#4e5e55] hover:bg-[#f6f9f7]'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activities List */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[440px] pr-1">
        {activities.map((item) => {
          const isDetected = item.type === 'opportunity_detected';
          const isDismissed = item.type === 'contact_dismissed';
          const isAnalyzed = item.type === 'message_analyzed';

          return (
            <div
              key={item.id}
              id={`activity-item-${item.id}`}
              onClick={() => {
                if (item.targetOpportunityId && onSelectOpportunityById) {
                  onSelectOpportunityById(item.targetOpportunityId);
                }
              }}
              className={`relative flex items-start justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                isDetected
                  ? 'bg-[#fafcfb] border-[#e1eee6] border-l-[3.5px] border-l-[#10b981] cursor-pointer hover:bg-[#f3f9f5]'
                  : isDismissed
                  ? 'bg-[#fafaf9] border-[#f0ebe9] border-l-[3.5px] border-l-[#ef4444]'
                  : 'bg-white border-[#edf2ee] hover:bg-[#f8faf9]'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 pr-2">
                {/* Icon */}
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isDetected
                      ? 'bg-[#e7f7ed] text-[#059669]'
                      : isDismissed
                      ? 'bg-[#fee2e2] text-[#dc2626]'
                      : 'bg-[#f1f5f2] text-[#6d7e75]'
                  }`}
                >
                  {isDetected && <Target size={13} strokeWidth={2.4} />}
                  {isDismissed && <MinusCircle size={13} strokeWidth={2.4} />}
                  {isAnalyzed && <MessageSquare size={13} strokeWidth={2} />}
                </div>

                {/* Text Content */}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#182e24] leading-tight truncate">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#6d7d74] truncate mt-0.5">
                    {item.subtitle}
                  </span>
                </div>
              </div>

              {/* Timestamp */}
              <span className="text-[10.5px] font-medium text-[#8c9c93] shrink-0 pt-0.5">
                {item.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
