import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Users, Check, Sparkles, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { DivulgacaoCard, ClientGroup } from '../types';
import { clientService } from '../../../services/clientService';

interface NovaDivulgacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaign: DivulgacaoCard) => void;
}

export const NovaDivulgacaoModal: React.FC<NovaDivulgacaoModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Moda & Acessórios');
  const [scheduleDays, setScheduleDays] = useState('Todos os dias');
  const [scheduleTime, setScheduleTime] = useState('14:00');
  const [previewText, setPreviewText] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80');
  const [availableGroups, setAvailableGroups] = useState<ClientGroup[]>([]);
  const [selectedGroupJids, setSelectedGroupJids] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchImmediately, setDispatchImmediately] = useState(false);

  useEffect(() => {
    if (isOpen) {
      clientService.getImportedGroups().then((imported) => {
        if (imported && imported.length > 0) {
          setAvailableGroups(imported);
          setSelectedGroupJids(imported.map((g) => g.id));
        } else {
          clientService.getRealGroups().then((real) => {
            if (real && real.length > 0) {
              setAvailableGroups(real);
              setSelectedGroupJids(real.map((g) => g.id));
            } else {
              setAvailableGroups([]);
              setSelectedGroupJids([]);
            }
          });
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleGroup = (id: string) => {
    setSelectedGroupJids((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !previewText.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await clientService.createCampaign({
        title,
        category,
        active: true,
        scheduleDays,
        scheduleTime,
        groupsCount: selectedGroupJids.length || 1,
        imageUrl: imageUrl.trim() || undefined,
        previewText,
        tags: [category.split('&')[0].trim()],
      });

      const finalCard: DivulgacaoCard = created || {
        id: `div-${Date.now()}`,
        title,
        category,
        active: true,
        scheduleDays,
        scheduleTime,
        groupsCount: selectedGroupJids.length || 1,
        totalSent: 0,
        imageUrl,
        previewText,
        tags: [category.split('&')[0].trim()],
      };

      if (dispatchImmediately) {
        await clientService.dispatchNow({
          campaignId: finalCard.id,
          customGroupJids: selectedGroupJids,
          customMessage: previewText,
          imageUrl: imageUrl.trim() || undefined,
        });
      }

      onSave(finalCard);
      onClose();
    } catch {
      // safe fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#e5ebe7] shadow-2xl p-6 flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold">
              ⚡
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-[#11241c]">Nova Divulgação WhatsApp</h3>
              <p className="text-xs text-[#63756b]">Configure sua mensagem e grupos para envio automático</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs sm:text-sm">
          {/* Campaign Title */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[#11241c]">Título da Divulgação</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Promoção Especial de Fim de Semana"
              className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-[#dbe4de] rounded-xl focus:bg-white focus:border-[#109353] focus:outline-none"
            />
          </div>

          {/* Category & Groups Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[#11241c]">Segmento / Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-[#dbe4de] rounded-xl focus:bg-white focus:border-[#109353] focus:outline-none"
              >
                <option value="Moda & Acessórios">Moda & Acessórios</option>
                <option value="Serviços & Manutenção">Serviços & Manutenção</option>
                <option value="Alimentação & Gastronomia">Alimentação & Gastronomia</option>
                <option value="Estética & Beleza">Estética & Beleza</option>
                <option value="Geral & Promoções">Geral & Promoções</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[#11241c]">Grupos Selecionados ({selectedGroupJids.length})</label>
              <div className="px-3.5 py-2.5 bg-[#f8faf9] border border-[#dbe4de] rounded-xl flex items-center justify-between text-xs font-bold text-[#11241c]">
                <span>{selectedGroupJids.length} grupos selecionados</span>
                <span className="text-[#109353] font-semibold">
                  {availableGroups.length > 0 ? `${availableGroups.length} no WhatsApp` : 'Ativos'}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[#11241c]">Dias de Envio</label>
              <select
                value={scheduleDays}
                onChange={(e) => setScheduleDays(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-[#dbe4de] rounded-xl focus:bg-white focus:border-[#109353] focus:outline-none"
              >
                <option value="Todos os dias">Todos os dias</option>
                <option value="Seg a Sex">Seg a Sex</option>
                <option value="Seg, Qua, Sex">Seg, Qua, Sex</option>
                <option value="Fins de Semana">Fins de Semana</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[#11241c]">Horário de Disparo</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f8faf9] border border-[#dbe4de] rounded-xl focus:bg-white focus:border-[#109353] focus:outline-none font-bold"
              />
            </div>
          </div>

          {/* Message Text */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[#11241c]">Texto da Mensagem (WhatsApp)</label>
            <textarea
              required
              rows={4}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Digite o texto do anúncio que será enviado nos grupos automaticamente..."
              className="w-full p-3 bg-[#f8faf9] border border-[#dbe4de] rounded-xl focus:bg-white focus:border-[#109353] focus:outline-none leading-relaxed"
            />
          </div>

          {/* Image URL preview */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[#11241c]">Foto / Banner do Anúncio (URL opcional)</label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3.5 py-2.5 bg-[#f8faf9] border border-[#dbe4de] rounded-xl focus:bg-white focus:border-[#109353] focus:outline-none text-xs"
              />
              {imageUrl && (
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#dbe4de] bg-[#f0f4f1] shrink-0">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Immediate Dispatch Toggle */}
          <div className="p-3 bg-[#f0f7f3] border border-[#cde5d7] rounded-2xl flex items-center justify-between cursor-pointer" onClick={() => setDispatchImmediately(!dispatchImmediately)}>
            <div className="flex items-center gap-3">
              <Send size={18} className="text-[#109353]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#11241c]">Disparar mensagem agora no WhatsApp</span>
                <span className="text-[11px] text-[#55695f]">Envia imediatamente para os grupos selecionados via Evolution API</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={dispatchImmediately}
              onChange={(e) => setDispatchImmediately(e.target.checked)}
              className="w-4 h-4 accent-[#109353] cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0f4f1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#d8e2dc] text-[#55675d] hover:bg-[#f2f7f4] font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#109353] hover:bg-[#0e8048] text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>{dispatchImmediately ? 'Criar & Disparar Agora' : 'Criar Divulgação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

