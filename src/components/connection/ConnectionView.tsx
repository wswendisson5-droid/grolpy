import React, { useState, useEffect, useCallback } from 'react';
import { ConnectionInfo, ConnectionStatus, QrCodeData } from '../../types/connection';
import { connectionService } from '../../services/connectionService';
import { ConnectionStepper } from './ConnectionStepper';
import { WaitingQrView } from './WaitingQrView';
import { ConnectingStateView } from './ConnectingStateView';
import { ConnectedStateView } from './ConnectedStateView';
import { ConnectionSidePanel } from './ConnectionSidePanel';
import { ConnectionBottomCards } from './ConnectionBottomCards';
import { ConnectionConfigModal } from './ConnectionConfigModal';
import {
  HugeIcon,
  Notification01Icon,
  Settings01Icon,
} from '../icons/HugeIcon';
import { Menu } from 'lucide-react';

interface ConnectionViewProps {
  onOpenMobileMenu?: () => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  defaultInstanceName?: string;
  isClientView?: boolean;
  clientTitle?: string;
}

export const ConnectionView: React.FC<ConnectionViewProps> = ({
  onOpenMobileMenu,
  onStatusChange,
  defaultInstanceName,
  isClientView = false,
  clientTitle,
}) => {
  const [info, setInfo] = useState<ConnectionInfo>({
    instanceName: defaultInstanceName || '',
    platform: 'Evolution API',
    status: 'loading' as ConnectionStatus,
    webhookStatus: 'waiting',
    messagesToday: isClientView ? 0 : 27,
    lastActivity: 'Há 1 minuto',
    apiStatus: 'online',
  });

  const [availableInstances, setAvailableInstances] = useState<
    Array<{ name: string; connectionStatus: string; profileName?: string; contactCount?: number }>
  >([]);
  const [isInstanceDropdownOpen, setIsInstanceDropdownOpen] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Initialize exactly once. Client mode must never call the ADM instances endpoint.
  // The previous duplicate initialization created races: status/QR requests could
  // overlap and the first QR attempt could be replaced by a second state update.
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!isClientView) {
          const res = await connectionService.getInstances();
          if (!mounted) return;

          const instances = res.instances || [];
          setAvailableInstances(instances);

          const preferred =
            instances.find((i: any) => i.connectionStatus === 'open') ||
            instances.find((i: any) => i.name === res.currentInstance) ||
            instances[0];

          if (preferred) {
            setInfo(prev => ({
              ...prev,
              instanceName: preferred.name,
              status: preferred.connectionStatus === 'open' ? 'connected' : 'loading',
              qrCode: undefined,
            }));

            if (preferred.connectionStatus === 'open') {
              onStatusChange?.('connected');
              return;
            }

            await connectionService.selectInstance(preferred.name);
            if (!mounted) return;
            const data = await connectionService.getStatus(preferred.name);

            if (!mounted) return;
            setInfo(prev => ({
              ...prev,
              ...data,
              instanceName: data.instanceName || preferred.name,
              qrCode: data.qrCode || prev.qrCode,
            }));

            if (data.status !== 'connected' && !data.qrCode) {
              await handleRefreshQr(preferred.name);
            }
            return;
          }
        }

        const data = await connectionService.getStatus();
        if (!mounted) return;

        setInfo(prev => ({
          ...prev,
          ...data,
          instanceName: data.instanceName || prev.instanceName,
          qrCode: data.qrCode || prev.qrCode,
        }));

        if (data.status !== 'connected' && !data.qrCode) {
          await handleRefreshQr(data.instanceName);
        }
      } catch (e) {
        console.error('Error initializing WhatsApp connection:', e);
        if (mounted) {
          setInfo(prev => ({ ...prev, status: 'disconnected' }));
        }
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // Polling when waiting for QR scan
  useEffect(() => {
    if (info.status === 'waiting_qr' || info.status === 'connecting') {
      const interval = setInterval(() => {
        fetchStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [info.status, fetchStatus]);

  return (
    <div className={`flex-1 flex flex-col min-w-0 ${isClientView ? 'bg-transparent' : 'bg-[#f8faf9] min-h-screen overflow-y-auto'}`}>
      {/* Top Header Bar - NEVER rendered in client panel to avoid duplicate navbar */}
      {!isClientView && (
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-[#e5ebe7] bg-white flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
          {/* Left: Mobile Menu & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 -ml-1 text-[#66786e] hover:text-[#12382c] hover:bg-[#f1f5f3] rounded-xl cursor-pointer"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="relative flex items-center gap-2">
              <span className="text-xs font-semibold text-[#66786e]">WhatsApp ADM</span>
              <span className="text-xs text-[#a0b0a6]">/</span>
              <button
                onClick={() => setIsInstanceDropdownOpen((p) => !p)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0f4f1] hover:bg-[#e4ede8] border border-[#d8e3dd] text-xs font-bold text-[#142d23] font-mono transition-colors cursor-pointer"
              >
                <span>{info.instanceName}</span>
                <span className="text-[10px] text-[#5b6e63]">▼</span>
              </button>

              {isInstanceDropdownOpen && availableInstances.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsInstanceDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-[#e0e8e3] rounded-2xl shadow-xl z-50 p-2 text-xs">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#63766c] border-b border-[#f0f4f1] mb-1">
                      Instâncias Evolution API
                    </div>
                    <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                      {availableInstances.map((inst) => {
                        const isSel = inst.name === info.instanceName;
                        const isOpen = inst.connectionStatus === 'open';
                        return (
                          <button
                            key={inst.name}
                            onClick={() => {
                              setInfo((prev) => ({
                                ...prev,
                                instanceName: inst.name,
                                status: isOpen ? 'connected' : 'waiting_qr',
                                qrCode: undefined,
                              }));
                              connectionService.selectInstance(inst.name);
                              setIsInstanceDropdownOpen(false);
                              setTimeout(() => {
                                fetchStatus();
                                if (!isOpen) handleRefreshQr();
                              }, 100);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                              isSel
                                ? 'bg-[#12382c] text-white font-semibold'
                                : 'hover:bg-[#f2f7f4] text-[#142d23]'
                            }`}
                          >
                            <span className="font-mono text-xs truncate mr-2">
                              {inst.name}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                isOpen
                                    ? isSel
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#eaf5ef] text-[#108e66]'
                                  : isSel
                                  ? 'bg-amber-400/30 text-amber-100'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {isOpen ? 'Conectada' : 'Aguardando'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: State toggle pills, Status Pill & Notification Bell */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real Status Pill */}
            <div className="px-3 py-1.5 rounded-full bg-[#eaf4ef] border border-[#d6e8dd] text-xs font-bold text-[#108e66] flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                info.status === 'connected'
                  ? 'bg-[#10b981]'
                  : info.status === 'connecting'
                  ? 'bg-[#10b981] animate-ping'
                  : 'bg-[#10b981]'
              }`} />
              <span>
                {info.status === 'connected'
                  ? 'Instância conectada'
                  : info.status === 'connecting'
                  ? 'Conectando...'
                  : 'Aguardando leitura'}
              </span>
            </div>

            {/* Config Settings Modal Trigger */}
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="p-2 rounded-full text-[#586a60] hover:text-[#142d23] hover:bg-[#f1f5f3] transition-colors cursor-pointer"
              title="Configurações da Evolution API"
            >
              <HugeIcon icon={Settings01Icon} size={18} />
            </button>

            {/* Notification Bell */}
            <button
              className="p-2 rounded-full text-[#586a60] hover:text-[#142d23] hover:bg-[#f1f5f3] transition-colors cursor-pointer relative"
              title="Notificações"
            >
              <HugeIcon icon={Notification01Icon} size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 ${isClientView ? 'p-0 w-full' : 'p-4 sm:p-6 lg:p-8 max-w-7xl'} mx-auto flex flex-col gap-6`}>
        {/* Step Indicator (1 / 2 / 3) */}
        <ConnectionStepper status={info.status} />

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Main Card based on state */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            {info.status === 'connected' ? (
              <ConnectedStateView
                instanceName={info.instanceName}
                profile={info.profile}
                onRestart={handleRestart}
                onDisconnect={handleDisconnect}
                isRestarting={isRestarting}
                isDisconnecting={isDisconnecting}
              />
            ) : info.status === 'connecting' ? (
              <ConnectingStateView instanceName={info.instanceName} />
            ) : (
              <WaitingQrView
                qrCode={info.qrCode}
                isLoading={isLoadingQr}
                onRefreshQr={handleRefreshQr}
                onResetInstance={handleResetInstance}
                isResetting={isResetting}
              />
            )}

            {/* Bottom feature cards & security banner (Images 1 & 3) */}
            <ConnectionBottomCards />
          </div>

          {/* Right Column (4 cols): Side Panel */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            <ConnectionSidePanel
              info={info}
              onRefreshQr={handleRefreshQr}
              onOpenSettings={() => setIsConfigModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Evolution Credentials / Setup Modal */}
      <ConnectionConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentInstanceName={info.instanceName}
        onConfigSaved={() => {
          fetchStatus();
          handleRefreshQr();
        }}
      />
    </div>
  );
};
