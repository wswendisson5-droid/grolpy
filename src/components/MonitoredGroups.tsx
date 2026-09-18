import React from 'react';
import { MonitoredGroup } from '../types/nexus';
import { Plus, Users, Settings2 } from 'lucide-react';

interface MonitoredGroupsProps {
  groups: MonitoredGroup[];
  onAddGroup: () => void;
  onSelectGroup?: (groupId: string) => void;
  selectedGroupId?: string | null;
}

export const MonitoredGroups: React.FC<MonitoredGroupsProps> = ({
  groups,
  onAddGroup,
  onSelectGroup,
  selectedGroupId,
}) => {
  return (
    <div
      id="monitored-groups-card"
      className="bg-white rounded-2xl p-4 border border-[#e8eee9] shadow-[0_1px_3px_rgba(18,56,44,0.02)] flex flex-col gap-3.5 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[13.5px] font-bold text-[#142d23]">
            Grupos monitorados
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-[#f0f4f1] text-[#526359] text-[11px] font-bold">
            {groups.length}
          </span>
        </div>

        <button
          id="add-monitored-group-btn"
          onClick={onAddGroup}
          title="Gerenciar grupos do WhatsApp"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f4f7f5] hover:bg-[#e7ede9] text-[#294236] text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus size={13} strokeWidth={2.5} />
          <span>Selecionar</span>
        </button>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-[#d8e3dc] bg-[#fafcfb] text-center flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#eef5f1] text-[#12382c] flex items-center justify-center">
            <Users size={16} />
          </div>
          <p className="text-xs font-semibold text-[#183125]">
            Nenhum grupo ativo no Radar
          </p>
          <p className="text-[11px] text-[#6d7e75] max-w-[200px]">
            Selecione grupos reais da sua conta Evolution para analisar oportunidades.
          </p>
          <button
            onClick={onAddGroup}
            className="mt-1 px-3 py-1.5 rounded-xl bg-[#12382c] text-white text-[11px] font-bold hover:bg-[#1a4a3b] transition-colors cursor-pointer"
          >
            Escolher grupos
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const isSelected = selectedGroupId === group.id;

            return (
              <div
                key={group.id}
                id={`group-item-${group.id}`}
                onClick={() => onSelectGroup?.(group.id)}
                className={`flex items-center justify-between p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#eef6f2] border border-[#d2e7dc]'
                    : 'hover:bg-[#f6f9f7]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={group.avatar}
                    alt={group.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-[#e2eae5] shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-semibold text-[#182e24] truncate">
                      {group.name}
                    </span>
                    <span className="text-[10.5px] text-[#6d7e75]">
                      {group.messageCount ? `${group.messageCount} msgs` : 'Monitorando'}
                    </span>
                  </div>
                </div>

                {/* Status dot */}
                <div className="flex items-center pl-2 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      group.status === 'active' ? 'bg-[#10b981]' : 'bg-[#94a39b]'
                    }`}
                    title={group.status === 'active' ? 'Monitoramento Ativo' : 'Pausado'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
