import React, { useState, useEffect } from 'react';
import { X, Users, Check, RefreshCw, Plus, Search, QrCode, AlertCircle } from 'lucide-react';
import { ClientGroup } from '../types';
import { clientService } from '../../../services/clientService';

interface ImportarGruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newGroups: ClientGroup[]) => void;
  onNavigateToConnection?: () => void;
}

export const ImportarGruposModal: React.FC<ImportarGruposModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onNavigateToConnection,
}) => {
  const [availableGroups, setAvailableGroups] = useState<ClientGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const loadRealGroups = async () => {
    setIsLoading(true);
    try {
      const real = await clientService.getRealGroups();
      setAvailableGroups(real || []);
      if (real && real.length > 0) {
        setSelectedIds(real.map((g) => g.id));
      } else {
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Error fetching real groups:', err);
      setAvailableGroups([]);
      setSelectedIds([]);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRealGroups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === availableGroups.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableGroups.map((g) => g.id));
    }
  };

  const handleConfirm = async () => {
    const chosen = availableGroups.filter((g) => selectedIds.includes(g.id));
    await clientService.saveImportedGroups(chosen);
    onImport(chosen);
    onClose();
  };

  const filtered = availableGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.category && g.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-[#e5ebe7] shadow-2xl p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-[#11241c]">Importar Grupos do WhatsApp</h3>
              <p className="text-xs text-[#63756b]">Sincronizados em tempo real via Evolution API (Instância do Cliente)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7f9287]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar grupos do WhatsApp..."
              className="w-full pl-10 pr-4 py-2 bg-[#f8faf9] border border-[#dbe4de] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#109353]"
            />
          </div>
          <button
            onClick={loadRealGroups}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#dbe4de] text-[#55675d] hover:bg-[#f0f5f2] transition-colors cursor-pointer disabled:opacity-50"
            title="Sincronizar com WhatsApp"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Select all bar */}
        {availableGroups.length > 0 && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[#64776d] font-medium">
              {availableGroups.length} grupos reais detectados no WhatsApp
            </span>
            <button
              onClick={handleSelectAll}
              className="text-[#109353] font-bold hover:underline cursor-pointer"
            >
              {selectedIds.length === availableGroups.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>
        )}

        {/* Groups List */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-xs text-[#64776d]">
              <div className="w-6 h-6 rounded-full border-2 border-[#109353] border-t-transparent animate-spin" />
              <span>Buscando grupos reais conectados na Evolution API...</span>
            </div>
          ) : availableGroups.length === 0 && hasFetched ? (
            <div className="p-6 text-center text-xs text-[#52655b] bg-[#f8faf9] rounded-2xl border border-dashed border-[#dce5df] flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <p className="font-bold text-[#11241c]">Nenhum grupo real encontrado</p>
                <p className="text-[11px] text-[#6d8075]">
                  Certifique-se de que a instância de WhatsApp do seu painel está conectada e possui grupos ativos.
                </p>
              </div>
              {onNavigateToConnection && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToConnection();
                  }}
                  className="mt-1 px-4 py-2 bg-[#109353] hover:bg-[#0e8048] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <QrCode size={14} />
                  <span>Conectar WhatsApp do Cliente</span>
                </button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64776d] bg-[#f8faf9] rounded-2xl border border-dashed border-[#dce5df]">
              Nenhum grupo corresponde ao filtro.
            </div>
          ) : (
            filtered.map((group) => {
              const isSelected = selectedIds.includes(group.id);
              return (
                <div
                  key={group.id}
                  onClick={() => handleToggle(group.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#109353] bg-[#eaf6ef]'
                      : 'border-[#e2eae5] bg-[#f8faf9] hover:bg-[#f2f7f4]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-[#109353] border-[#109353] text-white' : 'border-[#b8c9bf] bg-white'
                    }`}>
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#11241c] truncate">{group.name}</span>
                      <span className="text-[11px] text-[#64776d]">
                        {group.membersCount ? `${group.membersCount} participantes` : 'Grupo do WhatsApp'}
                        {group.jid ? ` • ${group.jid.split('@')[0]}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#f0f4f1]">
          <span className="text-xs font-semibold text-[#576b60]">
            {selectedIds.length} selecionados
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#d8e2dc] text-[#55675d] hover:bg-[#f2f7f4] font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 rounded-xl bg-[#109353] hover:bg-[#0e8048] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Plus size={15} />
              <span>Importar Selecionados ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

