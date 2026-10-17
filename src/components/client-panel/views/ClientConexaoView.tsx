import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { CHALLENGE_REFRESH_MS, connectionFetch, pairingCodeFrom, challengeRequestPending } from '../../../utils/connectionChallenge';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Smartphone,
  ShieldCheck,
  Wifi,
  QrCode as QrCodeIcon,
  Phone,
  Copy,
  Check,
} from 'lucide-react';
import { clientService } from '../../../services/clientService';
import { SafeAvatar } from '../../common/SafeAvatar';

export interface ClientConexaoViewProps {
  isConnected?: boolean;
  initialProfile?: any;
}

export const ClientConexaoView: React.FC<ClientConexaoViewProps> = ({ isConnected: propConnected, initialProfile }) => {
  const cachedConnected = propConnected === true && !initialProfile?.isLoading;
  const cachedProfile = cachedConnected ? initialProfile : null;

  const [status, setStatus] = useState<'loading' | 'disconnected' | 'waiting_qr' | 'connected' | 'error'>(() => {
    if (cachedConnected) return 'connected';
    return 'loading';
  });
  const [activeMethod, setActiveMethod] = useState<'qr' | 'number'>('qr');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [profile, setProfile] = useState<any>(() => cachedProfile);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusCheckFailed, setStatusCheckFailed] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const isWaitingQrRef = useRef(false);
  const generationRef = useRef(false);
  const requestIdRef = useRef(0);
  const methodRef = useRef(activeMethod);
  methodRef.current = activeMethod;
  const challengeRef = useRef<{ identity: string; refreshAt: number } | null>(null);
  const attemptStartedRef = useRef(0);
  const lastRequestAtRef = useRef(0);
  const renewalCountRef = useRef(0);
  const mountedRef = useRef(true);
  const statusRequestInFlightRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; requestIdRef.current++; isWaitingQrRef.current = false; }; }, []);
  const cancelAttempt = () => {
    requestIdRef.current++;
    isWaitingQrRef.current = false;
    challengeRef.current = null;
    renewalCountRef.current = 0;
    setQrCode(null);
    setPairingCode(null);
    setIsGenerating(false);
    setStatus('disconnected');
  };

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${''}`,
    'Content-Type': 'application/json',
  }), []);

  const formatPhoneMask = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneMask(e.target.value);
    setPhoneNumber(formatted);
    if (phoneError) setPhoneError('');
    setPairingCode(null);
    challengeRef.current = null;
  };

  const handleSetQrCode = useCallback(async (codeData: any, method: 'qr' | 'number' = activeMethod) => {
    if (!codeData || !isWaitingQrRef.current || generationRef.current) return;
    const identity = method === 'number' ? pairingCodeFrom(codeData) : (codeData.code || codeData.base64);
    if (!identity) return;
    if (challengeRef.current?.identity !== identity) {
      const refreshAt = codeData.refreshAt || ((codeData.updatedAt || Date.now()) + CHALLENGE_REFRESH_MS);
      challengeRef.current = { identity, refreshAt };
      setSecondsLeft(Math.max(0, Math.ceil((refreshAt - Date.now()) / 1000)));
    }
    if (challengeRef.current.refreshAt <= Date.now()) return;
    if (method === 'number') {
      const code = pairingCodeFrom(codeData);
      if (code) setPairingCode(code);
      setQrCode(null);
      return;
    }
    setPairingCode(null);
    if (codeData.base64 && codeData.base64.startsWith('data:image')) {
      setQrCode(codeData.base64);
    } else if (codeData.base64) {
      setQrCode(`data:image/png;base64,${codeData.base64}`);
    } else if (codeData.code) {
      if (codeData.code.length > 15 || codeData.code.includes('@') || codeData.code.includes(',')) {
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
      } else {
        setPairingCode(codeData.code);
      }
    }
  }, [activeMethod]);

  const fetchStatus = useCallback(async () => {
    if (generationRef.current || statusRequestInFlightRef.current) return;
    statusRequestInFlightRef.current = true;
    const requestId = requestIdRef.current;
    try {
      const res = await connectionFetch('/api/client/whatsapp/status', { headers: authHeaders() });
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      if (!res.ok) {
        const failure = await res.json().catch(() => ({}));
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        if (!isWaitingQrRef.current) {
          setStatusCheckFailed(true);
          setErrorMessage(failure.error || 'Não foi possível verificar a conexão. Isso não confirma uma desconexão do WhatsApp.');
          setStatus('error');
        }
        return;
      }
      const data = await res.json();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      const appState = data.state;
      setStatusCheckFailed(false);

      if (data.isConnected === true && (appState === 'connected' || appState === 'open')) {
        isWaitingQrRef.current = false;
        challengeRef.current = null;
        setStatus('connected');
        const confirmedProfile = data.profile || data.connectedProfile || null;
        setProfile(confirmedProfile);
        setQrCode(null);
        setPairingCode(null);
        setErrorMessage('');
        window.dispatchEvent(new CustomEvent('whatsapp-status-changed', { detail: { isConnected: true, profile: confirmedProfile } }));
      } else if (isWaitingQrRef.current && data.qrCode) {
        setStatus('waiting_qr');
        await handleSetQrCode(data.qrCode, activeMethod);
      } else if (!isWaitingQrRef.current) {
        setStatus('disconnected');
        setProfile(null);
        setQrCode(null);
        setPairingCode(null);
      }
    } catch (e) {
      console.error('[ClientConexao] status fetch:', e);
      if (mountedRef.current && requestId === requestIdRef.current && !isWaitingQrRef.current) {
        setStatusCheckFailed(true);
        setErrorMessage('A consulta da integração falhou. O estado do WhatsApp ainda não foi confirmado.');
        setStatus('error');
      }
    } finally { statusRequestInFlightRef.current = false; }
  }, [authHeaders, handleSetQrCode, status]);

  const generateQrCode = async (forceRefresh = false, automatic = false) => {
    if (generationRef.current) return;
    generationRef.current = true;
    lastRequestAtRef.current = Date.now();
    const requestId = ++requestIdRef.current;
    if (!automatic) { renewalCountRef.current = 0; attemptStartedRef.current = Date.now(); }
    isWaitingQrRef.current = true;
    setQrCode(null);
    setIsGenerating(true);
    setErrorMessage('');
    setStatusCheckFailed(false);
    if (!forceRefresh) {
      setStatus('waiting_qr');
    }

    try {
      const url = forceRefresh ? '/api/evolution/qrcode?force=true' : '/api/evolution/qrcode';
      const res = await connectionFetch(url, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!mountedRef.current || requestId !== requestIdRef.current || methodRef.current !== 'qr') return;
      if (challengeRequestPending(res.status, data)) { lastRequestAtRef.current = Date.now() + 2500; setStatus('waiting_qr'); return; }
      if (data.state === 'unknown') setStatusCheckFailed(true);
      if (!res.ok) throw new Error(data.error || 'Não foi possível gerar o QR Code.');

      if (data.state === 'connected') {
        isWaitingQrRef.current = false;
        setStatus('connected');
        setProfile(data.connectedProfile);
        window.dispatchEvent(new CustomEvent('whatsapp-status-changed', { detail: { isConnected: true, profile: data.connectedProfile } }));
        return;
      }

      setStatus('waiting_qr');

      const qr = data.qrCode || data.qrcode || data;
      generationRef.current = false;
      if (qr?.base64 || qr?.code) await handleSetQrCode(qr, 'qr');
      // Pending challenges are retried by one lifecycle-owned timer below.

    } catch (e: any) {
      console.error('[ClientConexao] QR request:', e);
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      isWaitingQrRef.current = false;
      setErrorMessage(e.message || 'Erro ao solicitar QR Code. Tente novamente.');
      setStatus('error');
    } finally {
      generationRef.current = false;
      if (mountedRef.current && requestId === requestIdRef.current) setIsGenerating(false);
    }
  };

  const generatePairingCode = async (automatic: boolean = false) => {
    if (generationRef.current) return;
    const rawDigits = phoneNumber.replace(/\D/g, '');
    if (!rawDigits || rawDigits.length < 10) {
      setPhoneError('Digite um número de WhatsApp válido com DDD (ex: 11 98888-7777).');
      return;
    }

    generationRef.current = true;
    lastRequestAtRef.current = Date.now();
    const requestId = ++requestIdRef.current;
    if (!automatic) { renewalCountRef.current = 0; attemptStartedRef.current = Date.now(); }
    setPairingCode(null);
    setStatus('waiting_qr');
    setPhoneError('');
    setIsGenerating(true);
    setErrorMessage('');
    setStatusCheckFailed(false);
    isWaitingQrRef.current = true;

    try {
      const res = await connectionFetch('/api/evolution/pairing-code', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phone: rawDigits }),
      });

      const data = await res.json().catch(() => ({}));

      if (!mountedRef.current || requestId !== requestIdRef.current || methodRef.current !== 'number') return;
      if (challengeRequestPending(res.status, data)) { lastRequestAtRef.current = Date.now() + 2500; setStatus('waiting_qr'); return; }
      if (data.state === 'unknown') setStatusCheckFailed(true);
      if (!res.ok) {
        isWaitingQrRef.current = false;
        setErrorMessage(data.error || 'Não foi possível gerar o código. Verifique o número digitado.');
        setStatus('error');
        return;
      }

      if (data.state === 'connected') {
        isWaitingQrRef.current = false;
        setStatus('connected');
        setProfile(data.connectedProfile);
        window.dispatchEvent(new CustomEvent('whatsapp-status-changed', { detail: { isConnected: true, profile: data.connectedProfile } }));
        return;
      }

      setActiveMethod('number');
      setQrCode(null);
      if (pairingCodeFrom(data)) {
        generationRef.current = false;
        await handleSetQrCode(data.qrCode || data, 'number');
        setStatus('waiting_qr');
      } else {
        isWaitingQrRef.current = false;
        setPairingCode(null);
        setErrorMessage(data.error || 'O WhatsApp não retornou o código de 8 dígitos. Gere um novo código.');
        setStatus('error');
      }
    } catch (e: any) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      isWaitingQrRef.current = false;
      console.error('[ClientConexao] Pairing code request:', e);
      setErrorMessage(e.message || 'Falha de comunicação ao gerar o código.');
      setStatus('error');
    } finally {
      generationRef.current = false;
      if (mountedRef.current && requestId === requestIdRef.current) setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace(/[^A-Za-z0-9]/g, ''));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/evolution/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível desconectar o WhatsApp.');
      isWaitingQrRef.current = false;
      setStatus('disconnected');

      setProfile(null);
      setQrCode(null);
      setPairingCode(null);
      setConfirmDisconnect(false);
      window.dispatchEvent(new CustomEvent('whatsapp-status-changed', { detail: { isConnected: false, profile: null } }));
    } catch (e: any) {
      console.error('[ClientConexao] Logout error:', e);
      setErrorMessage(e.message || 'Não foi possível desconectar o WhatsApp.');
      await fetchStatus();
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Prop / Cache synchronization
  useEffect(() => {
    if (propConnected !== undefined) {
      if (propConnected && !initialProfile?.isLoading) {
        setStatus('connected');
        if (initialProfile) setProfile(initialProfile);
      }
    }
  }, [propConnected, initialProfile]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    const requestId = requestIdRef.current;
    statusRequestInFlightRef.current = true;
    (async () => {
      try {
        const res = await connectionFetch('/api/evolution/status', { headers: authHeaders() });
        if (!mounted || requestId !== requestIdRef.current) return;
        if (res.ok) {
          const data = await res.json();
          if (!mounted || requestId !== requestIdRef.current) return;
          if (data.state === 'connected' || data.state === 'open') {
            isWaitingQrRef.current = false;
            setStatus('connected');
            if (data.connectedProfile) {
              setProfile(data.connectedProfile);
            }
            window.dispatchEvent(new CustomEvent('whatsapp-status-changed', { detail: { isConnected: true, profile: data.connectedProfile } }));
            return;
          }
          if (isWaitingQrRef.current && data.qrCode) {
            await handleSetQrCode(data.qrCode, activeMethod);
            setStatus('waiting_qr');
            if (data.qrCode.pairingCode && !data.qrCode.base64) {
              setActiveMethod('number');
            }
            return;
          }
        }
        if (mounted && requestId === requestIdRef.current && !isWaitingQrRef.current) {
          if (res.ok) setStatus('disconnected');
          else {
            setStatusCheckFailed(true);
            setErrorMessage('Não foi possível verificar a conexão na integração. A sessão não foi confirmada como desconectada.');
            setStatus('error');
          }
        }
      } catch {
        if (mounted && requestId === requestIdRef.current && !isWaitingQrRef.current) {
          setStatusCheckFailed(true);
          setErrorMessage('A consulta da integração falhou. O estado do WhatsApp ainda não foi confirmado.');
          setStatus('error');
        }
      } finally { statusRequestInFlightRef.current = false; }
    })();
    return () => { mounted = false; };
  }, []);

  // Polling loop
  useEffect(() => {
    const intervalTime = status === 'waiting_qr' ? 2500 : status === 'connected' ? 8000 : 10000;
    const interval = setInterval(fetchStatus, intervalTime);
    return () => clearInterval(interval);
  }, [fetchStatus, status]);

  useEffect(() => {
    if (status !== 'waiting_qr') return;
    const timer = setInterval(() => {
      if (!isWaitingQrRef.current || generationRef.current || document.hidden) return;
      const challenge = challengeRef.current;
      const remaining = challenge ? Math.max(0, Math.ceil((challenge.refreshAt - Date.now()) / 1000)) : 0;
      setSecondsLeft(remaining);
      if (remaining > 0) return;
      if (Date.now() - attemptStartedRef.current > (challenge ? 180_000 : 90000) || renewalCountRef.current >= 4) {
        isWaitingQrRef.current = false;
        challengeRef.current = null;
        setQrCode(null); setPairingCode(null);
        setErrorMessage('Não foi possível confirmar a conexão. Confira o número e tente novamente ou escolha QR Code.');
        setStatus('error');
        return;
      }
      // Give webhooks a short grace period to publish the next 45s QR event.
      if (challenge && Date.now() < challenge.refreshAt + 6000) return;
      if (Date.now() - lastRequestAtRef.current < 2500) return;
      if (challenge) renewalCountRef.current++;
      if (activeMethod === 'number') void generatePairingCode(true);
      else void generateQrCode(true, true);
    }, 1000);
    return () => clearInterval(timer);
  }, [status, activeMethod, phoneNumber, isGenerating, handleSetQrCode]);

  const renderPairingCodeDisplay = (code: string) => {
    const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const part1 = clean.slice(0, 4);
    const part2 = clean.slice(4, 8);

    return (
      <div className="flex items-center justify-center gap-1 sm:gap-2 select-all w-full max-w-full min-w-0">
        <div className="flex items-center gap-0.5 min-[380px]:gap-1 sm:gap-1.5 min-w-0">
          {part1.split('').map((char, i) => (
            <span
              key={`p1-${i}`}
              className="w-5.5 h-8 min-[360px]:w-6 min-[380px]:w-7 sm:w-9 sm:h-11 flex-none flex items-center justify-center bg-[#f2f8f4] border border-[#109353]/30 rounded-md sm:rounded-lg font-mono text-sm min-[380px]:text-base sm:text-lg font-extrabold text-[#11241c] shadow-xs"
            >
              {char}
            </span>
          ))}
        </div>
        <span className="text-base sm:text-xl font-bold text-[#8c9e94]">-</span>
        <div className="flex items-center gap-0.5 min-[380px]:gap-1 sm:gap-1.5 min-w-0">
          {part2.split('').map((char, i) => (
            <span
              key={`p2-${i}`}
              className="w-5.5 h-8 min-[360px]:w-6 min-[380px]:w-7 sm:w-9 sm:h-11 flex-none flex items-center justify-center bg-[#f2f8f4] border border-[#109353]/30 rounded-md sm:rounded-lg font-mono text-sm min-[380px]:text-base sm:text-lg font-extrabold text-[#11241c] shadow-xs"
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11241c] tracking-tight">
            WhatsApp Conexão
          </h1>
          <p className="text-[#5b6e63] mt-1 text-sm sm:text-base">
            Conecte seu WhatsApp por QR Code ou com seu número de telefone (Código de Pareamento).
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
              Aguardando Conexão
            </span>
          )}
          {(status === 'disconnected' || status === 'loading') && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f1f5f3] text-[#5b6e63] border border-[#dde5e1]">
              <span className="w-2 h-2 rounded-full bg-[#8c9e94]" />
              {status === 'loading' ? 'Verificando conexão' : 'Desconectado'}
            </span>
          )}
        </div>
      </div>

      {/* Method Switcher Tabs (Only visible when not connected) */}
      {status !== 'connected' && status !== 'loading' && (
        <div className="flex items-center bg-[#edf3f0] p-1.5 rounded-2xl w-full max-w-md mx-auto mb-6">
          <button
            type="button"
            onClick={() => { cancelAttempt(); methodRef.current = 'qr'; setActiveMethod('qr'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMethod === 'qr'
                ? 'bg-white text-[#11241c] shadow-xs'
                : 'text-[#617469] hover:text-[#11241c]'
            }`}
          >
            <QrCodeIcon size={16} className={activeMethod === 'qr' ? 'text-[#109353]' : ''} />
            <span>QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => { cancelAttempt(); methodRef.current = 'number'; setActiveMethod('number'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMethod === 'number'
                ? 'bg-white text-[#11241c] shadow-xs'
                : 'text-[#617469] hover:text-[#11241c]'
            }`}
          >
            <Phone size={16} className={activeMethod === 'number' ? 'text-[#109353]' : ''} />
            <span>Conectar com Número</span>
          </button>
        </div>
      )}

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
          <>
            {activeMethod === 'qr' ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#eef6f1] border border-[#dbe9e1] flex items-center justify-center mb-5 shadow-xs">
                  <Smartphone className="w-8 h-8 text-[#109353]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#11241c] mb-2">Conectar por QR Code</h2>
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
            ) : (
              <div className="flex flex-col items-center justify-center py-10 sm:py-12 max-w-md mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#eef6f1] border border-[#dbe9e1] flex items-center justify-center mb-5 shadow-xs">
                  <Phone className="w-8 h-8 text-[#109353]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#11241c] mb-2">Conectar com Número de Telefone</h2>
                <p className="text-[#5b6e63] text-sm sm:text-base mb-6 leading-relaxed">
                  Se não puder usar a câmera, gere um código de 8 dígitos para inserir diretamente no seu WhatsApp.
                </p>

                <div className="w-full text-left mb-6">
                  <label className="block text-xs font-bold text-[#11241c] mb-1.5">
                    Número do WhatsApp (com DDD)
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1 text-xs font-bold text-[#109353] bg-[#e8f6ee] px-2 py-1 rounded-md border border-[#c4e8d3]">
                      BR +55
                    </div>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="(11) 98765-4321"
                      className={`w-full pl-24 pr-4 py-3 bg-[#fbfdfc] border rounded-xl text-sm font-medium text-[#11241c] outline-none transition-all ${
                        phoneError
                          ? 'border-red-400 focus:border-red-500 ring-2 ring-red-100'
                          : 'border-[#d3ded8] focus:border-[#109353] ring-2 ring-transparent focus:ring-[#109353]/10'
                      }`}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs font-medium text-red-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={13} />
                      <span>{phoneError}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={() => generatePairingCode()}
                  disabled={isGenerating || !phoneNumber}
                  className="w-full sm:w-auto sm:min-w-48 sm:self-center inline-flex min-h-11 items-center justify-center px-5 py-2.5 bg-[#109353] hover:bg-[#0c7a44] active:scale-[0.99] text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <span>Gerar Código</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* State: Waiting QR Code or Pairing Code */}
        {status === 'waiting_qr' && (
          <>
            {activeMethod === 'qr' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left: QR Code Box & Refresh Action */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center">
                  <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-[#109353]/25 shadow-[0_4px_20px_rgba(16,147,83,0.06)] relative w-full max-w-80 aspect-square flex items-center justify-center">
                    {qrCode && secondsLeft > 0 ? (
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

                  <p role="status" className="mt-3 text-xs font-semibold text-[#5b6e63] text-center">
                    {secondsLeft > 0 ? `Novo QR em ${secondsLeft}s · atualização automática` : 'Aguardando um novo QR Code…'}
                  </p>
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
                        cancelAttempt();
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
                    Como conectar seu WhatsApp por QR Code:
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
                          Toque no menu <span className="font-bold text-[#11241c]">três pontos (⋮)</span> (Android) ou em <span className="font-bold text-[#11241c]">Configurações</span> (iPhone) e selecione <span className="font-bold text-[#11241c]">Aparelhos conectados</span>.
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
            ) : (
              /* Pairing Code Mode */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left: Pairing Code Display & Copy Action */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center text-center">
                  <div className="w-full max-w-sm px-3 py-5 sm:p-6 bg-[#fbfdfc] rounded-3xl border-2 border-[#109353]/25 shadow-[0_4px_24px_rgba(16,147,83,0.06)] flex flex-col items-center overflow-hidden">
                    <span className="text-xs font-extrabold text-[#109353] uppercase tracking-wider mb-2">
                      Código de Pareamento
                    </span>

                    {pairingCode && secondsLeft > 0 ? (
                      <div className="my-4">
                        {renderPairingCodeDisplay(pairingCode)}
                      </div>
                    ) : (
                      <div className="my-6 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#109353] mb-2" />
                        <p className="text-xs font-semibold text-[#5b6e63]">Gerando código...</p>
                      </div>
                    )}

                    {pairingCode && secondsLeft > 0 && (
                      <button
                        onClick={handleCopyCode}
                        className={`mt-2 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-[#109353] text-white'
                            : 'bg-white hover:bg-[#edf5f0] text-[#11241c] border border-[#d3ded8] shadow-2xs'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={16} />
                            <span>Código Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} className="text-[#109353]" />
                            <span>Copiar Código</span>
                          </>
                        )}
                      </button>
                    )}

                    <p className="text-[11px] text-[#708479] mt-3">
                      {secondsLeft > 0 ? `Novo código em ${secondsLeft}s · atualização automática` : 'Aguardando um novo código…'}
                    </p>
                  </div>

                  {/* Action Buttons below Code */}
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-sm">
                    <button
                      onClick={() => generatePairingCode()}
                      disabled={isGenerating}
                      className="inline-flex min-h-11 items-center justify-center px-3 py-2.5 bg-[#f0f4f1] hover:bg-[#e4ede8] active:scale-[0.98] text-[#11241c] text-xs sm:text-sm font-bold rounded-xl border border-[#d8e3dd] transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      <span>{isGenerating ? 'Gerando...' : 'Gerar outro código'}</span>
                    </button>

                    <button
                      onClick={() => {
                        cancelAttempt();
                      }}
                      className="px-4 py-2.5 bg-white hover:bg-[#f9faf9] text-[#5b6e63] hover:text-[#11241c] text-xs font-semibold rounded-xl border border-[#e5ebe7] transition-all cursor-pointer"
                    >
                      Trocar Número
                    </button>
                  </div>
                </div>

                {/* Right: Step-by-Step Instructions */}
                <div className="lg:col-span-6 flex flex-col">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#11241c] mb-2">
                    Como inserir o código no WhatsApp:
                  </h2>
                  <p className="text-sm text-[#5b6e63] mb-6">
                    Siga o passo a passo abaixo no celular com o número <span className="font-bold text-[#11241c]">{phoneNumber || 'cadastrado'}</span>.
                  </p>

                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#fbfdfc] border border-[#edf3f0]">
                      <div className="w-7 h-7 rounded-xl bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#11241c]">Abra o WhatsApp</p>
                        <p className="text-xs text-[#5b6e63] mt-0.5">Abra o aplicativo no seu smartphone.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#fbfdfc] border border-[#edf3f0]">
                      <div className="w-7 h-7 rounded-xl bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#11241c]">Acesse Aparelhos Conectados</p>
                        <p className="text-xs text-[#5b6e63] mt-0.5">
                          Toque no menu <span className="font-bold text-[#11241c]">três pontos (⋮)</span> (Android) ou <span className="font-bold text-[#11241c]">Configurações</span> (iPhone) &gt; <span className="font-bold text-[#11241c]">Aparelhos conectados</span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#fbfdfc] border border-[#edf3f0]">
                      <div className="w-7 h-7 rounded-xl bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#11241c]">Toque em "Conectar com número"</p>
                        <p className="text-xs text-[#5b6e63] mt-0.5">
                          Toque em <span className="font-bold text-[#11241c]">Conectar um aparelho</span> e selecione a opção <span className="font-bold text-[#109353]">"Conectar com número de telefone"</span> na parte inferior.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#fbfdfc] border border-[#edf3f0]">
                      <div className="w-7 h-7 rounded-xl bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        4
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#11241c]">Digite o Código de 8 Dígitos</p>
                        <p className="text-xs text-[#5b6e63] mt-0.5">
                          Insira o código exibido ao lado no seu celular para autorizar a conexão.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Informational Callout */}
                  <div className="mt-5 p-3.5 rounded-2xl bg-[#eef7f2] border border-[#d6ecdf] flex items-start gap-3 text-xs text-[#134e32]">
                    <ShieldCheck className="w-4 h-4 text-[#109353] shrink-0 mt-0.5" />
                    <span>
                      Após digitar o código no seu celular, a tela será atualizada para Conectado automaticamente.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
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
              <SafeAvatar
                src={profile?.pictureUrl || '/api/whatsapp/avatar'}
                alt={profile?.name || 'WhatsApp'}
                fallbackText={profile?.name || 'WA'}
                shape="rounded-2xl"
                sizeClassName="w-14 h-14"
                className="border-2 border-[#109353]/30 shadow-xs shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#11241c] text-base truncate">
                    {profile?.name || 'WhatsApp Conectado'}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f6ee] text-[#109353]">
                    Online
                  </span>
                </div>
                {profile?.number && (
                  <p className="text-sm font-semibold text-[#109353] mt-0.5">
                    {profile.number}
                  </p>
                )}
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
              {errorMessage || 'Não foi possível estabelecer a conexão. Verifique os dados e tente novamente.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (statusCheckFailed) { setStatus('loading'); void fetchStatus(); return; }
                  setStatus('disconnected');
                  setErrorMessage('');
                  if (activeMethod === 'qr') {
                    generateQrCode(false);
                  } else {
                    generatePairingCode();
                  }
                }}
                className="px-6 py-3 bg-[#109353] hover:bg-[#0c7a44] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {statusCheckFailed ? 'Verificar conexão' : 'Tentar Novamente'}
              </button>
              <button
                onClick={() => {
                  setStatus('disconnected');
                  setErrorMessage('');
                }}
                className="px-5 py-3 bg-[#f0f4f1] hover:bg-[#e4ede8] text-[#11241c] font-bold rounded-xl transition-all cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
