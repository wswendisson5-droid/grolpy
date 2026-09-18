import React, { useState } from 'react';
import {
  HugeIcon,
  Cancel01Icon,
  Settings01Icon,
  CheckIcon,
  LightningIcon,
} from '../icons/HugeIcon';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { connectionService } from '../../services/connectionService';

interface ConnectionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInstanceName: string;
  onConfigSaved: () => void;
}

export const ConnectionConfigModal: React.FC<ConnectionConfigModalProps> = ({
  isOpen,
  onClose,
  currentInstanceName,
  onConfigSaved,
}) => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instanceName, setInstanceName] = useState(currentInstanceName || 'nexus-crm-01');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const ok = await connectionService.saveCredentials({
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
        instanceName: instanceName.trim(),
      });

      if (ok) {
        setMessage({
          type: 'success',
          text: 'Credenciais da Evolution API salvas no servidor com sucesso!',
        });
        setTimeout(() => {
          onConfigSaved();
          onClose();
        }, 1200);
      } else {
        setMessage({
          type: 'error',
          text: 'Falha ao salvar as configurações no servidor.',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigureWebhook = async () => {
    setIsSettingWebhook(true);
    setMessage(null);
    try {
      const res = await connectionService.setupWebhook(instanceName);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Webhook configurado na Evolution API para ${res.webhookUrl || 'o CRM'}!`,
        });
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Erro ao registrar webhook na Evolution API.',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white rounded-3xl border border-[#e2eae5] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#edf2ef]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf4ef] text-[#12382c] flex items-center justify-center">
              <HugeIcon icon={Settings01Icon} size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-[#142d23]">
                Configurações da Evolution API
              </h3>
              <span className="text-xs text-[#63756b]">
                Comunicação autenticada de servidor para servidor
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7a8a81] hover:text-[#142d23] hover:bg-[#f1f5f3] transition-colors cursor-pointer"
          >
            <HugeIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.type === 'success' && <HugeIcon icon={CheckIcon} size={14} />}
              <span>{message.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1a382d] mb-1.5">
              URL da Evolution API
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://evolution.seuservidor.com"
              className="w-full px-3.5 py-2.5 bg-[#f9faf9] border border-[#d8e2dc] rounded-xl text-xs text-[#142d23] focus:outline-none focus:border-[#12382c] focus:bg-white transition-all font-mono"
            />
            <span className="text-[11px] text-[#6d7f75] mt-1 block">
              URL base onde a sua Evolution API v2 está hospedada.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1a382d] mb-1.5">
              Chave de API (EVOLUTION_API_KEY)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira a chave secreta da Evolution"
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#f9faf9] border border-[#d8e2dc] rounded-xl text-xs text-[#142d23] focus:outline-none focus:border-[#12382c] focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8a81] hover:text-[#142d23]"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span className="text-[11px] text-[#6d7f75] mt-1 block">
              A chave é mantida apenas no backend (nunca exposta no navegador).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1a382d] mb-1.5">
              Nome da Instância
            </label>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="nexus-crm-01"
              className="w-full px-3.5 py-2.5 bg-[#f9faf9] border border-[#d8e2dc] rounded-xl text-xs text-[#142d23] focus:outline-none focus:border-[#12382c] focus:bg-white transition-all font-mono"
            />
            <span className="text-[11px] text-[#6d7f75] mt-1 block">
              Identificador único da instância para conexão do WhatsApp.
            </span>
          </div>

          {/* Webhook Quick Action */}
          <div className="p-3.5 rounded-xl bg-[#f0f7f3] border border-[#d6e8dc] flex items-center justify-between mt-1">
            <div className="flex items-center gap-2.5">
              <HugeIcon icon={LightningIcon} size={16} className="text-[#10b981]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#142d23]">Configurar Webhook</span>
                <span className="text-[10px] text-[#55695e]">Registrar rota /api/evolution/webhook na Evolution</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfigureWebhook}
              disabled={isSettingWebhook}
              className="px-3 py-1.5 bg-white border border-[#cbe0d3] rounded-lg text-xs font-bold text-[#12382c] hover:bg-[#e4efe8] cursor-pointer disabled:opacity-50"
            >
              {isSettingWebhook ? 'Registrando...' : 'Registrar agora'}
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#edf2ef] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5a6c62] hover:bg-[#f1f5f3] rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#12382c] text-white rounded-xl text-xs font-bold hover:bg-[#1a4b3b] cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              <span>Salvar e Aplicar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
