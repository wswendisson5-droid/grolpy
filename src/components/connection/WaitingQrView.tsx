import React, { useState, useEffect, useRef } from 'react';
import { HugeIcon, RefreshIcon, WhatsappIcon } from '../icons/HugeIcon';
import { Info } from 'lucide-react';
import { CHALLENGE_REFRESH_MS } from '../../utils/connectionChallenge';
import { QrCodeData } from '../../types/connection';

interface WaitingQrViewProps {
  qrCode?: QrCodeData;
  isLoading: boolean;
  onRefreshQr: () => void;
  onResetInstance?: () => void;
  onPairingCode?: (phone: string) => Promise<string | null>;
  isResetting?: boolean;
}

export const WaitingQrView: React.FC<WaitingQrViewProps> = ({
  qrCode,
  isLoading,
  onRefreshQr,
  onResetInstance,
  onPairingCode,
  isResetting,
}) => {
  const [phone, setPhone] = useState('');
  const [pairingCode, setPairingCode] = useState(qrCode?.pairingCode || '');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState('');
  const [method, setMethod] = useState<'qr' | 'number'>('qr');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const deadlineRef = useRef(Date.now() + 8000);
  const retryAfterRef = useRef(0);
  const busyRef = useRef(false);
  const attemptsRef = useRef(0);
  const identityRef = useRef('');
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    const identity = method === 'number' ? qrCode?.pairingCode : (qrCode?.code || qrCode?.base64);
    if (!identity) return;
    if (identity === identityRef.current && !qrCode?.refreshAt) return;
    identityRef.current = identity;
    deadlineRef.current = qrCode?.refreshAt || ((qrCode?.updatedAt || Date.now()) + CHALLENGE_REFRESH_MS);
    setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    if (method === 'number') setPairingCode(qrCode?.pairingCode || '');
  }, [qrCode, method]);
  const requestPairing = async () => {
    if (!onPairingCode || !phone.trim() || busyRef.current) return;
    busyRef.current = true;
    setMethod('number');
    setPairingCode('');
    setPairingLoading(true);
    setPairingError('');
    try {
      const code = await onPairingCode(phone.trim());
      if (!mountedRef.current) return;
      if (code) {
        setPairingCode(code);
        // Props carry server timestamps. Local fallback covers older servers.
        if (code !== identityRef.current) {
          identityRef.current = code;
          deadlineRef.current = Date.now() + CHALLENGE_REFRESH_MS;
          setSecondsLeft(40);
        }
      } else {
        setPairingError('Não foi possível obter o código. Confira o número ou escolha QR Code.');
        attemptsRef.current = 4;
      }
    } catch (error: any) {
      if (mountedRef.current) setPairingError(error?.message || 'Falha ao gerar código. Tente novamente.');
    } finally { busyRef.current = false; if (mountedRef.current) setPairingLoading(false); }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || isLoading || isResetting || busyRef.current || !deadlineRef.current) return;
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left || Date.now() < deadlineRef.current + 6000 || Date.now() < retryAfterRef.current) return;
      if (attemptsRef.current >= 4) {
        setPairingError('A conexão não foi confirmada. Tente novamente ou troque o método.');
        return;
      }
      attemptsRef.current++;
      // Avoid repeating a renewal on every clock tick if upstream is still pending.
      retryAfterRef.current = Date.now() + 8000;
      if (method === 'number') void requestPairing();
      else onRefreshQr();
    }, 1000);
    return () => clearInterval(timer);
  }, [method, phone, isLoading, isResetting, onRefreshQr, onPairingCode]);

  return (
    <div className="bg-white rounded-3xl border border-[#e2eae5] p-6 sm:p-8 lg:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Clean, Unobstructed QR Code Box & Action Buttons */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-80 p-5 bg-white rounded-2xl border border-[#dce6e0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-center">
            {method === 'qr' && qrCode?.base64 && secondsLeft > 0 ? (
              <div className="relative w-full max-w-72 aspect-square flex items-center justify-center bg-white p-2">
                {/* 100% Clean QR Image without any center badge overlay that corrupts WhatsApp scanning */}
                <img
                  src={qrCode.base64}
                  alt="QR Code de conexão Evolution API"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-full max-w-72 aspect-square bg-[#f4f7f5] rounded-xl flex flex-col items-center justify-center p-6 text-center">
                {method === 'qr' && <div className="w-10 h-10 rounded-full border-2 border-[#12382c] border-t-transparent animate-spin mb-3" />}
                <span className="text-xs font-semibold text-[#142d23]">
                  {method === 'number' ? 'Use o código abaixo no WhatsApp' : 'Aguardando novo QR Code…'}
                </span>
                <span className="text-[11px] text-[#6b7b72] mt-1">
                  A conexão será confirmada automaticamente
                </span>
              </div>
            )}
          </div>

          <p role="status" className="mt-3 text-xs text-[#66786e] text-center">
            {secondsLeft > 0 ? `Renovação automática em ${secondsLeft}s` : 'Aguardando novo código…'}
          </p>
          {/* Action Buttons: Atualizar QR / Reiniciar Sessão */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
            <button
              onClick={() => { setMethod('qr'); attemptsRef.current = 0; setPairingError(''); onRefreshQr(); }}
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

          {onPairingCode && (
            <div className="mt-5 w-full max-w-sm rounded-2xl border border-[#d8e3dd] bg-[#f8faf9] p-4">
              <div className="text-sm font-extrabold text-[#12382c]">Conectar pelo número</div>
              <div className="text-[11px] text-[#66786e] mt-1 mb-3">Use esta opção quando estiver acessando o Groply pelo mesmo celular do WhatsApp.</div>
              <div className="flex gap-2">
                <input value={phone} onChange={(e) => { setPhone(e.target.value); setPairingCode(''); deadlineRef.current = 0; }} placeholder="DDD + número" className="min-w-0 flex-1 rounded-xl border border-[#d6e0db] bg-white px-3 py-2.5 text-sm outline-none" />
                <button onClick={() => { attemptsRef.current = 0; void requestPairing(); }} disabled={pairingLoading || !phone.trim()} className="rounded-xl bg-[#12382c] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{pairingLoading ? 'Gerando...' : 'Gerar código'}</button>
              </div>
              {method === 'number' && pairingCode && secondsLeft > 0 && <div className="mt-3 rounded-xl bg-white border border-[#d6e0db] p-3 text-center"><div className="text-[10px] uppercase font-bold text-[#66786e]">Código para digitar no WhatsApp</div><div className="mt-1 font-mono text-2xl font-black tracking-[0.2em] text-[#12382c]">{pairingCode}</div></div>}
              {pairingError && <div className="mt-3 text-xs font-semibold text-red-600">{pairingError}</div>}
            </div>
          )}
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
