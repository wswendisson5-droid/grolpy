import React, { useState } from 'react';
import {
  HugeIcon,
  Copy01Icon,
  ExternalLinkIcon,
  RefreshIcon,
  Settings01Icon,
  VideoIcon,
  HelpCircleIcon,
  Message01Icon,
  ChevronRightIcon,
} from '../icons/HugeIcon';
import { ConnectionInfo, ConnectionStatus } from '../../types/connection';

interface ConnectionSidePanelProps {
  info: ConnectionInfo;
  onRefreshQr?: () => void;
  onOpenSettings?: () => void;
}

export const ConnectionSidePanel: React.FC<ConnectionSidePanelProps> = ({
  info,
  onRefreshQr,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInstance = () => {
    navigator.clipboard.writeText(info.instanceName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = info.status;
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Status da conexão Card */}
      <div className="bg-white rounded-2xl border border-[#e3eae5] p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-bold text-[#142d23]">
          Status da conexão
        </h3>

        {/* Dynamic Status Header */}
        <div className="p-3.5 rounded-xl bg-[#f9faf9] border border-[#e8eee9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className={`w-3.5 h-3.5 rounded-full ${
                isConnected
                  ? 'bg-[#10b981]'
                  : isConnecting
                  ? 'bg-[#10b981] animate-ping'
                  : 'bg-[#10b981]'
              }`} />
              {!isConnected && (
                <span className="absolute w-2 h-2 rounded-full bg-[#10b981]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#142d23] leading-tight">
                {isConnected
                  ? 'Conectado'
                  : isConnecting
                  ? 'Conectando...'
                  : 'Aguardando leitura'}
              </span>
              <span className="text-[11px] text-[#63756b] mt-0.5 leading-tight">
                {isConnected
                  ? 'Seu WhatsApp está ativo e operando normalmente.'
                  : isConnecting
                  ? 'Aguardando leitura do QR Code no WhatsApp'
                  : 'Escaneie o QR Code para conectar'}
              </span>
            </div>
          </div>

          {/* Radial meter for waiting state */}
          {!isConnected && (
            <div className="w-7 h-7 rounded-full border-2 border-[#10b981] border-r-transparent animate-spin shrink-0" />
          )}
        </div>

        {/* Info properties list */}
        <div className="flex flex-col gap-2.5 text-xs pt-1">
          <div className="flex items-center justify-between py-1 border-b border-[#f0f4f1]">
            <span className="text-[#65766d]">Instância</span>
            <div className="flex items-center gap-1.5 font-medium text-[#18392d]">
              <span>{info.instanceName}</span>
              <button
                onClick={handleCopyInstance}
                className="text-[#8c9e94] hover:text-[#18392d]"
                title="Copiar nome da instância"
              >
                <HugeIcon icon={Copy01Icon} size={12} />
              </button>
              {copied && <span className="text-[10px] text-emerald-600 font-bold">Copiado!</span>}
            </div>
          </div>

          {isConnected && (
            <>
              <div className="flex items-center justify-between py-1 border-b border-[#f0f4f1]">
                <span className="text-[#65766d]">Número</span>
                <div className="flex items-center gap-1.5 font-medium text-[#18392d]">
                  <span>{info.profile?.number || '+55 27 99876-5432'}</span>
                  <HugeIcon icon={ExternalLinkIcon} size={12} className="text-[#8c9e94]" />
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#f0f4f1]">
                <span className="text-[#65766d]">Nome do perfil</span>
                <span className="font-medium text-[#18392d]">{info.profile?.name || 'Nexus Prospecção'}</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between py-1 border-b border-[#f0f4f1]">
            <span className="text-[#65766d]">Plataforma</span>
            <div className="flex items-center gap-1 font-medium text-[#18392d]">
              <span>{info.platform}</span>
              <HugeIcon icon={ExternalLinkIcon} size={12} className="text-[#8c9e94]" />
            </div>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#f0f4f1]">
            <span className="text-[#65766d]">Webhook</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                info.webhookStatus === 'active' || isConnected ? 'bg-[#10b981]' : 'bg-[#94a3b8]'
              }`} />
              <span className={`font-semibold ${
                info.webhookStatus === 'active' || isConnected ? 'text-[#0d8258]' : 'text-[#64748b]'
              }`}>
                {info.webhookStatus === 'active' || isConnected ? 'Ativo' : 'Aguardando conexão'}
              </span>
            </div>
          </div>

          {isConnected ? (
            <>
              <div className="flex items-center justify-between py-1 border-b border-[#f0f4f1]">
                <span className="text-[#65766d]">Última atividade</span>
                <span className="text-[#18392d]">{info.lastActivity || 'Há 1 minuto'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#f0f4f1]">
                <span className="text-[#65766d]">Mensagens hoje</span>
                <span className="text-[#18392d] font-bold">{info.messagesToday || 27}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#65766d]">Status da API</span>
                <div className="flex items-center gap-1.5 font-semibold text-[#0d8258]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span>Online</span>
                </div>
              </div>
            </>
          ) : isConnecting ? (
            <div className="flex items-center justify-between py-1">
              <span className="text-[#65766d]">Última atualização</span>
              <span className="text-[#18392d]">12/09/2026 às 14:32</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 2. Middle Card based on state: */}
      {/* If State 2 (Connecting): "Como conectar?" card */}
      {isConnecting && (
        <div className="bg-white rounded-2xl border border-[#e3eae5] p-5 shadow-xs flex flex-col gap-3">
          <h4 className="text-sm font-bold text-[#142d23]">
            Como conectar?
          </h4>
          <div className="flex flex-col gap-3 text-xs text-[#2c3d35] pt-1">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
              <span>Abra o WhatsApp no seu celular</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
              <span>Toque em <strong>Aparelhos conectados</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
              <span>Toque em <strong>Conectar um aparelho</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#d8ece4] text-[#12382c] font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
              <span>Escaneie o QR Code da tela</span>
            </div>
          </div>
        </div>
      )}

      {/* If State 3 (Connected): "Ações rápidas" card */}
      {isConnected && (
        <div className="bg-white rounded-2xl border border-[#e3eae5] p-5 shadow-xs flex flex-col gap-2">
          <h4 className="text-sm font-bold text-[#142d23] mb-1">
            Ações rápidas
          </h4>

          <button
            onClick={onRefreshQr}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f3f7f4] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] group-hover:bg-[#e4efe8] flex items-center justify-center text-[#18392d]">
                <HugeIcon icon={RefreshIcon} size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#142d23]">Gerar novo QR Code</span>
                <span className="text-[10px] text-[#67786f]">Se houver algum problema na conexão</span>
              </div>
            </div>
            <HugeIcon icon={ChevronRightIcon} size={14} className="text-[#8c9e94] group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f3f7f4] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] group-hover:bg-[#e4efe8] flex items-center justify-center text-[#18392d]">
                <HugeIcon icon={Settings01Icon} size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#142d23]">Configurações da instância</span>
                <span className="text-[10px] text-[#67786f]">Webhook, eventos e preferências</span>
              </div>
            </div>
            <HugeIcon icon={ChevronRightIcon} size={14} className="text-[#8c9e94] group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f3f7f4] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] group-hover:bg-[#e4efe8] flex items-center justify-center text-[#18392d]">
                <HugeIcon icon={ExternalLinkIcon} size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#142d23]">Abrir Evolution</span>
                <span className="text-[10px] text-[#67786f]">Acessar painel da Evolution</span>
              </div>
            </div>
            <HugeIcon icon={ChevronRightIcon} size={14} className="text-[#8c9e94] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* 3. Precisa de ajuda? Card */}
      <div className="bg-white rounded-2xl border border-[#e3eae5] p-5 shadow-xs flex flex-col gap-2">
        <h4 className="text-sm font-bold text-[#142d23] mb-1">
          Precisa de ajuda?
        </h4>

        <button className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f3f7f4] transition-colors text-left group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] flex items-center justify-center text-[#18392d]">
              <HugeIcon icon={VideoIcon} size={15} />
            </div>
            <span className="text-xs font-bold text-[#142d23]">Ver tutorial passo a passo</span>
          </div>
          <HugeIcon icon={ChevronRightIcon} size={14} className="text-[#8c9e94] group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f3f7f4] transition-colors text-left group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] flex items-center justify-center text-[#18392d]">
              <HugeIcon icon={HelpCircleIcon} size={15} />
            </div>
            <span className="text-xs font-bold text-[#142d23]">Problemas na conexão?</span>
          </div>
          <HugeIcon icon={ChevronRightIcon} size={14} className="text-[#8c9e94] group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f3f7f4] transition-colors text-left group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] flex items-center justify-center text-[#18392d]">
              <HugeIcon icon={Message01Icon} size={15} />
            </div>
            <span className="text-xs font-bold text-[#142d23]">Falar com o suporte</span>
          </div>
          <HugeIcon icon={ChevronRightIcon} size={14} className="text-[#8c9e94] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
