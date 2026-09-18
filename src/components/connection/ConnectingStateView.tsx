import React from 'react';
import { HugeIcon, WhatsappIcon, CheckIcon } from '../icons/HugeIcon';
import { Info, Loader2 } from 'lucide-react';

interface ConnectingStateViewProps {
  instanceName: string;
}

export const ConnectingStateView: React.FC<ConnectingStateViewProps> = ({
  instanceName,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-[#e2eae5] p-6 sm:p-10 lg:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col items-center text-center max-w-2xl mx-auto">
      {/* Glowing Pulsing WhatsApp Icon */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-[#edf6f1] flex items-center justify-center animate-pulse">
          <div className="w-20 h-20 rounded-full bg-[#d6ece0] flex items-center justify-center shadow-inner">
            <HugeIcon
              icon={WhatsappIcon}
              size={40}
              className="text-[#10b981] fill-[#10b981]"
            />
          </div>
        </div>
        <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#10b981] border-2 border-white flex items-center justify-center text-white shadow-xs">
          <Loader2 size={12} className="animate-spin" />
        </span>
      </div>

      {/* Heading */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#12382c] tracking-tight">
        Conectando ao WhatsApp...
      </h2>
      <p className="text-sm text-[#5a6c62] mt-2 mb-8 max-w-md leading-relaxed">
        Aguarde, estamos verificando a conexão da sua instância com a Evolution API.
      </p>

      {/* Checklist Card */}
      <div className="w-full max-w-md bg-[#fafbfb] rounded-2xl border border-[#e3ebe6] p-4 sm:p-5 text-left flex flex-col gap-3.5">
        {/* Step 1 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
              <HugeIcon icon={CheckIcon} size={12} strokeWidth={3} />
            </div>
            <span className="font-semibold text-[#18392d]">Instância encontrada</span>
          </div>
          <span className="text-[#607167] font-mono">{instanceName}</span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
              <HugeIcon icon={CheckIcon} size={12} strokeWidth={3} />
            </div>
            <span className="font-semibold text-[#18392d]">QR Code gerado</span>
          </div>
          <span className="text-[#607167]">há alguns segundos</span>
        </div>

        {/* Step 3 - Active */}
        <div className="flex items-center justify-between text-xs bg-[#eef7f2] -mx-2 px-2 py-1.5 rounded-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full border-2 border-[#10b981] border-t-transparent flex items-center justify-center shrink-0 animate-spin" />
            <span className="font-bold text-[#108e66]">Aguardando leitura do QR Code</span>
          </div>
          <span className="text-[#108e66] font-semibold">Conectando...</span>
        </div>

        {/* Step 4 */}
        <div className="flex items-center justify-between text-xs opacity-60">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full border border-dashed border-[#8d9e95] flex items-center justify-center shrink-0" />
            <span className="text-[#516359]">Estabelecendo conexão segura</span>
          </div>
          <span className="text-[#8d9e95]">—</span>
        </div>

        {/* Step 5 */}
        <div className="flex items-center justify-between text-xs opacity-60">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full border border-dashed border-[#8d9e95] flex items-center justify-center shrink-0" />
            <span className="text-[#516359]">Finalizando configuração</span>
          </div>
          <span className="text-[#8d9e95]">—</span>
        </div>
      </div>

      {/* Bottom Info Banner */}
      <div className="mt-8 p-3.5 rounded-xl bg-[#f0f7f4] border border-[#d8ece4] flex items-start gap-3 text-xs text-[#204235] text-left leading-relaxed w-full max-w-md">
        <Info size={16} className="text-[#108e66] shrink-0 mt-0.5" />
        <span>
          Mantenha esta página aberta enquanto conecta seu WhatsApp. Assim que a conexão for concluída, o sistema será atualizado automaticamente.
        </span>
      </div>
    </div>
  );
};
