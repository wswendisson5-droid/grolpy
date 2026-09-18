import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AgendaItem } from '../types';

interface ClientAgendamentosViewProps {
  agendaItems: AgendaItem[];
  onNewCampaign: () => void;
}

export const ClientAgendamentosView: React.FC<ClientAgendamentosViewProps> = ({
  agendaItems,
  onNewCampaign,
}) => {
  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs">
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold text-[#11241c]">Agendamentos de Disparo</h1>
          <p className="text-xs text-[#5f7368]">Acompanhe e organize o cronograma de envios automáticos</p>
        </div>

        <button
          onClick={onNewCampaign}
          className="px-4 py-2.5 bg-[#109353] hover:bg-[#0e8048] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Agendar Divulgação</span>
        </button>
      </div>

      {/* Timeline Schedule Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f1]">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-[#109353]" />
            <span className="font-bold text-sm text-[#11241c]">Hoje, 17 de Setembro de 2026</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e8f7ee] text-[#109353]">
            {agendaItems.length} horários programados
          </span>
        </div>

        {agendaItems.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ebf7f0] text-[#109353] flex items-center justify-center font-bold">
              <CalendarIcon size={22} />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-sm font-bold text-[#11241c]">Nenhum agendamento ativo</h3>
              <p className="text-xs text-[#62776c]">
                Crie uma divulgação programada para visualizar os horários de envio automáticos.
              </p>
            </div>
            <button
              onClick={onNewCampaign}
              className="mt-2 px-4 py-2 bg-[#109353] hover:bg-[#0e8048] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Agendar Agora</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#f2f6f3]">
            {agendaItems.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 text-xs sm:text-sm font-bold text-[#11241c] flex items-center gap-1.5">
                    <Clock size={14} className="text-[#109353]" />
                    <span>{item.time}</span>
                  </div>

                  {item.imageThumbnail ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#d8e2dc] shrink-0 bg-[#f0f4f1]">
                      <img
                        src={item.imageThumbnail}
                        alt={item.campaignTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold text-xs shrink-0">
                      💬
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-[#11241c]">{item.campaignTitle}</span>
                    <span className="text-[11px] text-[#63756b]">{item.groupName}</span>
                  </div>
                </div>

                <div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    item.status === 'enviado'
                      ? 'bg-[#e8f7ee] text-[#0d8a4c]'
                      : item.status === 'enviando'
                      ? 'bg-[#e6f4ea] text-[#0f8b4e]'
                      : 'bg-[#f1f4f2] text-[#6b7d73]'
                  }`}>
                    {item.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
