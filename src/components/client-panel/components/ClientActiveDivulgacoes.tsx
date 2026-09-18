import React, { useRef } from 'react';
import { MoreVertical, Clock, Users, Send, ChevronLeft, ChevronRight, RotateCcw, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { DivulgacaoCard } from '../types';

interface ClientActiveDivulgacoesProps {
  campaigns: DivulgacaoCard[];
  onToggleActive?: (id: string) => void;
  onViewAll?: () => void;
  onSendNow?: (id: string) => void;
}

export const ClientActiveDivulgacoes: React.FC<ClientActiveDivulgacoesProps> = ({
  campaigns,
  onToggleActive,
  onViewAll,
  onSendNow,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -290 : 290;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getBadge = (card: DivulgacaoCard) => {
    if (card.status === 'enviando') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <RefreshCw size={10} className="animate-spin text-blue-600" />
          <span>Enviando ({card.totalSent || 0}/{card.groupsCount || 1})</span>
        </span>
      );
    }
    if (card.status === 'falha') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={10} className="text-red-600" />
          <span>Falha</span>
        </span>
      );
    }
    if (card.status === 'parcial') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          <CheckCircle2 size={10} className="text-amber-600" />
          <span>Parcial ({card.totalSent}/{card.groupsCount})</span>
        </span>
      );
    }
    if (card.status === 'concluida') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaf6ef] text-[#109353] border border-[#d3ecd9]">
          <CheckCircle2 size={10} />
          <span>Concluída ({card.totalSent}/{card.groupsCount})</span>
        </span>
      );
    }
    if (card.status === 'agendada') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f4f2] text-[#556b60] border border-[#e2eae5]">
          <Clock size={10} />
          <span>Agendada</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaf6ef] text-[#109353] border border-[#d3ecd9]">
        <span>Ativa</span>
      </span>
    );
  };

  return (
    <div
      id="client-active-divulgacoes-section"
      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#e5ebe7] shadow-xs flex flex-col justify-between"
    >
      {/* Header with Title, Count, Carousel Arrows & View All */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#f0f4f1] gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h3 className="text-base sm:text-lg font-bold text-[#11241c]">Divulgações ativas</h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#eaf6ef] text-[#109353]">
            {campaigns.filter((c) => c.active).length} ativas
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Carousel Arrows */}
          <div className="flex items-center gap-1 bg-[#f4f8f5] p-0.5 rounded-xl border border-[#e2eae5]">
            <button
              onClick={() => scroll('left')}
              className="p-1 rounded-lg text-[#55695e] hover:text-[#11241c] hover:bg-white transition-all cursor-pointer shadow-2xs"
              title="Anterior"
              aria-label="Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1 rounded-lg text-[#55695e] hover:text-[#11241c] hover:bg-white transition-all cursor-pointer shadow-2xs"
              title="Próximo"
              aria-label="Próximo"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={onViewAll}
            className="text-xs font-bold text-[#109353] hover:text-[#0d7943] transition-colors cursor-pointer px-1 py-0.5"
          >
            Ver todas
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Track or Empty State */}
      {campaigns.length === 0 ? (
        <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold">
            <Send size={18} />
          </div>
          <div className="flex flex-col gap-0.5 max-w-sm">
            <h4 className="text-sm font-bold text-[#11241c]">Nenhuma divulgação ativa</h4>
            <p className="text-xs text-[#62776c]">
              Crie sua primeira campanha para disparar mensagens automáticas nos grupos.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={carouselRef}
          className="flex gap-3.5 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-3.5 pb-2 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {campaigns.map((card) => (
            <div
              key={card.id}
              id={`campaign-card-${card.id}`}
              className="w-[240px] sm:w-[260px] md:w-[275px] shrink-0 snap-start bg-[#f8faf9] rounded-2xl p-3.5 border border-[#e4ebe6] flex flex-col justify-between hover:border-[#b8d4c2] hover:shadow-xs transition-all"
            >
              {/* Image Preview & Switch / Menu */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                {/* Image thumbnail / preview */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-[#d6e0da] bg-white shrink-0 shadow-xs">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#ebf5ef] flex items-center justify-center text-[#109353] font-bold text-sm">
                      💬
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex flex-col items-end gap-1.5">
                  {/* Active Green Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={card.active}
                      onChange={() => onToggleActive && onToggleActive(card.id)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#109353]"></div>
                  </label>

                  {/* 3 Dots */}
                  <button
                    className="p-1 rounded-md text-[#84968d] hover:text-[#11241c] hover:bg-[#e4ebe6] transition-colors cursor-pointer"
                    aria-label="Opções"
                  >
                    <MoreVertical size={15} />
                  </button>
                </div>
              </div>

              {/* Campaign Title */}
              <div className="flex flex-col mb-2.5">
                <span className="text-xs sm:text-sm font-bold text-[#11241c] line-clamp-1">
                  {card.title}
                </span>
              </div>

              {/* Schedule & Stats */}
              <div className="flex flex-col gap-1.5 text-[11px] sm:text-xs text-[#52655b] pt-2 border-t border-[#e8efe9]">
                <div className="flex items-center gap-1.5 truncate">
                  <Clock size={12} className="text-[#109353] shrink-0" />
                  <span className="truncate">{card.scheduleDays} • {card.scheduleTime}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Users size={12} className="text-[#109353] shrink-0" />
                  <span className="truncate">{card.groupsCount} grupos</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Send size={12} className="text-[#109353] shrink-0" />
                  <span className="truncate">
                    {card.totalSent} de {card.groupsCount || card.totalTarget || 1} {card.totalSent === 1 ? 'envio' : 'envios'}
                  </span>
                </div>
              </div>

              {/* Status Badge & Quick Re-Send Action */}
              <div className="pt-2 mt-2 border-t border-[#e8efe9] flex items-center justify-between gap-1">
                <div>{getBadge(card)}</div>
                {onSendNow && (card.status === 'falha' || card.status === 'concluida' || card.status === 'parcial' || card.status === 'agendada') && (
                  <button
                    type="button"
                    onClick={() => onSendNow(card.id)}
                    className="text-[11px] font-bold text-[#109353] hover:text-[#0b6e3d] flex items-center gap-1 cursor-pointer hover:underline"
                    title="Disparar imediatamente para os grupos"
                  >
                    <RotateCcw size={11} />
                    <span>Reenviar</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

