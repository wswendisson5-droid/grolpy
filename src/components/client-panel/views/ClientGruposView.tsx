import React, { useState } from 'react';
import { Users, Plus, Search, CheckCircle2, RefreshCw, QrCode, MessageSquare, AlertCircle } from 'lucide-react';
import { ClientGroup } from '../types';

interface ClientGruposViewProps {
  groups: ClientGroup[];
  onImportGroups: () => void;
  onNavigateToConnection?: () => void;
  onRefresh?: () => void;
}

export const ClientGruposView: React.FC<ClientGruposViewProps> = ({
  groups,
  onImportGroups,
  onNavigateToConnection,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.category && g.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[#11241c]">Grupos do WhatsApp</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e8f7ee] text-[#109353]">
              {groups.length} sincronizados
            </span>
          </div>
          <p className="text-xs text-[#5f7368]">
            Grupos reais conectados à sua conta WhatsApp para envio automático de campanhas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl border border-[#d8e2dc] text-[#55675d] hover:bg-[#f0f5f2] transition-colors cursor-pointer disabled:opacity-50"
              title="Sincronizar grupos do WhatsApp"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}

          <button
            onClick={onImportGroups}
            className="px-4 py-2.5 bg-[#109353] hover:bg-[#0e8048] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={18} />
            <span>Importar Grupos do WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {groups.length > 0 && (
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7f9287]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar grupos por nome ou categoria..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d8e2dc] rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#109353] shadow-xs"
          />
        </div>
      )}

      {/* Main Content: List or Empty State */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e5ebe7] shadow-xs p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold shadow-xs">
            <Users size={32} />
          </div>
          <div className="flex flex-col gap-1.5 max-w-md">
            <h3 className="text-base sm:text-lg font-extrabold text-[#11241c]">
              Nenhum grupo real importado ainda
            </h3>
            <p className="text-xs sm:text-sm text-[#617469]">
              Os grupos do seu painel são carregados diretamente do seu WhatsApp conectado via Evolution API (sem grupos fictícios ou dados mockados).
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            {onNavigateToConnection && (
              <button
                onClick={onNavigateToConnection}
                className="px-5 py-2.5 rounded-2xl border border-[#109353] text-[#109353] hover:bg-[#eaf6ef] font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <QrCode size={17} />
                <span>1. Conectar WhatsApp</span>
              </button>
            )}
            <button
              onClick={onImportGroups}
              className="px-5 py-2.5 rounded-2xl bg-[#109353] hover:bg-[#0e8048] text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Plus size={17} />
              <span>2. Importar Meus Grupos</span>
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e5ebe7] p-8 text-center text-xs text-[#64776d]">
          Nenhum grupo encontrado correspondente à pesquisa.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#e5ebe7] shadow-xs overflow-hidden">
          <div className="divide-y divide-[#f0f4f1]">
            {filtered.map((group) => (
              <div
                key={group.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafcfb] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold shrink-0">
                    <Users size={20} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[#11241c] truncate">{group.name}</span>
                    <div className="flex items-center gap-2 text-xs text-[#63756b]">
                      <span>{group.membersCount ? `${group.membersCount} participantes` : 'WhatsApp'}</span>
                      {group.jid && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-[#73857b] truncate">{group.jid.split('@')[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-[#52655b] pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f0f4f1]">
                  {group.lastPostTime && (
                    <span className="text-[#6d8075]">Último envio: {group.lastPostTime}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#e8f7ee] text-[#0d8a4c]">
                    <CheckCircle2 size={13} />
                    <span>Conectado</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
