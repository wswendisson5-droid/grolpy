import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Clock,
  Users,
  Send,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Calendar,
  BarChart3,
  Edit2,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { DivulgacaoCard, CampaignStatus, ClientGroup } from '../types';

interface ClientDivulgacoesViewProps {
  campaigns: DivulgacaoCard[];
  groups?: ClientGroup[];
  onToggleActive: (id: string) => void;
  onNewCampaign: () => void;
  onDeleteCampaign?: (id: string) => void;
  onDuplicateCampaign?: (campaign: DivulgacaoCard) => void;
  onSendNow?: (id: string) => void;
}

export const ClientDivulgacoesView: React.FC<ClientDivulgacoesViewProps> = ({
  campaigns,
  groups = [],
  onToggleActive,
  onNewCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  onSendNow,
}) => {
  const [activeTab, setActiveTab] = useState<'todas' | 'ativas' | 'agendadas' | 'pausadas' | 'concluidas'>('todas');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'recentes' | 'antigas' | 'envios'>('recentes');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Derive counts
  const ativasCount = campaigns.filter((c) => c.status === 'ativa' || (c.active && c.status !== 'concluida' && c.status !== 'pausada')).length;
  const agendadasCount = campaigns.filter((c) => c.status === 'agendada').length;
  const pausadasCount = campaigns.filter((c) => c.status === 'pausada' || (!c.active && c.status !== 'concluida')).length;
  const concluidasCount = campaigns.filter((c) => c.status === 'concluida').length;
  const totalSentSum = campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0);

  // Filter campaigns
  const filtered = campaigns.filter((c) => {
    // Tab filter
    if (activeTab === 'ativas' && !(c.status === 'ativa' || (c.active && c.status !== 'concluida' && c.status !== 'pausada'))) return false;
    if (activeTab === 'agendadas' && c.status !== 'agendada') return false;
    if (activeTab === 'pausadas' && !(c.status === 'pausada' || (!c.active && c.status !== 'concluida'))) return false;
    if (activeTab === 'concluidas' && c.status !== 'concluida') return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchText = c.previewText.toLowerCase().includes(q);
      const matchCat = c.category.toLowerCase().includes(q);
      if (!matchTitle && !matchText && !matchCat) return false;
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'envios') return (b.totalSent || 0) - (a.totalSent || 0);
    if (sortOrder === 'antigas') return (a.id > b.id ? 1 : -1);
    return (b.id > a.id ? 1 : -1);
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (card: DivulgacaoCard) => {
    if (card.status === 'enviando') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
          <RefreshCw size={12} className="animate-spin text-blue-600" />
          <span>Enviando ({card.totalSent || 0}/{card.groupsCount || 1})</span>
        </span>
      );
    }
    if (card.status === 'falha') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
          <AlertCircle size={12} className="text-red-600" />
          <span>Falha no Envio</span>
        </span>
      );
    }
    if (card.status === 'parcial') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <CheckCircle2 size={12} className="text-amber-600" />
          <span>Parcial ({card.totalSent}/{card.groupsCount || 1})</span>
        </span>
      );
    }
    const isCompleted = card.status === 'concluida';
    const isScheduled = card.status === 'agendada';
    const isPaused = card.status === 'pausada' || !card.active;

    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#e8f7ee] text-[#0e8a4d]">
          <CheckCircle2 size={12} />
          <span>Concluída ({card.totalSent}/{card.groupsCount || 1})</span>
        </span>
      );
    }
    if (isScheduled) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#f1f4f2] text-[#556b60]">
          <Calendar size={12} />
          <span>Agendada</span>
        </span>
      );
    }
    if (isPaused) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <PauseCircle size={12} />
          <span>Pausada</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#e8f7ee] text-[#0e8a4d]">
        <PlayCircle size={12} />
        <span>Ativa</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-5 max-w-7xl mx-auto w-full pb-10">
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs">
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#11241c]">Minhas Divulgações</h1>
          <p className="text-xs sm:text-sm text-[#5f7368]">
            Gerencie suas mensagens programadas e campanhas automáticas no WhatsApp
          </p>
        </div>

        <button
          onClick={onNewCampaign}
          className="px-5 py-2.5 bg-[#109353] hover:bg-[#0e8048] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Plus size={18} />
          <span>Nova divulgação</span>
        </button>
      </div>

      {/* 2. TOP 5 METRIC CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Ativas */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5ebe7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-[#5a6e63]">Ativas</span>
            <div className="w-8 h-8 rounded-xl bg-[#ebf7f0] text-[#109353] flex items-center justify-center">
              <PlayCircle size={16} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#11241c] leading-none">
            {ativasCount}
          </span>
        </div>

        {/* Agendadas */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5ebe7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-[#5a6e63]">Agendadas</span>
            <div className="w-8 h-8 rounded-xl bg-[#f0f4f2] text-[#4f6458] flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#11241c] leading-none">
            {agendadasCount}
          </span>
        </div>

        {/* Pausadas */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5ebe7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-[#5a6e63]">Pausadas</span>
            <div className="w-8 h-8 rounded-xl bg-[#fff8eb] text-amber-600 flex items-center justify-center">
              <PauseCircle size={16} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#11241c] leading-none">
            {pausadasCount}
          </span>
        </div>

        {/* Concluídas */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5ebe7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-[#5a6e63]">Concluídas</span>
            <div className="w-8 h-8 rounded-xl bg-[#ebf7f0] text-[#109353] flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#11241c] leading-none">
            {concluidasCount}
          </span>
        </div>

        {/* Mensagens enviadas */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5ebe7] shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-[#5a6e63]">Mensagens enviadas</span>
            <div className="w-8 h-8 rounded-xl bg-[#ebf7f0] text-[#109353] flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-2xl font-extrabold text-[#11241c] leading-none">
              {totalSentSum.toLocaleString('pt-BR')}
            </span>
            <span className="text-[10px] font-bold text-[#109353]">
              {totalSentSum > 0 ? '↑ 100%' : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-[#e2eae5] pb-2 overflow-x-auto [scrollbar-width:none]">
        {[
          { id: 'todas', label: `Todas (${campaigns.length})` },
          { id: 'ativas', label: `Ativas (${ativasCount})` },
          { id: 'agendadas', label: `Agendadas (${agendadasCount})` },
          { id: 'pausadas', label: `Pausadas (${pausadasCount})` },
          { id: 'concluidas', label: `Concluídas (${concluidasCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#109353] text-white shadow-xs'
                : 'bg-white text-[#52655b] hover:bg-[#f6f9f7] border border-[#dce5df]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. SEARCH & CONTROLS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7f9287]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar divulgações..."
            className="w-full pl-10 pr-3 py-2 bg-white border border-[#d8e2dc] focus:border-[#109353] rounded-2xl text-xs sm:text-sm text-[#11241c] outline-none shadow-2xs transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
          {/* Sort Dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3.5 py-2 bg-white border border-[#d8e2dc] text-[#3e5246] text-xs font-bold rounded-2xl outline-none focus:border-[#109353] cursor-pointer shadow-2xs"
          >
            <option value="recentes">Mais recentes</option>
            <option value="antigas">Mais antigas</option>
            <option value="envios">Mais disparos</option>
          </select>
        </div>
      </div>

      {/* 5. TABLE / CARDS LIST VIEW */}
      {paginated.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-10 sm:p-14 border border-[#e5ebe7] shadow-xs text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-[#ebf7f0] text-[#109353] flex items-center justify-center font-bold shadow-inner">
            <Send size={28} />
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <h3 className="text-lg font-bold text-[#11241c]">Nenhuma divulgação encontrada</h3>
            <p className="text-xs sm:text-sm text-[#62776c]">
              {search
                ? `Nenhum resultado corresponde à busca "${search}". Tente outro termo.`
                : 'Você ainda não possui nenhuma campanha cadastrada. Crie sua primeira divulgação no WhatsApp para começar a disparar nos grupos.'}
            </p>
          </div>
          <button
            onClick={onNewCampaign}
            className="mt-2 px-6 py-3 bg-[#109353] hover:bg-[#0e8048] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Criar Nova Divulgação</span>
          </button>
        </div>
      ) : (
        /* Table Container */
        <div className="bg-white rounded-3xl border border-[#e5ebe7] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#edf2ee] bg-[#fafcfb] text-[11px] font-bold text-[#62776c] uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Divulgação</th>
                  <th className="py-3.5 px-4">Grupos</th>
                  <th className="py-3.5 px-4">Programação</th>
                  <th className="py-3.5 px-4">Envios</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f4f1] text-xs">
                {paginated.map((card) => {
                  const target = Math.max(1, card.totalTarget || card.groupsCount || (card.selectedGroupJids?.length) || 1);
                  const sent = card.totalSent !== undefined && card.totalSent !== null ? card.totalSent : (card.status === 'concluida' ? target : 0);
                  const progressPct = target > 0 ? Math.min(100, Math.round((sent / target) * 100)) : 0;
                  const displayInterval = card.intervalText 
                    || (card.delaySeconds !== undefined && card.delaySeconds !== null && card.delaySeconds < 60 ? `A cada ${card.delaySeconds}s` : `A cada ${card.intervalMinutes || 1} min`);

                  return (
                    <tr key={card.id} className="hover:bg-[#fafcfb] transition-colors">
                      {/* 1. Divulgação Info (Thumbnail, Title, Tags) */}
                      <td className="py-4 px-4 sm:px-6 min-w-[280px]">
                        <div className="flex items-start gap-3.5">
                          {/* Thumbnail */}
                          <div className="w-13 h-13 rounded-2xl overflow-hidden border border-[#d6e0da] bg-[#f2f6f4] shrink-0 shadow-2xs">
                            {card.imageUrl ? (
                              <img
                                src={card.imageUrl}
                                alt={card.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#109353] font-bold text-base">
                                💬
                              </div>
                            )}
                          </div>

                          {/* Title & Preview */}
                          <div className="flex flex-col min-w-0">
                            <span className="font-extrabold text-sm text-[#11241c] leading-tight line-clamp-1">
                              {card.title}
                            </span>
                            <span className="text-[11px] text-[#607469] line-clamp-1 mt-0.5">
                              {card.previewText}
                            </span>
                            {/* Tags */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#f0f5f2] text-[#3e5246] px-2 py-0.5 rounded-md border border-[#e2eae5]">
                                <Users size={10} />
                                <span>{card.groupsCount} grupos</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#f0f5f2] text-[#3e5246] px-2 py-0.5 rounded-md border border-[#e2eae5]">
                                {card.imageUrl ? <ImageIcon size={10} /> : <MessageSquare size={10} />}
                                <span>{card.imageUrl ? 'Imagem' : 'Texto'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Grupos */}
                      <td className="py-4 px-4 whitespace-nowrap min-w-[160px]">
                        {(() => {
                          const selectedJids = card.selectedGroupJids || [];
                          const matchedGroups = groups.filter((g) => selectedJids.includes(g.jid || g.id));
                          const count = card.groupsCount || selectedJids.length || matchedGroups.length || 1;
                          const groupNames = matchedGroups.map((g) => g.name).filter(Boolean);
                          const namesDisplay = groupNames.length > 0 
                            ? groupNames.join(', ') 
                            : (count === 1 ? '1 grupo selecionado' : `${count} grupos selecionados`);
                          const totalMembers = matchedGroups.reduce((acc, g) => acc + (g.membersCount || 0), 0) || card.groupsMembersCount;

                          return (
                            <div className="flex items-center gap-2.5">
                              {/* Dedicated clean group icon container */}
                              <div className="w-8 h-8 rounded-xl bg-[#eaf6ef] text-[#109353] border border-[#d2ecd9] flex items-center justify-center shrink-0 shadow-2xs">
                                <Users size={15} />
                              </div>

                              <div className="flex flex-col min-w-0 max-w-[170px]">
                                <span 
                                  className="font-bold text-[#192c22] text-xs truncate" 
                                  title={namesDisplay}
                                >
                                  {namesDisplay}
                                </span>
                                <span className="text-[10.5px] text-[#718479] font-medium flex items-center gap-1 truncate">
                                  <span className="font-semibold text-[#109353]">
                                    {count} {count === 1 ? 'grupo' : 'grupos'}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {totalMembers ? `${totalMembers.toLocaleString('pt-BR')} membros` : 'Contatos reais'}
                                  </span>
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 3. Programação */}
                      <td className="py-4 px-4 whitespace-nowrap min-w-[150px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#192c22]">
                            <Calendar size={12} className="text-[#109353]" />
                            <span>{card.scheduleDateText || card.scheduleDays}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6d8076]">
                            <Clock size={11} className="text-[#109353]" />
                            <span>{card.scheduleTime} • {displayInterval}</span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Envios & Progress Bar */}
                      <td className="py-4 px-4 whitespace-nowrap min-w-[140px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-[#2b3e34]">
                            <span>{sent} de {target}</span>
                            <span className="font-bold text-[#109353]">{progressPct}%</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-[#edf3ef] overflow-hidden flex">
                            <div
                              className="h-full bg-[#109353] rounded-l-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                            {/* Failed portion */}
                            {card.totalFailed ? (
                              <div
                                className="h-full bg-red-400 rounded-r-full transition-all duration-300"
                                style={{ width: `${Math.min(100 - progressPct, Math.round((card.totalFailed / target) * 100))}%` }}
                              />
                            ) : null}
                          </div>
                          {card.totalFailed ? (
                            <span className="text-[10px] font-semibold text-red-500 mt-0.5">
                              {card.totalFailed} falhas
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* 5. Status & Switch */}
                      <td className="py-4 px-4 whitespace-nowrap min-w-[130px]">
                        <div className="flex items-center gap-2.5">
                          {/* Switch toggle */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={card.active}
                              onChange={() => onToggleActive(card.id)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#109353]"></div>
                          </label>
                          {getStatusBadge(card)}
                        </div>
                      </td>

                      {/* 6. Ações */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {onSendNow && (
                            <button
                              onClick={() => onSendNow(card.id)}
                              className="p-1.5 rounded-lg text-[#109353] hover:text-[#0b6e3d] hover:bg-[#eaf6ef] transition-colors cursor-pointer"
                              title="Disparar / Reenviar Agora"
                            >
                              <Send size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => onDuplicateCampaign && onDuplicateCampaign(card)}
                            className="p-1.5 rounded-lg text-[#61766b] hover:text-[#11241c] hover:bg-[#edf4f0] transition-colors cursor-pointer"
                            title="Duplicar"
                          >
                            <Copy size={15} />
                          </button>
                          {onDeleteCampaign && (
                            <button
                              onClick={() => onDeleteCampaign(card.id)}
                              className="p-1.5 rounded-lg text-[#b85a5a] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-[#fafcfb] border-t border-[#edf2ee] text-xs text-[#5d7166]">
            <span>
              Mostrando {Math.min(1, sorted.length)} a {Math.min(sorted.length, currentPage * itemsPerPage)} de {sorted.length} divulgações
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-[#dce5df] bg-white disabled:opacity-40 hover:bg-[#f2f6f3] transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-7 h-7 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === num
                      ? 'bg-[#109353] text-white shadow-2xs'
                      : 'bg-white text-[#4f6458] border border-[#dce5df] hover:bg-[#f2f6f3]'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-[#dce5df] bg-white disabled:opacity-40 hover:bg-[#f2f6f3] transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
