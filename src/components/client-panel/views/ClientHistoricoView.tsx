import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  Hash,
  Megaphone,
  Copy,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { clientService, ClientHistoryItem } from '../../../services/clientService';

interface ClientHistoricoViewProps {
  onNewCampaign?: () => void;
}

export const ClientHistoricoView: React.FC<ClientHistoricoViewProps> = ({ onNewCampaign }) => {
  const [historyItems, setHistoryItems] = useState<ClientHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected item for the side drawer
  const [selectedItem, setSelectedItem] = useState<ClientHistoryItem | null>(null);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<'todos' | 'hoje' | 'ontem' | '7dias' | '30dias'>('todos');
  const [campaignFilter, setCampaignFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'delivered' | 'failed' | 'pending'>('todos');
  const [sortOrder, setSortOrder] = useState<'recentes' | 'antigos'>('recentes');

  // Mobile Filter Drawer/Sheet state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Copied state
  const [copiedId, setCopiedId] = useState(false);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await clientService.getHistory();
      if (Array.isArray(data)) {
        setHistoryItems(data);
        // If there's an item and none selected, auto-select the first one on wide desktop
        if (data.length > 0 && !selectedItem && typeof window !== 'undefined' && window.innerWidth >= 1280) {
          setSelectedItem(data[0]);
        }
      } else {
        setHistoryItems([]);
      }
    } catch {
      setHistoryItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Unique campaign titles for dropdown filter
  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    historyItems.forEach((item) => {
      if (item.campaignTitle) set.add(item.campaignTitle);
    });
    return Array.from(set);
  }, [historyItems]);

  // Active filter count (for mobile badge)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (periodFilter !== 'todos') count++;
    if (campaignFilter !== 'todas') count++;
    if (statusFilter !== 'todos') count++;
    if (sortOrder !== 'recentes') count++;
    return count;
  }, [periodFilter, campaignFilter, statusFilter, sortOrder]);

  const clearFilters = () => {
    setPeriodFilter('todos');
    setCampaignFilter('todas');
    setStatusFilter('todos');
    setSortOrder('recentes');
    setSearchTerm('');
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return historyItems
      .filter((item) => {
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = item.campaignTitle?.toLowerCase().includes(q);
          const matchGroup = item.groupName?.toLowerCase().includes(q);
          const matchMsg = item.messageText?.toLowerCase().includes(q);
          const matchId = item.id?.toLowerCase().includes(q);
          if (!matchTitle && !matchGroup && !matchMsg && !matchId) return false;
        }

        // Status
        if (statusFilter !== 'todos') {
          if (statusFilter === 'delivered' && item.status !== 'delivered' && item.status !== 'sent') {
            return false;
          }
          if (statusFilter === 'failed' && item.status !== 'failed') {
            return false;
          }
          if (statusFilter === 'pending' && item.status !== 'pending') {
            return false;
          }
        }

        // Campaign
        if (campaignFilter !== 'todas') {
          if (item.campaignTitle !== campaignFilter) return false;
        }

        // Period filter based on timestamp
        if (periodFilter !== 'todos' && item.timestamp) {
          const itemDate = new Date(item.timestamp);
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterdayStart = new Date(todayStart);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);

          if (periodFilter === 'hoje') {
            if (itemDate < todayStart) return false;
          } else if (periodFilter === 'ontem') {
            if (itemDate < yesterdayStart || itemDate >= todayStart) return false;
          } else if (periodFilter === '7dias') {
            const sevenDaysAgo = new Date(todayStart);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (itemDate < sevenDaysAgo) return false;
          } else if (periodFilter === '30dias') {
            const thirtyDaysAgo = new Date(todayStart);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (itemDate < thirtyDaysAgo) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return sortOrder === 'recentes' ? timeB - timeA : timeA - timeB;
      });
  }, [historyItems, searchTerm, statusFilter, campaignFilter, periodFilter, sortOrder]);

  // Group items by date: "Hoje • 17 de setembro de 2026", "Ontem • 16 de setembro de 2026", etc.
  const groupedSections = useMemo(() => {
    const groups: { [key: string]: { label: string; dateStr: string; items: ClientHistoryItem[] } } = {};

    filteredItems.forEach((item) => {
      const d = item.timestamp ? new Date(item.timestamp) : new Date();
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayKey = `${yesterdayDate.getFullYear()}-${yesterdayDate.getMonth()}-${yesterdayDate.getDate()}`;
      const itemKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      const dateFormatted = d.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      let sectionTitle = dateFormatted;
      if (itemKey === todayKey) {
        sectionTitle = `Hoje • ${dateFormatted}`;
      } else if (itemKey === yesterdayKey) {
        sectionTitle = `Ontem • ${dateFormatted}`;
      }

      if (!groups[itemKey]) {
        groups[itemKey] = {
          label: sectionTitle,
          dateStr: itemKey,
          items: [],
        };
      }
      groups[itemKey].items.push(item);
    });

    return Object.values(groups);
  }, [filteredItems]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'hoje':
        return 'Hoje';
      case 'ontem':
        return 'Ontem';
      case '7dias':
        return 'Últimos 7 dias';
      case '30dias':
        return 'Últimos 30 dias';
      default:
        return 'Todo o período';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* 1. TOP SEARCH & FILTER BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-[#e5ebe7] shadow-xs flex flex-col gap-3">
        {/* Top search line */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7b8e83]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no histórico por campanha, grupo ou mensagem..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f6f9f7] hover:bg-[#f1f6f3] focus:bg-white text-xs sm:text-sm text-[#11241c] placeholder-[#7b8e83] rounded-2xl border border-[#dfe7e2] focus:border-[#109353] focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7b8e83] hover:text-[#11241c]"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border border-[#dfe7e2] hover:bg-[#f2f7f4] text-[#4d6155] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Atualizar histórico"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-[#109353]' : ''} />
          </button>

          {/* Mobile Filter Button Trigger */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#109353] text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#109353] text-[10px] font-extrabold flex items-center justify-center ml-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Desktop Filter Row (Hidden on mobile for maximum responsiveness) */}
        <div className="hidden sm:flex items-center justify-between gap-2.5 pt-1 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Período */}
            <div className="relative">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="appearance-none pl-8 pr-7 py-2 rounded-xl bg-[#f7faf8] hover:bg-[#eef5f1] border border-[#dce6e0] text-xs font-semibold text-[#1e3328] focus:outline-none focus:border-[#109353] cursor-pointer shadow-2xs"
              >
                <option value="todos">Todo o período</option>
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
              </select>
              <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#109353] pointer-events-none" />
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7d9185] pointer-events-none" />
            </div>

            {/* 2. Divulgação */}
            <div className="relative">
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-[#f7faf8] hover:bg-[#eef5f1] border border-[#dce6e0] text-xs font-semibold text-[#1e3328] focus:outline-none focus:border-[#109353] cursor-pointer shadow-2xs max-w-[180px] truncate"
              >
                <option value="todas">Todas as divulgações</option>
                {uniqueCampaigns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7d9185] pointer-events-none" />
            </div>

            {/* 3. Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-[#f7faf8] hover:bg-[#eef5f1] border border-[#dce6e0] text-xs font-semibold text-[#1e3328] focus:outline-none focus:border-[#109353] cursor-pointer shadow-2xs"
              >
                <option value="todos">Todos os status</option>
                <option value="delivered">Enviados com sucesso</option>
                <option value="pending">Pendentes / Na fila</option>
                <option value="failed">Falhas no envio</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7d9185] pointer-events-none" />
            </div>
          </div>

          {/* 4. Ordenação */}
          <div className="relative shrink-0">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-[#f7faf8] hover:bg-[#eef5f1] border border-[#dce6e0] text-xs font-semibold text-[#1e3328] focus:outline-none focus:border-[#109353] cursor-pointer shadow-2xs"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7d9185] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* MOBILE FILTER MODAL / SHEET */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full bg-white rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f4f1]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={17} className="text-[#109353]" />
                <h3 className="text-base font-extrabold text-[#11241c]">Filtros do Histórico</h3>
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-xl text-[#7a8d81] hover:bg-[#f0f4f1]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Período */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#293d31]">Período</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="w-full p-3 rounded-2xl bg-[#f8faf9] border border-[#dce5e0] text-xs font-semibold text-[#11241c] outline-none"
              >
                <option value="todos">Todo o período</option>
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
              </select>
            </div>

            {/* Divulgação */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#293d31]">Divulgação</label>
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#f8faf9] border border-[#dce5e0] text-xs font-semibold text-[#11241c] outline-none"
              >
                <option value="todas">Todas as divulgações</option>
                {uniqueCampaigns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#293d31]">Status do Envio</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full p-3 rounded-2xl bg-[#f8faf9] border border-[#dce5e0] text-xs font-semibold text-[#11241c] outline-none"
              >
                <option value="todos">Todos os status</option>
                <option value="delivered">Enviados com sucesso</option>
                <option value="pending">Pendentes / Na fila</option>
                <option value="failed">Falhas no envio</option>
              </select>
            </div>

            {/* Ordenação */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#293d31]">Ordenação</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full p-3 rounded-2xl bg-[#f8faf9] border border-[#dce5e0] text-xs font-semibold text-[#11241c] outline-none"
              >
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
              </select>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => {
                  clearFilters();
                  setIsMobileFilterOpen(false);
                }}
                className="py-3 px-4 rounded-2xl border border-[#dce5e0] text-xs font-bold text-[#4e6255] hover:bg-[#f6f9f7] transition-all"
              >
                Limpar filtros
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="py-3 px-4 rounded-2xl bg-[#109353] text-white text-xs font-bold hover:bg-[#0e8048] transition-all shadow-xs"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN LAYOUT: LIST ON LEFT (or full-width) + DETAILS DRAWER ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Grouped History List */}
        <div className={`flex flex-col gap-4 ${selectedItem ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'}`}>
          {isLoading ? (
            <div className="bg-white p-12 rounded-3xl border border-[#e5ebe7] flex flex-col items-center justify-center gap-3 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full border-3 border-[#109353] border-t-transparent animate-spin" />
              <p className="text-xs font-bold text-[#62776c]">Carregando histórico...</p>
            </div>
          ) : groupedSections.length === 0 ? (
            /* Real Clean Empty State - Zero Fake Data */
            <div className="bg-white p-10 sm:p-14 rounded-3xl border border-[#e5ebe7] flex flex-col items-center justify-center gap-4 text-center shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-[#eef7f2] text-[#109353] flex items-center justify-center font-bold">
                <Calendar size={32} />
              </div>
              <div className="flex flex-col gap-1 max-w-md">
                <h3 className="text-base sm:text-lg font-extrabold text-[#11241c]">
                  Nenhum histórico de envio registrado ainda
                </h3>
                <p className="text-xs sm:text-sm text-[#5f7467] leading-relaxed">
                  Assim que suas divulgações forem disparadas nos grupos de WhatsApp, cada envio ficará salvo aqui com horário, grupo, mensagem e status do disparo.
                </p>
              </div>
              {onNewCampaign && (
                <button
                  onClick={onNewCampaign}
                  className="mt-2 px-6 py-3 rounded-2xl bg-[#109353] hover:bg-[#0e8048] text-white text-xs sm:text-sm font-extrabold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Megaphone size={16} />
                  <span>Criar Nova Divulgação</span>
                </button>
              )}
            </div>
          ) : (
            groupedSections.map((section) => (
              <div
                key={section.dateStr}
                className="bg-white rounded-3xl border border-[#e5ebe7] shadow-xs overflow-hidden"
              >
                {/* Date Group Header */}
                <div className="px-5 py-3.5 bg-[#fbfdfc] border-b border-[#f0f4f1] flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-[#11241c]">
                    {section.label}
                  </span>
                  <span className="text-[11px] font-bold text-[#6b8073] bg-[#edf4f0] px-2.5 py-0.5 rounded-full">
                    {section.items.length} {section.items.length === 1 ? 'envio' : 'envios'}
                  </span>
                </div>

                {/* Rows inside Date Group */}
                <div className="divide-y divide-[#f2f6f3]">
                  {section.items.map((item) => {
                    const isSuccess = item.status === 'delivered' || item.status === 'sent';
                    const isPending = item.status === 'pending';
                    const isSelected = selectedItem?.id === item.id;
                    const hasImage = !!item.imageUrl;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#eaf5ef] border-l-4 border-[#109353]'
                            : 'hover:bg-[#f8faf9]'
                        }`}
                      >
                        {/* Left: Status Dot + Time */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                          {/* Colored indicator dot */}
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isSuccess ? 'bg-[#109353]' : isPending ? 'bg-amber-500 animate-pulse' : 'bg-[#ef4444]'
                            }`}
                          />

                          {/* Time */}
                          <span className="text-xs sm:text-sm font-bold font-mono text-[#11241c] w-12 sm:w-14 shrink-0">
                            {item.timeFormatted?.replace(/Hoje às |Ontem às /g, '') || '00:00'}
                          </span>
                        </div>

                        {/* Group Avatar / Icon Badge */}
                        <div className="w-9 h-9 rounded-xl bg-[#eef6f1] text-[#109353] shrink-0 border border-[#d8e7de] flex items-center justify-center">
                          <Users size={16} />
                        </div>

                        {/* Title & Group Target */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <span className="text-xs sm:text-sm font-extrabold text-[#11241c] truncate">
                            {item.groupName || 'Grupo WhatsApp'}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-[#5f7467] truncate mt-0.5">
                            <span className="font-semibold text-[#109353] truncate">{item.campaignTitle || 'Divulgação'}</span>
                            {hasImage && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#6b8073] bg-[#edf4f0] px-1.5 py-0.5 rounded">
                                <ImageIcon size={10} className="text-[#109353]" />
                                Imagem
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Message Preview (Visible on md and up) */}
                        <div className="hidden md:flex flex-col flex-1 min-w-0 max-w-xs">
                          <p className="text-xs text-[#526659] truncate leading-tight">
                            {item.messageText || '—'}
                          </p>
                        </div>

                        {/* Status Pill Badge */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide ${
                              isSuccess
                                ? 'bg-[#e8f7ee] text-[#109353] border border-[#c4e6ce]'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]'
                            }`}
                          >
                            {isSuccess ? 'Enviado' : isPending ? 'Pendente' : 'Falhou'}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                            className="p-1.5 rounded-lg text-[#7c9084] hover:text-[#11241c] hover:bg-[#ebf2ee] transition-colors"
                            title="Ver detalhes do envio"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Detailed Slide Drawer / Side Panel (Matches Mockup exactly) */}
        {selectedItem && (
          <div className="lg:col-span-5 xl:col-span-4 sticky top-20 bg-white rounded-3xl border border-[#e5ebe7] shadow-lg p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Drawer Header with Close Button */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#798e81]">
                  Detalhes do Disparo
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-xl text-[#718579] hover:text-[#11241c] hover:bg-[#f0f5f2] transition-colors cursor-pointer"
                title="Fechar detalhes"
              >
                <X size={18} />
              </button>
            </div>

            {/* Media Big Preview (If image exists) */}
            {selectedItem.imageUrl ? (
              <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-[#11241c] relative border border-[#e1eae4]">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.campaignTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            {/* Title & Status Badge */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base sm:text-lg font-extrabold text-[#11241c] leading-snug">
                {selectedItem.campaignTitle || 'Divulgação WhatsApp'}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 ${
                  selectedItem.status === 'delivered' || selectedItem.status === 'sent'
                    ? 'bg-[#e8f7ee] text-[#109353] border border-[#c4e6ce]'
                    : selectedItem.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]'
                }`}
              >
                {selectedItem.status === 'delivered' || selectedItem.status === 'sent'
                  ? 'Enviado'
                  : selectedItem.status === 'pending'
                  ? 'Pendente'
                  : 'Falhou'}
              </span>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-2 text-xs font-semibold text-[#576b5f]">
              <Calendar size={14} className="text-[#109353]" />
              <span>
                {selectedItem.timestamp
                  ? new Date(selectedItem.timestamp).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : '17/09/2026'}{' '}
                às {selectedItem.timeFormatted?.replace(/Hoje às |Ontem às /g, '') || '14:02'}
              </span>
            </div>

            {/* Target Group with Members & Arrow */}
            <div className="p-3 rounded-2xl bg-[#f8faf9] border border-[#e5ebe7] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#e6f2eb] text-[#109353] flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#11241c] truncate">
                    {selectedItem.groupName}
                  </span>
                  <span className="text-[11px] text-[#6d8175]">
                    {selectedItem.groupMembersCount ? `${selectedItem.groupMembersCount} membros` : 'Grupo ativo'}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#8e9f95] shrink-0" />
            </div>

            {/* Mensagem Enviada */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold text-[#2a3e32]">Mensagem enviada</span>
              <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e5ebe7] text-xs sm:text-sm text-[#24372c] whitespace-pre-wrap leading-relaxed">
                {selectedItem.messageText || 'Sem texto vinculado.'}
              </div>
            </div>

            {/* Mídia Thumbnail */}
            {selectedItem.imageUrl && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold text-[#2a3e32]">Mídia</span>
                <div className="w-24 h-16 rounded-xl overflow-hidden border border-[#dce6df] bg-[#eef4f0]">
                  <img
                    src={selectedItem.imageUrl}
                    alt="Mídia da campanha"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Detalhes do Envio */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#f0f4f1]">
              <span className="text-xs font-extrabold text-[#2a3e32]">Detalhes do envio</span>

              <div className="flex flex-col gap-2 text-xs">
                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#5e7266]">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          selectedItem.status === 'delivered' || selectedItem.status === 'sent'
                            ? 'bg-[#109353]'
                            : 'bg-[#ef4444]'
                        }`}
                      />
                      <span>Status de entrega</span>
                    </div>
                    <span className={`font-bold ${selectedItem.status === 'delivered' || selectedItem.status === 'sent' ? 'text-[#11241c]' : 'text-red-600'}`}>
                      {selectedItem.status === 'delivered' || selectedItem.status === 'sent'
                        ? 'Enviado com sucesso'
                        : 'Falha no envio'}
                    </span>
                  </div>
                  
                  {/* Exact Detailed Error showing if it failed */}
                  {(selectedItem.status === 'failed' || selectedItem.error) && (
                    <div className="mt-1 p-2 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                      <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block mb-0.5">Detalhes Técnicos da Falha:</span>
                      <span className="text-xs font-mono text-red-700 break-words">{selectedItem.error || 'Nenhum detalhe retornado pela API.'}</span>
                    </div>
                  )}
                </div>

                {/* Tempo de envio */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#5e7266]">
                    <Clock size={13} className="text-[#7d9185]" />
                    <span>Tempo de envio</span>
                  </div>
                  <span className="font-semibold text-[#11241c]">
                    {selectedItem.duration || '2 segundos'}
                  </span>
                </div>

                {/* Mídia */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#5e7266]">
                    <ImageIcon size={13} className="text-[#7d9185]" />
                    <span>Mídia</span>
                  </div>
                  <span className="font-semibold text-[#11241c]">
                    {selectedItem.imageUrl ? 'Imagem' : 'Texto'}
                  </span>
                </div>

                {/* Divulgação */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#5e7266]">
                    <Megaphone size={13} className="text-[#7d9185]" />
                    <span>Divulgação</span>
                  </div>
                  <span className="font-semibold text-[#11241c] truncate max-w-[170px]">
                    {selectedItem.campaignTitle}
                  </span>
                </div>

                {/* ID do envio */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#5e7266]">
                    <Hash size={13} className="text-[#7d9185]" />
                    <span>ID do envio</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#109353]">
                      {selectedItem.id}
                    </span>
                    <button
                      onClick={() => handleCopyId(selectedItem.id)}
                      className="text-[#7d9185] hover:text-[#11241c] cursor-pointer"
                      title="Copiar ID"
                    >
                      {copiedId ? <Check size={12} className="text-[#109353]" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action: Ver no WhatsApp */}
            <div className="pt-2">
              <a
                href={
                  selectedItem.groupJid
                    ? `https://web.whatsapp.com/accept?code=${selectedItem.groupJid.replace('@g.us', '')}`
                    : 'https://web.whatsapp.com'
                }
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-2xl border border-[#dbe4de] hover:border-[#109353] hover:bg-[#f6fbf8] text-[#11241c] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <span>Ver no WhatsApp</span>
                <ExternalLink size={14} className="text-[#109353]" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
