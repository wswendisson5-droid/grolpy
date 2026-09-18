import React from 'react';
import { MoreVertical, Calendar, Plus } from 'lucide-react';
import { AgendaItem } from '../types';

interface ClientNextSendsCardProps {
  items?: AgendaItem[];
  onViewAll?: () => void;
  onNewCampaign?: () => void;
}

export const ClientNextSendsCard: React.FC<ClientNextSendsCardProps> = ({
  items = [],
  onViewAll,
  onNewCampaign,
}) => {
  return (
    <div
      id="client-next-sends-card"
      className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] shadow-xs flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#f0f4f1]">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#11241c]">Próximos envios</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf6ef] text-[#109353]">
            {items.length}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-[#109353] hover:text-[#0d7943] transition-colors cursor-pointer"
          >
            Ver todos
          </button>
        )}
      </div>

      {/* List or Empty State */}
      {items.length === 0 ? (
        <div className="py-6 px-2 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[#f0f5f2] text-[#63776c] flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <p className="text-xs font-bold text-[#1a2d24]">Nenhum envio agendado</p>
          <p className="text-[11px] text-[#6d8076] max-w-xs">
            Suas mensagens programadas nos grupos do WhatsApp aparecerão listadas aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#f2f6f3] pt-1">
          {items.slice(0, 4).map((item, idx) => (
            <div
              key={item.id || idx}
              className="py-3 flex items-center justify-between gap-3 hover:bg-[#fafcfb] px-1 rounded-xl transition-colors"
            >
              {/* Number Pill & Time */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="w-6 h-6 rounded-full bg-[#f0f5f2] text-[#3e5246] text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#192c22]">
                  {item.time}
                </span>
              </div>

              {/* Thumbnail */}
              {item.imageThumbnail ? (
                <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#dbe4de] shrink-0 bg-[#edf3ef]">
                  <img
                    src={item.imageThumbnail}
                    alt={item.campaignTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold text-xs shrink-0">
                  💬
                </div>
              )}

              {/* Title & Group */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-[#11241c] truncate">
                  {item.campaignTitle}
                </span>
                <span className="text-[11px] text-[#63756b] truncate">
                  {item.groupName}
                </span>
              </div>

              {/* Status Badge */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#eaf6ef] text-[#109353]">
                {item.statusLabel || 'Agendado'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
