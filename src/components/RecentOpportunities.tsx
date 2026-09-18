import React, { useRef, useState } from 'react';
import { Opportunity } from '../types/nexus';
import {
  MessageCircle,
  Clock,
  MoreHorizontal,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Camera,
  ImageOff,
} from 'lucide-react';

interface RecentOpportunitiesProps {
  opportunities: Opportunity[];
  totalCount?: number;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onViewAll?: () => void;
  selectedOpportunityId?: string | null;
}

/**
 * Checks if the given URL is an authentic image attached by the contact via WhatsApp.
 * Explicitly rejects fabricated/stock Unsplash photography or mock placeholders.
 */
export const isRealReceivedImage = (url?: string | null, hasAttachedImage?: boolean): boolean => {
  if (hasAttachedImage === false) return false;
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (hasAttachedImage === true) return true;
  // Stock photography is never an authentic contact-sent photo
  if (trimmed.includes('unsplash.com')) return false;
  if (trimmed.includes('placeholder')) return false;
  if (trimmed.startsWith('data:image/svg+xml')) return false;
  return true;
};

export const RecentOpportunities: React.FC<RecentOpportunitiesProps> = ({
  opportunities,
  totalCount = 37,
  onSelectOpportunity,
  onViewAll,
  selectedOpportunityId,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});
  const [displayMode, setDisplayMode] = useState<'placeholder' | 'compact'>('placeholder');

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const renderScoreBadge = (score: number, extraClasses = '') => (
    <div
      className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center font-extrabold text-[11px] sm:text-xs shadow-xs border ${
        score >= 80
          ? 'text-[#059669] border-[#059669]'
          : score >= 70
          ? 'text-[#0d9488] border-[#0d9488]'
          : 'text-[#475569] border-[#cbd5e1]'
      } ${extraClasses}`}
    >
      {score}
    </div>
  );

  return (
    <div
      id="recent-opportunities-section"
      className="flex flex-col gap-2.5 sm:gap-3 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-[#142d23]">
            Oportunidades recentes
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-[#f0f4f1] text-[#526359] text-[11px] sm:text-xs font-bold">
            {totalCount}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Layout Mode Selector (Possibility 1: Sem Imagem vs Possibility 2: Placeholder Neutro) */}
          <div
            className="flex items-center p-0.5 bg-[#edf3ef] rounded-lg border border-[#dde6e1] text-[10px] font-semibold text-[#52645a]"
            title="Alternar exibição de cards sem foto anexada"
          >
            <button
              id="toggle-mode-placeholder"
              onClick={() => setDisplayMode('placeholder')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                displayMode === 'placeholder'
                  ? 'bg-white text-[#142d23] shadow-xs'
                  : 'text-[#6a7d73] hover:text-[#142d23]'
              }`}
            >
              Placeholder neutro
            </button>
            <button
              id="toggle-mode-compact"
              onClick={() => setDisplayMode('compact')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                displayMode === 'compact'
                  ? 'bg-white text-[#142d23] shadow-xs'
                  : 'text-[#6a7d73] hover:text-[#142d23]'
              }`}
            >
              Sem imagem
            </button>
          </div>

          <button
            id="view-all-opportunities-btn"
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-[#4e6056] hover:text-[#143d2f] transition-colors cursor-pointer py-1"
          >
            <span>Ver todas</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel with Floating Next Button */}
      <div className="relative group">
        {/* Left Arrow (visible on hover / scroll) */}
        <button
          id="carousel-prev-btn"
          onClick={() => scroll('left')}
          title="Rolar para esquerda"
          className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8.5 h-8.5 rounded-full bg-white border border-[#dbe4df] shadow-md items-center justify-center text-[#2a4437] hover:bg-[#f6f9f7] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Carousel Container with smooth native momentum touch scrolling */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 px-1 scroll-smooth snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {opportunities.map((opp) => {
            const isSelected = selectedOpportunityId === opp.id;
            const hasRealImage = isRealReceivedImage(opp.image, opp.hasAttachedImage) && !failedImageIds[opp.id];

            return (
              <div
                key={opp.id}
                id={`recent-opp-card-${opp.id}`}
                className={`w-[220px] xs:w-[235px] sm:w-[245px] shrink-0 bg-white rounded-2xl p-3 border transition-all duration-200 flex flex-col justify-between snap-start shadow-[0_1px_3px_rgba(18,56,44,0.02)] ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-200 shadow-md'
                    : 'border-[#e8eee9] hover:border-[#d4e1da] hover:shadow-sm'
                }`}
              >
                <div>
                  {/* CASE 1: Contact genuinely sent a real image via WhatsApp */}
                  {hasRealImage ? (
                    <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-[#e8f0ec] mb-2.5 sm:mb-3">
                      <img
                        src={opp.image!}
                        alt={opp.title}
                        referrerPolicy="no-referrer"
                        onError={() => {
                          // Fallback to neutral placeholder if media fails, NEVER invent stock photo
                          setFailedImageIds((prev) => ({ ...prev, [opp.id]: true }));
                        }}
                        className="w-full h-full object-cover"
                      />

                      {/* Genuine WhatsApp Attachment Indicator */}
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                        <Camera size={11} className="text-emerald-400" />
                        <span>Foto anexada</span>
                      </div>

                      {/* Score Badge */}
                      {renderScoreBadge(opp.score, 'absolute top-2 right-2 sm:top-2.5 sm:right-2.5')}
                    </div>
                  ) : displayMode === 'placeholder' ? (
                    /* CASE 2: No image received -> Neutral square placeholder (~300x300 / 500x500 proportion) */
                    <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-[#f4f7f5] border border-dashed border-[#d8e2dc] mb-2.5 sm:mb-3 flex flex-col items-center justify-center p-3 text-center">
                      {/* Score Badge */}
                      {renderScoreBadge(opp.score, 'absolute top-2 right-2 sm:top-2.5 sm:right-2.5')}

                      {/* Neutral visual placeholder representation */}
                      <div className="w-8 h-8 rounded-full bg-[#e5eee8] flex items-center justify-center text-[#6e8277] mb-1.5">
                        <ImageOff size={15} />
                      </div>
                      <span className="text-[11.5px] font-bold text-[#2e4539] leading-tight">
                        Sem imagem disponível
                      </span>
                      <span className="text-[9.5px] text-[#788e83] mt-0.5">
                        Publicação original em texto
                      </span>
                    </div>
                  ) : (
                    /* CASE 3: Compact display without image area */
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#f1f5f2]">
                      <span className="text-[10px] font-medium text-[#7a8e83] flex items-center gap-1">
                        <ImageOff size={11} className="text-[#9cb0a5]" />
                        Sem foto anexada
                      </span>
                      {renderScoreBadge(opp.score)}
                    </div>
                  )}

                  {/* Title & Segment */}
                  <div className="flex flex-col mb-2">
                    <h3 className="text-[13.5px] sm:text-sm font-bold text-[#142d23] leading-tight truncate">
                      {opp.title}
                    </h3>
                    <span className="text-[11px] font-medium text-[#6f8077] truncate">
                      {opp.segment}
                    </span>
                  </div>

                  {/* WhatsApp Group & Relative Time */}
                  <div className="flex flex-col gap-1 text-[11px] text-[#55675e] mb-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <MessageCircle
                        size={12}
                        className="text-[#059669] shrink-0"
                      />
                      <span className="truncate">Grupo: {opp.groupName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#889991]">
                      <Clock size={12} className="shrink-0" />
                      <span>{opp.relativeTime}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-[#f1f5f2]">
                  <button
                    id={`btn-details-${opp.id}`}
                    onClick={() => onSelectOpportunity(opp)}
                    className="flex-1 py-2 sm:py-1.5 px-3 rounded-xl bg-[#f2f6f4] hover:bg-[#e6eee9] active:bg-[#dce7e1] text-[#16382c] text-xs font-semibold transition-colors text-center cursor-pointer min-h-[36px] sm:min-h-0 flex items-center justify-center"
                  >
                    Ver detalhes
                  </button>

                  <button
                    id={`btn-more-options-${opp.id}`}
                    aria-label={`Mais opções para ${opp.title}`}
                    onClick={() => onSelectOpportunity(opp)}
                    className="w-9 h-9 sm:w-8 sm:h-7.5 rounded-xl bg-[#f2f6f4] hover:bg-[#e6eee9] active:bg-[#dce7e1] text-[#607269] hover:text-[#16382c] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow (visible on desktop) */}
        <button
          id="carousel-next-btn"
          onClick={() => scroll('right')}
          title="Rolar para direita"
          className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8.5 h-8.5 rounded-full bg-white border border-[#dbe4df] shadow-md items-center justify-center text-[#2a4437] hover:bg-[#f6f9f7] transition-all cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
