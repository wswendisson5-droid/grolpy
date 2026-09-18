import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const ClientConexaoView: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'disconnected' | 'waiting_qr' | 'connected' | 'error'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const handleSetQrCode = async (codeData: any) => {
    if (!codeData) return;
    if (codeData.base64) {
      setQrCode(codeData.base64);
    } else if (codeData.code) {
      try {
        const url = await QRCode.toDataURL(codeData.code, { margin: 2, width: 320, color: { dark: '#12382c', light: '#ffffff' } });
        setQrCode(url);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/evolution/status?instance=minhabagg-leads');
      if (res.ok) {
        const data = await res.json();
        const appState = data.state;
        
        if (appState === 'connected' || appState === 'open') {
          setStatus('connected');
          setProfile(data.connectedProfile);
        } else {
          setStatus('waiting_qr');
          if (data.qrCode) {
             await handleSetQrCode(data.qrCode);
          } else {
             fetchQrCode();
          }
        }
      } else {
         setStatus('disconnected');
         fetchQrCode();
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const fetchQrCode = async () => {
    try {
      const res = await fetch('/api/evolution/qrcode?instance=minhabagg-leads');
      if (res.ok) {
        const data = await res.json();
        if (data.base64 || data.code) {
          await handleSetQrCode(data);
          setStatus('waiting_qr');
        } else if (data.qrcode) {
          await handleSetQrCode(data.qrcode);
          setStatus('waiting_qr');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
       if (status !== 'connected') {
          fetchStatus();
       }
    }, 4000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11241c] tracking-tight">
          WhatsApp Conexão
        </h1>
        <p className="text-[#5b6e63] mt-2">
          Conecte seu número para iniciar os envios de divulgação no sistema.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-[#e5ebe7] p-8 shadow-sm">
        {status === 'loading' && (
           <div className="flex flex-col items-center justify-center py-20">
             <Loader2 className="w-10 h-10 animate-spin text-[#109353] mb-4" />
             <p className="text-[#11241c] font-semibold text-lg">Carregando status...</p>
           </div>
        )}

        {status === 'connected' && profile && (
           <div className="flex flex-col items-center justify-center py-16">
             <div className="w-20 h-20 bg-[#109353]/10 rounded-full flex items-center justify-center mb-6">
               <CheckCircle className="w-10 h-10 text-[#109353]" />
             </div>
             <h2 className="text-2xl font-bold text-[#11241c] mb-2">WhatsApp Conectado!</h2>
             <p className="text-[#5b6e63] text-center max-w-md mb-8">
               Seu número {profile.number} está conectado e pronto para enviar mensagens.
             </p>
             <div className="bg-[#f0f4f1] border border-[#d8e3dd] rounded-xl p-4 flex items-center gap-4 w-full max-w-sm">
                {profile.pictureUrl ? (
                   <img src={profile.pictureUrl} alt="Profile" className="w-12 h-12 rounded-full" />
                ) : (
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-xl text-[#109353]">
                     {profile.name?.charAt(0) || 'W'}
                   </div>
                )}
                <div>
                   <p className="font-bold text-[#11241c]">{profile.name}</p>
                   <p className="text-sm text-[#5b6e63]">{profile.number}</p>
                </div>
             </div>
           </div>
        )}

        {status === 'waiting_qr' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
             <div className="flex flex-col items-center">
                <div className="p-4 bg-white rounded-2xl border-2 border-[#109353]/20 shadow-sm relative w-72 h-72 flex items-center justify-center">
                  {qrCode ? (
                     <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                     <div className="flex flex-col items-center text-[#5b6e63]">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#109353]" />
                        <p>Gerando QR Code...</p>
                     </div>
                  )}
                </div>
                <button 
                  onClick={fetchQrCode}
                  className="mt-6 flex items-center gap-2 px-4 py-2 bg-[#f0f4f1] text-[#11241c] font-semibold rounded-full hover:bg-[#e4ede8] transition-colors"
                >
                  <RefreshCw size={16} /> Atualizar QR Code
                </button>
             </div>
             
             <div>
                <h3 className="text-xl font-bold text-[#11241c] mb-6">Como conectar:</h3>
                <ul className="space-y-6">
                  <li className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold shrink-0">1</div>
                    <div>
                      <p className="font-semibold text-[#11241c]">Abra o WhatsApp</p>
                      <p className="text-[#5b6e63] text-sm mt-1">Abra o WhatsApp no seu celular.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold shrink-0">2</div>
                    <div>
                      <p className="font-semibold text-[#11241c]">Acesse os Dispositivos</p>
                      <p className="text-[#5b6e63] text-sm mt-1">Toque em Mais opções <span className="font-bold">⋮</span> ou Configurações e selecione <span className="font-bold">Aparelhos conectados</span>.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#109353]/10 text-[#109353] flex items-center justify-center font-bold shrink-0">3</div>
                    <div>
                      <p className="font-semibold text-[#11241c]">Conecte um aparelho</p>
                      <p className="text-[#5b6e63] text-sm mt-1">Toque em <span className="font-bold">Conectar um aparelho</span> e aponte a câmera para o QR Code ao lado.</p>
                    </div>
                  </li>
                </ul>
             </div>
           </div>
        )}

        {status === 'error' && (
           <div className="flex flex-col items-center justify-center py-16 text-center">
             <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
             <h2 className="text-xl font-bold text-[#11241c] mb-2">Erro de conexão</h2>
             <p className="text-[#5b6e63] mb-6">Não foi possível carregar o status do WhatsApp. Verifique sua internet ou tente novamente.</p>
             <button 
               onClick={fetchStatus}
               className="px-6 py-2 bg-[#109353] text-white font-bold rounded-full hover:bg-[#0c7a44] transition-colors"
             >
               Tentar novamente
             </button>
           </div>
        )}
      </div>
    </div>
  );
};
