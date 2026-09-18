import React, { useState, useEffect } from 'react';
import { X, MessageSquareShare, Search, Check, Plus, Loader2 } from 'lucide-react';
import { MonitoredGroup } from '../types/nexus';
import { radarService, RealGroupItem } from '../services/radarService';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupsUpdated?: (groups: MonitoredGroup[]) => void;
}

export const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupsUpdated,
}) => {
  const [availableGroups, setAvailableGroups] = useState<RealGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingJid, setTogglingJid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadGroups = async () => {
      setIsLoading(true);
      try {
        const groups = await radarService.getRealGroups();
        if (isMounted) {
          setAvailableGroups(groups);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadGroups();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (group: RealGroupItem) => {
    const nextState = !group.isMonitored;
    setTogglingJid(group.jid);

    try {
      await radarService.toggleMonitoredGroup(group.jid, nextState);
      const updated = availableGroups.map((g) =>
        g.jid === group.jid ? { ...g, isMonitored: nextState, status: nextState ? ('active' as const) : ('inactive' as const) } : g
      );
      setAvailableGroups(updated);

      if (onGroupsUpdated) {
        const monitoredOnly: MonitoredGroup[] = updated
          .filter((g) => g.isMonitored)
          .map((g) => ({
            id: g.jid,
            name: g.name,
            messageCount: g.messageCount,
            avatar: g.avatar,
            status: 'active',
            participantsCount: g.participantsCount || 100,
            lastMessageTime: 'Hoje',
          }));
        onGroupsUpdated(monitoredOnly);
      }
    } finally {
      setTogglingJid(null);
    }
  };

  const filteredGroups = availableGroups.filter((g) => {
    if (!searchQuery.trim()) return true;
    return g.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const monitoredCount = availableGroups.filter((g) => g.isMonitored).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e2ebe6] flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2ee] bg-[#fafcfb]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ecf7f1] text-[#059669] flex items-center justify-center">
              <MessageSquareShare size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#142d23]">
                Grupos Reais do WhatsApp
              </h3>
              <p className="text-[11px] text-[#6b7d74]">
                {monitoredCount} de {availableGroups.length} grupos selecionados para monitoramento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f1f5f3] hover:bg-[#e4ece7] text-[#55695e] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[#edf2ee] bg-white">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3 text-[#7d8f85]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar entre os grupos conectados da Evolution..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#dce5e0] text-xs text-[#142d23] placeholder-[#8ea096] focus:outline-none focus:ring-2 focus:ring-[#143d2f]/20 focus:border-[#143d2f]"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-[#687a71]">
              <Loader2 size={24} className="animate-spin text-[#12382c]" />
              <span className="text-xs font-semibold">Carregando grupos da Evolution API...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#687a71]">
              {searchQuery ? 'Nenhum grupo encontrado com esse nome.' : 'Nenhum grupo do WhatsApp disponível nesta conta.'}
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isToggling = togglingJid === group.jid;

              return (
                <div
                  key={group.jid}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    group.isMonitored
                      ? 'bg-[#f2f8f4] border-[#c7e4d3]'
                      : 'bg-white border-[#e9efe9] hover:bg-[#fafcfb]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <img
                      src={group.avatar}
                      alt={group.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-[#dce5e0] shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#142d23] truncate">
                        {group.name}
                      </span>
                      <span className="text-[10.5px] text-[#6d7f75] truncate">
                        {group.isMonitored ? '🟢 Monitoramento ativo' : '⚪ Não monitorado'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(group)}
                    disabled={isToggling}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      group.isMonitored
                        ? 'bg-[#12382c] text-white hover:bg-[#1a4a3b]'
                        : 'bg-[#edf4f0] text-[#1a382c] hover:bg-[#dfebe3]'
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : group.isMonitored ? (
                      <>
                        <Check size={13} />
                        <span>Monitorando</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Monitorar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#edf2ee] bg-[#fafcfb] flex items-center justify-between">
          <span className="text-[11px] text-[#6d7e75]">
            As novas mensagens dos grupos ativos serão analisadas pelo Radar.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#12382c] text-white text-xs font-bold hover:bg-[#1a4a3b] transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
