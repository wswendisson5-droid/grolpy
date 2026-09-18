import React from 'react';
import { HugeIcon, RefreshIcon, WhatsappIcon } from '../icons/HugeIcon';
import { Info } from 'lucide-react';
import { QrCodeData } from '../../types/connection';

interface WaitingQrViewProps {
  qrCode?: QrCodeData;
  isLoading: boolean;
  onRefreshQr: () => void;
  onResetInstance?: () => void;
  isResetting?: boolean;
}

export const WaitingQrView: React.FC<WaitingQrViewProps> = ({
  qrCode,
  isLoading,
  onRefreshQr,
  onResetInstance,
  isResetting,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-[#e2eae5] p-6 sm:p-8 lg:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Clean, Unobstructed QR Code Box & Action Buttons */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative p-5 bg-white rounded-2xl border border-[#dce6e0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-center">
            {qrCode?.base64 ? (
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center bg-white p-2">
                {/* 100% Clean QR Image without any center badge overlay that corrupts WhatsApp scanning */}
                <img
                  src={qrCode.base64}
                  alt="QR Code de conexão Evolution API"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-64 h-64 sm:w-72 sm:h-72 bg-[#f4f7f5] rounded-xl flex flex-col items-center justify-center p-6 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-[#12382c] border-t-transparent animate-spin mb-3" />
                <span className="text-xs font-semibold text-[#142d23]">
                  Gerando QR Code real...
                </span>
                <span className="text-[11px] text-[#6b7b72] mt-1">
                  Comunicando com a Evolution API
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons: Atualizar QR / Reiniciar Sessão */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
            <button
              onClick={onRefreshQr}
              disabled={isLoading || isResetting}
              className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#d6e0db] rounded-xl text-xs font-bold text-[#142d23] hover:bg-[#f3f7f4] active:scale-[0.98] transition-all cursor-pointer shadow-2xs disabled:opacity-60"
              title="Atualizar QR Code"
            >
              <HugeIcon
                icon={RefreshIcon}
                size={14}
                className={`text-[#142d23] ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>Atualizar QR</span>
            </button>

            {onResetInstance && (
              <button
                onClick={onResetInstance}
                disabled={isLoading || isResetting}
                className="flex-1 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#f0f7f4] border border-[#d0e5da] rounded-xl text-xs font-bold text-[#108e66] hover:bg-[#e4f1ea] active:scale-[0.98] transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Limpar sessão e gerar novo código"
              >
                {isResetting ? (
                  <div className="w-3 h-3 rounded-full border-2 border-[#108e66] border-t-transparent animate-spin" />
                ) : (
                  <span className="text-[11px]">⚡</span>
                )}
                <span>Novo Código</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Instructions & Steps */}
        <div className="lg:col-span-7 flex flex-col">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#12382c] tracking-tight">
            Conecte seu WhatsApp
          </h2>
          <p className="text-sm text-[#5a6c62] mt-2 mb-6 leading-relaxed">
            Escaneie o QR Code com o seu celular para conectar o número ao CRM através da Evolution.
          </p>

          {/* Steps List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <span className="text-sm text-[#27372f]">
                Abra o <strong className="font-bold text-[#12382c]">WhatsApp</strong> no seu celular
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <span className="text-sm text-[#27372f]">
                Toque em <strong className="font-bold text-[#12382c]">Aparelhos conectados</strong>
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <span className="text-sm text-[#27372f]">
                Toque em <strong className="font-bold text-[#12382c]">Conectar um aparelho</strong>
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-xs flex items-center justify-center shrink-0">
                4
              </div>
              <span className="text-sm text-[#27372f]">
                Escaneie o QR Code ao lado
              </span>
            </div>
          </div>

          {/* Bottom Info Callout */}
          <div className="mt-8 p-3.5 rounded-xl bg-[#f0f7f4] border border-[#d8ece4] flex items-start gap-3 text-xs text-[#204235] leading-relaxed">
            <Info size={16} className="text-[#108e66] shrink-0 mt-0.5" />
            <span>
              Mantenha esta página aberta enquanto conecta seu WhatsApp.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
