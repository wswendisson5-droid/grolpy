import React from 'react';
import { Settings, ChevronRight, CheckCircle, Users, Activity, QrCode, AlertCircle, Loader2 } from 'lucide-react';
import { SafeAvatar } from '../../common/SafeAvatar';

interface ClientWhatsAppCardProps {
  onNavigateToConnection?: () => void;
  groupsCount?: number;
  initialProfilePic?: string;
  initialProfileName?: string;
  initialPhoneNumber?: string;
  whatsappIsConnected?: boolean;
}

export const ClientWhatsAppCard: React.FC<ClientWhatsAppCardProps> = ({
  onNavigateToConnection,
  groupsCount = 0,
  initialProfilePic,
  initialProfileName,
  initialPhoneNumber,
  whatsappIsConnected,
}) => {
  // Strictly respect real WhatsApp connection state
  const isLoading = whatsappIsConnected === undefined && !initialPhoneNumber && !initialProfilePic;
  const isConnected = whatsappIsConnected === true;
  const displayName = initialProfileName && initialProfileName !== 'WhatsApp Conectado' ? initialProfileName : (isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado');
  const realPhone = initialPhoneNumber || '';
  
  return (
    <div
      id="client-whatsapp-status-card"
      onClick={onNavigateToConnection}
      className={`bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
        isConnected ? 'border-[#e5ebe7] hover:border-[#b8decb]' : 'border-amber-200 hover:border-amber-400 bg-amber-50/20'
      }`}
    >
      {/* Top Header: Real WhatsApp Connected Photo, Phone, Status & Actions */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* WhatsApp Connected Photo instead of generic icon */}
          <div className="relative shrink-0">
            {initialProfilePic || isConnected ? (
              <SafeAvatar
                src={initialProfilePic || '/api/whatsapp/avatar'}
                alt={displayName}
                fallbackText={displayName}
                shape="circle"
                sizeClassName="w-13 h-13"
                className="border-2 border-[#109353]/30 shadow-sm"
              />
            ) : (
              <div className="w-13 h-13 rounded-full flex items-center justify-center text-white bg-[#25d366] shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
            )}
            {isConnected && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#25d366] border-2 border-white shadow-2xs" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-[#11241c] leading-tight truncate">
              {isConnected ? displayName : 'WhatsApp Desconectado'}
            </span>
            {/* REAL CONNECTED NUMBER OR LOADING SPINNER - ZERO MOCK */}
            <div className="text-base sm:text-lg font-extrabold text-[#11241c] leading-tight truncate mt-0.5">
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#6e8276] font-semibold py-0.5">
                  <Loader2 size={13} className="animate-spin text-[#109353]" />
                  <span>Carregando número conectado...</span>
                </span>
              ) : isConnected ? (
                <span className="text-[#109353]">{realPhone}</span>
              ) : (
                <span className="text-xs text-amber-700 font-semibold">Nenhum número conectado</span>
              )}
            </div>

            <span className="text-xs text-[#718479] mt-0.5 truncate">
              {isConnected ? 'Conexão ativa e pronta para envios' : 'Clique para escanear QR Code'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#83968d]">
          <Settings size={17} className="hover:text-[#11241c] transition-colors" />
          <ChevronRight size={18} className="text-[#a4b4ab]" />
        </div>
      </div>

      {/* Bottom 3 Sub-stat Cards */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#f0f4f1]">
        {/* Stat 1 */}
        <div className="bg-[#f7faf8] rounded-xl p-2.5 flex flex-col items-center text-center">
          <div className={`flex items-center gap-1 mb-0.5 ${isConnected ? 'text-[#109353]' : 'text-amber-600'}`}>
            {isConnected ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            <span className="text-xs font-bold">{isConnected ? '100%' : '0%'}</span>
          </div>
          <span className="text-[10px] text-[#5e7166] font-medium leading-tight">
            {isConnected ? 'Conexão estável' : 'Desconectado'}
          </span>
        </div>

        {/* Stat 2 */}
        <div className="bg-[#f7faf8] rounded-xl p-2.5 flex flex-col items-center text-center">
          <div className={`flex items-center gap-1 mb-0.5 ${isConnected ? 'text-[#109353]' : 'text-zinc-500'}`}>
            <Users size={13} />
            <span className="text-xs font-bold">{isConnected ? (groupsCount !== undefined ? groupsCount : 0) : 0}</span>
          </div>
          <span className="text-[10px] text-[#5e7166] font-medium leading-tight">
            Grupos sincronizados
          </span>
        </div>

        {/* Stat 3 */}
        <div className="bg-[#f7faf8] rounded-xl p-2.5 flex flex-col items-center text-center">
          <div className={`flex items-center gap-1 mb-0.5 ${isConnected ? 'text-[#109353]' : 'text-zinc-500'}`}>
            <Activity size={13} />
            <span className="text-xs font-bold">{isConnected ? 'Online' : 'Pausado'}</span>
          </div>
          <span className="text-[10px] text-[#5e7166] font-medium leading-tight">
            {isConnected ? 'Funcionando' : 'Aguardando'}
          </span>
        </div>
      </div>
    </div>
  );
};
