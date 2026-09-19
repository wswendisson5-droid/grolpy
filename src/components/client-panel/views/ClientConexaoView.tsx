import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, LogOut, Smartphone, ShieldCheck, Wifi } from 'lucide-react';

export const ClientConexaoView: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'disconnected' | 'waiting_qr' | 'connected' | 'error'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const isWaitingQrRef = useRef(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('groply_token') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  const handleSetQrCode = useCallback(async (codeData: any) => {
    if (!codeData) return;
    if (codeData.base64 && codeData.base64.startsWith('data:image')) {
      setQrCode(codeData.base64);
    } else if (codeData.base64) {
      setQrCode(`data:image/png;base64,${codeData.base64}`);
    } else if (codeData.code) {
      try {
        const url = await QRCode.toDataURL(codeData.code, {
          margin: 2,
          width: 320,
          color: { dark: '#12382c', light: '#ffffff' },
        });
        setQrCode(url);
      } catch (err) {
        console.error('[ClientConexao] QR generation error:', err);
      }
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/evolution/status', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const appState = data.state;

      if (appState === 'connected' || appState === 'open') {
        isWaitingQrRef.current = false;
        setStatus('connected');
        setProfile(data.connectedProfile);
        setQrCode(null);
        setErrorMessage('');
      } else if (isWaitingQrRef.current || appState === 'waiting_qr') {
        setStatus('waiting_qr');
        if (data.qrCode) {
          await handleSetQrCode(data.qrCode);
        }
      } else if (status !== 'loading') {
        setStatus('disconnected');
        setProfile(null);
        setQrCode(null);
      }
    } catch (e) {
      console.error('[ClientConexao] status fetch:', e);
    }
  }, [authHeaders, handleSetQrCode, status]);

  const generateQrCode = async (forceRefresh = false) => {
    isWaitingQrRef.current = true;
    setIsGenerating(true);
    setErrorMessage('');
    if (!forceRefresh) {
      setStatus('waiting_qr');
    }

    try {
      const url = forceRefresh ? '/api/evolution/qrcode?force=true' : '/api/evolution/qrcode';
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));

      if (data.state === 'connected') {
        isWaitingQrRef.current = false;
        setStatus('connected');
        setProfile(data.connectedProfile);
        return;
      }

      setStatus('waiting_qr');

      const qr = data.qrCode || data.qrcode || data;
      if (qr?.base64 || qr?.code) {
        await handleSetQrCode(qr);
      }
    } catch (e: any) {
      console.error('[ClientConexao] QR request:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch('/api/evolution/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
      isWaitingQrRef.current = false;
      setStatus('disconnected');
      setProfile(null);
      setQrCode(null);
      setConfirmDisconnect(false);
    } catch (e: any) {
      console.error('[ClientConexao] Logout error:', e);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/evolution/status', { headers: authHeaders() });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.state === 'connected' || data.state === 'open') {
            setStatus('connected');
            setProfile(data.connectedProfile);
            return;
          }
          if (data.qrCode) {
            await handleSetQrCode(data.qrCode);
            setStatus('waiting_qr');
            isWaitingQrRef.current = true;
            return;
          }
        }
        setStatus('disconnected');
      } catch {
        if (mounted) setStatus('disconnected');
      }
    })();
    return () => { mounted = false; };
  }, [authHeaders, handleSetQrCode]);

  // Polling loop
  useEffect(() => {
    const intervalTime = status === 'waiting_qr' ? 2500 : status === 'connected' ? 8000 : 10000;
    const interval = setInterval(fetchStatus, intervalTime);
    return () => clearInterval(interval);
  }, [fetchStatus, status]);

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11241c] tracking-tight">
            WhatsApp Conexão
          </h1>
          <p className="text-[#5b6e63] mt-1 text-sm sm:text-base">
            Conecte seu número para iniciar os envios de divulgação no sistema.
          </p>
        </div>

        {/* Status Pill Badge */}
        <div className="self-start sm:self-auto">
          {status === 'connected' && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#e8f6ee] text-[#109353] border border-[#c4e8d3]">
              <span className="w-2 h-2 rounded-full bg-[#109353] animate-pulse" />
              Conectado
            </span>
          )}
          {status === 'waiting_qr' && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#fff8e6] text-[#b47d00] border border-[#fbe4a8]">
              <span className="w-2 h-2 rounded-full bg-[#e5a000] animate-ping" />
              Aguardando Leitura
            </span>
          )}
          {(status === 'disconnected' || status === 'loading') && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f1f5f3] text-[#5b6e63] border border-[#dde5e1]">
              <span className="w-2 h-2 rounded-full bg-[#8c9e94]" />
              Desconectado
            </span>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-[#e5ebe7] p-6 sm:p-10 shadow-sm transition-all">
        {/* State: Initial Loading */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#109353] mb-4" />
            <p className="text-[#11241c] font-bold text-lg">Verificando status do WhatsApp...</p>
            <p className="text-[#5b6e63] text-sm mt-1">Conectando à API em tempo real</p>
          </div>
        )}

        {/* State: Disconnected */}
        {status === 'disconnected' && (
          <div className="flex flex-col items-center justify-center py-14 sm:py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#eef6f1] border border-[#dbe9e1] flex items-center justify-center mb-5 shadow-xs">
              <Smartphone className="w-8 h-8 text-[#109353]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#11241c] mb-2">Conecte seu WhatsApp</h2>
            <p className="text-[#5b6e63] max-w-md mb-8 text-sm sm:text-base leading-relaxed">
              Gere o QR Code em tempo real e aponte a câmera do seu celular para vincular o WhatsApp ao seu painel.
            </p>
            <button
              onClick={() => generateQrCode(false)}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#109353] hover:bg-[#0c7a44] active:scale-[0.99] text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-75"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Preparando Conexão...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-5 h-5" />
                  <span>Gerar QR Code</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State: Waiting QR Code */}
        {status === 'waiting_qr' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: QR Code Box & Refresh Action */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-[#109353]/25 shadow-[0_4px_20px_rgba(16,147,83,0.06)] relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="w-full h-full object-contain rounded-xl select-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#109353] mb-3" />
                    <p className="font-bold text-sm text-[#11241c]">Gerando QR Code real...</p>
                    <p className="text-xs text-[#5b6e63] mt-1">Comunicando com o WhatsApp</p>
                  </div>
                )}
              </div>

              {/* Action Buttons below QR */}
              <div className="mt-5 flex items-center gap-3 w-full max-w-xs">
                <button
                  onClick={() => generateQrCode(true)}
                  disabled={isGenerating}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f0f4f1] hover:bg-[#e4ede8] active:scale-[0.98] text-[#11241c] text-xs font-bold rounded-xl border border-[#d8e3dd] transition-all cursor-pointer disabled:opacity-60"
                  title="Atualizar QR Code"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#109353] ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Atualizar QR Code</span>
                </button>

                <button
                  onClick={() => {
                    isWaitingQrRef.current = false;
                    setStatus('disconnected');
                    setQrCode(null);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-[#f9faf9] text-[#5b6e63] hover:text-[#11241c] text-xs font-semibold rounded-xl border border-[#e5ebe7] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Right: Step-by-Step Instructions */}
            <div className="lg:col-span-7 flex flex-col">
              <h2 className="text-xl sm:text-2xl font-bold text-[#11241c] mb-2">
                Como conectar seu WhatsApp:
              </h2>
              <p className="text-sm text-[#5b6e63] mb-6">
                Siga os 3 passos abaixo no seu smartphone para autenticar a conexão.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#fbfdfc] border border-[#edf3f0]">
                  <div className="w-7 h-7 rounded-xl bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#11241c]">Abra o WhatsApp</p>
                    <p className="text-xs text-[#5b6e63] mt-0.5">No seu celular, abra o aplicativo do WhatsApp.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#fbfdfc] border border-[#edf3f0]">
                  <div className="w-7 h-7 rounded-xl bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#11241c]">Acesse os Aparelhos Conectados</p>
                    <p className="text-xs text-[#5b6e63] mt-0.5">
                      Toque no menu <span className="font-bold text-[#11241c]">⋮</span> (Android) ou em <span className="font-bold text-[#11241c]">Configurações</span> (iPhone) e selecione <span className="font-bold text-[#11241c]">Aparelhos conectados</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#fbfdfc] border border-[#edf3f0]">
                  <div className="w-7 h-7 rounded-xl bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#11241c]">Conecte o Aparelho</p>
                    <p className="text-xs text-[#5b6e63] mt-0.5">
                      Toque em <span className="font-bold text-[#11241c]">Conectar um aparelho</span> e aponte a câmera para o QR Code ao lado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informational Callout */}
              <div className="mt-6 p-3.5 rounded-2xl bg-[#eef7f2] border border-[#d6ecdf] flex items-start gap-3 text-xs text-[#134e32]">
                <ShieldCheck className="w-4 h-4 text-[#109353] shrink-0 mt-0.5" />
                <span>
                  Mantenha esta página aberta enquanto conecta seu WhatsApp. A sincronização ocorrerá automaticamente após a leitura.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* State: Connected */}
        {status === 'connected' && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
            <div className="w-20 h-20 bg-[#109353]/10 border border-[#109353]/20 rounded-3xl flex items-center justify-center mb-5 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-[#109353]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#11241c] mb-2 tracking-tight">
              WhatsApp Conectado!
            </h2>
            <p className="text-[#5b6e63] max-w-md mb-8 text-sm sm:text-base">
              Seu WhatsApp está autenticado e pronto para realizar envios e divulgações automáticas.
            </p>

            {/* Profile Info Card */}
            <div className="bg-[#f8faf9] border border-[#e2eae6] rounded-2xl p-4 sm:p-5 flex items-center gap-4 w-full max-w-md mb-8 text-left shadow-2xs">
              {profile?.pictureUrl ? (
                <img
                  src={profile.pictureUrl}
                  alt={profile.name || 'WhatsApp'}
                  className="w-14 h-14 rounded-2xl object-cover border border-[#dbe6df]"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#109353] text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
                  {profile?.name?.charAt(0) || 'W'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#11241c] text-base truncate">{profile?.name || 'WhatsApp Conectado'}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f6ee] text-[#109353]">
                    Online
                  </span>
                </div>
                <p className="text-sm font-medium text-[#5b6e63] mt-0.5">{profile?.number || 'Número ativo'}</p>
                {profile?.connectedAt && (
                  <p className="text-[11px] text-[#8c9e94] mt-1">Conectado em: {profile.connectedAt}</p>
                )}
              </div>
            </div>

            {/* Disconnect Action */}
            {!confirmDisconnect ? (
              <button
                onClick={() => setConfirmDisconnect(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Desconectar WhatsApp</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-red-50/70 border border-red-200/80 rounded-2xl">
                <p className="text-xs font-semibold text-red-800">Deseja realmente desconectar?</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isDisconnecting ? 'Desconectando...' : 'Sim, desconectar'}
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    className="px-3 py-1.5 bg-white text-[#5b6e63] text-xs font-semibold rounded-lg border border-[#dde5e1] hover:bg-[#f8faf9] transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State: Error Fallback */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[#11241c] mb-2">Erro de Conexão</h2>
            <p className="text-[#5b6e63] text-sm max-w-md mb-6">
              {errorMessage || 'Não foi possível gerar o QR Code no momento. Verifique sua conexão e tente novamente.'}
            </p>
            <button
              onClick={() => generateQrCode(false)}
              className="px-6 py-3 bg-[#109353] hover:bg-[#0c7a44] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
