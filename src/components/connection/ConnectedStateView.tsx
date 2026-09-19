import React, { useState } from 'react';
import {
  HugeIcon,
  WhatsappIcon,
  CheckIcon,
  Copy01Icon,
  RefreshIcon,
  Delete01Icon,
  ShieldCheckIcon,
  Edit01Icon,
} from '../icons/HugeIcon';
import { ConnectedProfile } from '../../types/connection';
import { SafeAvatar } from '../common/SafeAvatar';

interface ConnectedStateViewProps {
  instanceName: string;
  profile?: ConnectedProfile;
  onRestart: () => void;
  onDisconnect: () => void;
  isRestarting: boolean;
  isDisconnecting: boolean;
}

export const ConnectedStateView: React.FC<ConnectedStateViewProps> = ({
  instanceName,
  profile,
  onRestart,
  onDisconnect,
  isRestarting,
  isDisconnecting,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const displayName = profile?.name || instanceName || 'Groply WhatsApp';
  const displayNumber = profile?.number || (instanceName ? `Instância ${instanceName}` : 'WhatsApp Conectado');
  const hasRealCustomAvatar = Boolean(
    profile?.pictureUrl &&
    !profile.pictureUrl.includes('unsplash.com') &&
    !profile.pictureUrl.includes('placeholder')
  );
  const displayAvatar = hasRealCustomAvatar ? profile!.pictureUrl! : '';
  const connectedDate = profile?.connectedAt || new Date().toLocaleString('pt-BR');
  const lastSyncDate = profile?.lastSyncAt || new Date().toLocaleString('pt-BR');
  const version = profile?.version || 'v2.3.7';

  return (
    <div className="flex flex-col gap-5">
      {/* Main Connected Card */}
      <div className="bg-white rounded-3xl border border-[#e2eae5] p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
        {/* Big Green Success WhatsApp Icon */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-full bg-[#edf7f2] flex items-center justify-center">
            <div className="w-18 h-18 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-md">
              <HugeIcon
                icon={WhatsappIcon}
                size={34}
                className="text-white fill-white"
              />
            </div>
          </div>
          <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border-2 border-[#10b981] flex items-center justify-center text-[#10b981] shadow-xs">
            <HugeIcon icon={CheckIcon} size={14} strokeWidth={3} />
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#12382c] tracking-tight">
          Conexão realizada com sucesso!
        </h2>
        <p className="text-sm text-[#5a6c62] mt-2 mb-8 max-w-lg leading-relaxed">
          Seu número do WhatsApp já está conectado e pronto para atender no CRM através da Evolution API.
        </p>

        {/* Profile Card */}
        <div className="w-full max-w-xl bg-white rounded-2xl border border-[#e2ece6] p-5 sm:p-6 text-left shadow-xs flex flex-col gap-6">
          {/* Header row: Avatar + Name + Number + Status Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#edf3ef]">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <SafeAvatar
                  src={displayAvatar}
                  alt={displayName}
                  fallbackIcon={<HugeIcon icon={WhatsappIcon} size={26} className="text-white fill-white" />}
                  shape="rounded-2xl"
                  sizeClassName="w-14 h-14"
                  className="border border-[#dce6df] shadow-2xs"
                />
                <button
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-[#dce6df] flex items-center justify-center text-[#4c5f54] hover:text-[#12382c] shadow-2xs"
                  title="Editar avatar"
                >
                  <HugeIcon icon={Edit01Icon} size={10} />
                </button>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-[#142d23]">
                    {displayName}
                  </h3>
                  <button className="text-[#8c9e94] hover:text-[#142d23]">
                    <HugeIcon icon={Edit01Icon} size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#52645a] font-medium">
                    {displayNumber}
                  </span>
                  <button
                    onClick={() => handleCopy(displayNumber, 'phone')}
                    className="text-[#8c9e94] hover:text-[#12382c] transition-colors"
                    title="Copiar número"
                  >
                    <HugeIcon icon={Copy01Icon} size={12} />
                  </button>
                  {copiedField === 'phone' && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Copiado!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Conectado Pill */}
            <div className="px-3 py-1 bg-[#e8f7ee] text-[#0d8258] rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span>Conectado</span>
            </div>
          </div>

          {/* Details 2-column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-8 text-xs">
            {/* Col 1 */}
            <div className="flex items-center justify-between py-1 border-b border-[#f3f7f4]">
              <span className="text-[#64766c]">Instância</span>
              <div className="flex items-center gap-1.5 font-medium text-[#18392d]">
                <span>{instanceName}</span>
                <button
                  onClick={() => handleCopy(instanceName, 'instance')}
                  className="text-[#8c9e94] hover:text-[#12382c]"
                  title="Copiar nome da instância"
                >
                  <HugeIcon icon={Copy01Icon} size={12} />
                </button>
              </div>
            </div>

            {/* Col 2 */}
            <div className="flex items-center justify-between py-1 border-b border-[#f3f7f4]">
              <span className="text-[#64766c]">Webhook</span>
              <div className="flex items-center gap-1.5 font-semibold text-[#0d8258]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span>Ativo</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#f3f7f4]">
              <span className="text-[#64766c]">Plataforma</span>
              <span className="font-medium text-[#18392d]">Evolution API</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#f3f7f4]">
              <span className="text-[#64766c]">Status</span>
              <span className="font-semibold text-[#18392d]">Conectado</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#f3f7f4]">
              <span className="text-[#64766c]">Conectado em</span>
              <span className="text-[#18392d]">{connectedDate}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#f3f7f4]">
              <span className="text-[#64766c]">Sessão</span>
              <span className="text-[#18392d]">{displayName}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[#64766c]">Última sincronização</span>
              <span className="text-[#18392d]">{lastSyncDate}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[#64766c]">Versão</span>
              <span className="text-[#18392d] font-mono">{version}</span>
            </div>
          </div>

          {/* Action Buttons: Reiniciar conexão & Desconectar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <button
              onClick={onRestart}
              disabled={isRestarting}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#d6e0db] rounded-xl text-xs font-bold text-[#142d23] hover:bg-[#f3f7f4] active:scale-[0.99] transition-all cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <HugeIcon
                icon={RefreshIcon}
                size={14}
                className={isRestarting ? 'animate-spin' : ''}
              />
              <span>Reiniciar conexão</span>
            </button>

            <button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#fef2f2] border border-[#fecaca] rounded-xl text-xs font-bold text-[#dc2626] hover:bg-[#fee2e2] active:scale-[0.99] transition-all cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <HugeIcon icon={Delete01Icon} size={14} />
              <span>Desconectar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Bottom Banner */}
      <div className="p-4 rounded-2xl bg-[#eef8f3] border border-[#cfead9] flex items-center gap-3 text-xs text-[#134937]">
        <div className="w-8 h-8 rounded-xl bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <HugeIcon icon={ShieldCheckIcon} size={18} />
        </div>
        <div className="flex flex-col">
          <strong className="font-bold text-[#12382c] text-[13px]">
            Tudo funcionando corretamente!
          </strong>
          <span className="text-[#416254] mt-0.5">
            A instância está conectada, recebendo e enviando mensagens normalmente.
          </span>
        </div>
      </div>
    </div>
  );
};
