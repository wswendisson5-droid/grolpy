import React, { useState } from 'react';
import { Calendar, CheckCircle2, RefreshCw, MoreVertical, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { AgendaItem } from '../types';

interface ClientAgendaTodayProps {
  items: AgendaItem[];
  onOpenDetails?: (item?: AgendaItem) => void;
}

export const ClientAgendaToday: React.FC<ClientAgendaTodayProps> = ({ items, onOpenDetails }) => {
  // Generate dates: today, tomorrow, etc.
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  
  const generateDates = (baseDate: Date, count: number) => {
    return Array.from({ length: count }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dateStr = d.toLocaleDateString('pt-BR', options);
      const rawDateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      
      let label = isToday ? 'Hoje' : isTomorrow ? 'Amanhã' : '';
      if (label) label += ', ';
      
      return {
        label: `${label}${dateStr}`,
        rawDate: rawDateStr
      };
    });
  };

  const dates = generateDates(today, 7);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  const handlePrevDate = () => {
    if (currentDateIndex > 0) setCurrentDateIndex(currentDateIndex - 1);
  };

  const handleNextDate = () => {
    if (currentDateIndex < dates.length - 1) setCurrentDateIndex(currentDateIndex + 1);
  };

  const selectedDateStr = dates[currentDateIndex].rawDate;

  // Filter items by the selected date (assuming item.scheduledDate is YYYY-MM-DD or similar)
  const filteredItems = items.filter(item => {
    if (!item.scheduledDate && currentDateIndex === 0) return true;
    if (item.scheduledDate && item.scheduledDate.startsWith(selectedDateStr)) return true;
    if (item.scheduledDate === dates[currentDateIndex].label) return true;
    if (item.scheduledDate === 'Hoje' && currentDateIndex === 0) return true;
    return false;
  });

  const displayItems = filteredItems.slice(0, 5);
  const hasMore = filteredItems.length > 5;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] shadow-xs flex-1 flex flex-col min-h-[380px]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-[#f0f5f2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#109353] to-[#0c7040] text-white flex items-center justify-center shadow-md">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[#11241c] leading-tight">Agenda de Hoje</h3>
            <p className="text-[#62776c] text-xs font-medium mt-0.5">Visão geral do dia</p>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 bg-[#f4f7f5] px-3 py-1.5 rounded-xl border border-[#e6ebe8] font-bold text-xs text-[#2b3e34] self-start sm:self-auto">
          <Calendar size={14} className="text-[#109353]" />
          <span>{dates[currentDateIndex].label}</span>
          <div className="flex items-center ml-2 gap-0.5">
            <button
              onClick={handlePrevDate}
              disabled={currentDateIndex === 0}
              className={`p-1 rounded transition-colors ${currentDateIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white text-[#5c6e64] hover:text-[#11241c] cursor-pointer'}`}
              title="Data anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleNextDate}
              disabled={currentDateIndex === dates.length - 1}
              className={`p-1 rounded transition-colors ${currentDateIndex === dates.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white text-[#5c6e64] hover:text-[#11241c] cursor-pointer'}`}
              title="Próxima data"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Items List or Empty State */}
      {displayItems.length === 0 ? (
        <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold">
            <Calendar size={22} />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-sm font-bold text-[#11241c]">Nenhum envio agendado para esta data</h4>
            <p className="text-xs text-[#62776c]">
              Quando você criar divulgações ou agendar disparos, o cronograma aparecerá detalhado aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col my-2">
          {displayItems.map((item, index) => {
            const isSent = item.status === 'enviado';
            const isSending = item.status === 'enviando';
            const isScheduled = item.status === 'agendado';
            const isFirst = index === 0;
            const isLast = index === displayItems.length - 1 && !hasMore;

            return (
              <div
                key={item.id}
                className="relative flex items-center justify-between gap-3 sm:gap-4 py-3 sm:py-3.5 px-2 sm:px-3 hover:bg-[#fbfdfc] rounded-2xl transition-all group"
              >
                {/* Left Side: Time + Continuous Vertical Timeline Connector */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Time */}
                  <span className="text-xs sm:text-sm font-extrabold text-[#11241c] w-12 sm:w-14 shrink-0 tracking-tight">
                    {item.time}
                  </span>

                  {/* Vertical Connector Line & Bullet Dot */}
                  <div className="relative flex items-center justify-center w-5 h-8">
                    {/* Top connector line */}
                    {!isFirst && (
                      <div className="absolute top-0 bottom-1/2 w-[2px] bg-[#e1eae4]" />
                    )}
                    {/* Bottom connector line */}
                    {!isLast && (
                      <div className="absolute top-1/2 bottom-0 w-[2px] bg-[#e1eae4]" />
                    )}
                    
                    {/* Dot Indicator */}
                    <div
                      className={`relative z-10 w-2.5 h-2.5 rounded-full border-2 border-white shadow-2xs ${
                        isSent
                          ? 'bg-[#109353] ring-2 ring-[#109353]/30'
                          : isSending
                          ? 'bg-[#109353] animate-ping ring-2 ring-[#109353]/40'
                          : 'bg-[#b3c4ba]'
                      }`}
                    />
                  </div>

                  {/* Status Badge Pill */}
                  <div className="shrink-0 w-[95px]">
                    {isSent && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold bg-[#e8f7ee] text-[#109353] border border-[#d2f0df] shadow-2xs w-full">
                        <CheckCircle2 size={13} className="text-[#109353]" />
                        <span>{item.statusLabel || 'Concluído'}</span>
                      </span>
                    )}
                    {isSending && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold bg-[#eaf2ff] text-blue-700 border border-[#bfdbfe] shadow-2xs animate-pulse w-full">
                        <RefreshCw size={13} className="animate-spin text-blue-600" />
                        <span>{item.statusLabel || 'Enviando...'}</span>
                      </span>
                    )}
                    {item.status === 'parcial' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-[#fff8eb] text-amber-700 border border-[#fed7aa] shadow-2xs w-full">
                        <AlertCircle size={13} className="text-amber-600" />
                        <span>{item.statusLabel || 'Parcial'}</span>
                      </span>
                    )}
                    {isScheduled && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-[#f1f4f2] text-[#6b7d73] border border-[#e2eae5] w-full">
                        <Clock size={13} className="text-[#7e9086]" />
                        <span>{item.statusLabel || 'Agendado'}</span>
                      </span>
                    )}
                    {item.status === 'falha' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] w-full">
                        <AlertCircle size={13} className="text-[#b91c1c]" />
                        <span>{item.statusLabel || 'Falha'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Title & Subtitle Group */}
                <div className="flex flex-col min-w-0 flex-1 px-1 sm:px-2">
                  <span className="text-xs sm:text-[13.5px] font-extrabold text-[#11241c] truncate">
                    {item.campaignTitle}
                  </span>
                  <span className="text-[11px] font-medium text-[#718479] truncate mt-0.5">
                    {item.groupName}
                  </span>
                </div>

                {/* Right Area: Thumbnail + Text Snippet */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Thumbnail Image */}
                  {item.imageThumbnail ? (
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-[#dbe4de] bg-[#f0f5f2] shrink-0 shadow-2xs hidden sm:block">
                      <img
                        src={item.imageThumbnail}
                        alt={item.campaignTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {item.imageTag && (
                        <span className="absolute top-0 right-0 text-[9px] bg-black/60 text-white px-1 py-0.5 rounded-bl">
                          {item.imageTag}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold text-sm shrink-0 border border-[#dbe4de] hidden sm:flex">
                      💬
                    </div>
                  )}

                  {/* 3 Dots Menu */}
                  <button
                    onClick={() => onOpenDetails && onOpenDetails(item)}
                    className="p-1.5 rounded-xl text-[#84968d] hover:text-[#11241c] hover:bg-[#edf4f0] transition-colors cursor-pointer"
                    aria-label="Opções"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          
          {hasMore && (
            <div className="mt-4 pt-2 border-t border-[#f0f5f2] flex justify-center">
              <button 
                onClick={() => onOpenDetails && onOpenDetails()}
                className="text-[#109353] hover:text-[#0b6e3d] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#eaf6ef] transition-colors cursor-pointer w-full text-center"
              >
                Ver todas as {filteredItems.length} divulgações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
