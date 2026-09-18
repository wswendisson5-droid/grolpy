import React from 'react';
import { Opportunity } from '../types/nexus';
import { safeEncodeURIComponent } from '../utils/safeUri';
import {
  X,
  MessageCircle,
  Clock,
  Sparkles,
  Phone,
  User,
  ArrowUpRight,
  Send,
  Archive,
  CheckCircle2,
  Camera,
  ImageOff,
} from 'lucide-react';

interface OpportunityDetailsModalProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: Opportunity['status']) => void;
  onStartContact?: (opp: Opportunity) => void;
}

export const OpportunityDetailsModal: React.FC<OpportunityDetailsModalProps> = ({
  opportunity,
  onClose,
  onStatusChange,
  onStartContact,
}) => {
  if (!opportunity) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#e2ebe6] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe Handle */}
        <div className="sm:hidden w-full flex items-center justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 bg-[#dbe4de] rounded-full" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#edf2ee] bg-[#fafcfb]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-[#e0eae4] border border-[#d3dfd8] shrink-0">
              <img
                src={opportunity.avatar}
                alt={opportunity.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#142d23] truncate">
                  {opportunity.title}
                </h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#ecf7f1] text-[#059669] text-[10px] sm:text-xs font-bold border border-[#d2edd9] shrink-0">
                  Score {opportunity.score}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-[#6e8076] truncate">
                {opportunity.segment} • {opportunity.category}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f5f3] hover:bg-[#e4ece7] text-[#55695e] hover:text-[#18392d] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs">
          {/* Group Origin & Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-3.5 bg-[#f6faf8] rounded-2xl border border-[#e5eee9]">
            <div className="flex items-center gap-2 text-[#244234] font-medium">
              <MessageCircle size={14} className="text-[#059669] shrink-0" />
              <span className="truncate">Capturado no grupo: <strong>{opportunity.groupName}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[#73857d]">
              <Clock size={12} />
              <span>{opportunity.timestamp} ({opportunity.relativeTime})</span>
            </div>
          </div>

          {/* WhatsApp Raw Message */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[#1a382c] uppercase tracking-wider">
              Mensagem Original do WhatsApp
            </span>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#ffffff] border border-[#e2eae5] text-xs text-[#2b3c33] leading-relaxed shadow-xs space-y-3">
              <div>
                <span className="text-emerald-600 font-semibold block mb-1">
                  {opportunity.contactName} ({opportunity.phone}):
                </span>
                "{opportunity.messageOriginal}"
              </div>

              {/* Photo Attachment Section */}
              {opportunity.image &&
              !opportunity.image.includes('unsplash.com') &&
              !opportunity.image.includes('placeholder') &&
              !opportunity.image.startsWith('data:image/svg+xml') ? (
                <div className="pt-2.5 border-t border-[#f0f4f1]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#142d23] mb-2">
                    <Camera size={13} className="text-emerald-600" />
                    <span>Foto anexada pelo contato no WhatsApp:</span>
                  </div>
                  <div className="relative max-w-sm rounded-xl overflow-hidden border border-[#d5ded8] bg-[#f4f7f5]">
                    <img
                      src={opportunity.image}
                      alt="Foto anexada"
                      referrerPolicy="no-referrer"
                      className="w-full max-h-60 object-contain bg-black/5"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#f0f4f1] flex items-center gap-1.5 text-[11px] text-[#71847a]">
                  <ImageOff size={13} className="text-[#95a89e]" />
                  <span>Publicação original enviada apenas em texto (sem foto anexada).</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#eff7f3] border border-[#d7ebe1] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#143e2e]">
              <Sparkles size={14} className="text-[#059669]" />
              <span>Análise Preditiva de IA (Nxs Radar Engine)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="flex flex-col p-2.5 bg-white/80 rounded-xl border border-[#e1ece6]">
                <span className="text-[10.5px] text-[#6a7c73] font-medium">
                  Intenção Comercial
                </span>
                <span className="font-semibold text-[#18392d] mt-0.5">
                  {opportunity.aiAnalysis.intent}
                </span>
              </div>

              <div className="flex flex-col p-2.5 bg-white/80 rounded-xl border border-[#e1ece6]">
                <span className="text-[10.5px] text-[#6a7c73] font-medium">
                  Ticket Estimado
                </span>
                <span className="font-bold text-[#059669] mt-0.5">
                  {opportunity.aiAnalysis.budget}
                </span>
              </div>

              <div className="flex flex-col p-2.5 bg-white/80 rounded-xl border border-[#e1ece6]">
                <span className="text-[10.5px] text-[#6a7c73] font-medium">
                  Urgência de Fechamento
                </span>
                <span className="font-bold text-[#18392d] mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {opportunity.aiAnalysis.urgency}
                </span>
              </div>

              <div className="flex flex-col p-2.5 bg-white/80 rounded-xl border border-[#e1ece6]">
                <span className="text-[10.5px] text-[#6a7c73] font-medium">
                  Sentimento
                </span>
                <span className="font-semibold text-[#18392d] mt-0.5">
                  {opportunity.aiAnalysis.sentiment}
                </span>
              </div>
            </div>

            {/* Keyword tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10.5px] font-medium text-[#657970] mr-1">
                Gatilhos:
              </span>
              {opportunity.aiAnalysis.keyKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-lg bg-white border border-[#d8e6df] text-[10.5px] font-semibold text-[#18392d]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-3.5 bg-white rounded-2xl border border-[#e4ebe6]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f1f5f3] flex items-center justify-center text-[#18392d] shrink-0">
                <User size={14} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#142d23]">
                  {opportunity.contactName}
                </span>
                <span className="text-[#6c7d75] flex items-center gap-1">
                  <Phone size={11} /> {opportunity.phone}
                </span>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-[#edf6f1] text-[#059669] font-bold text-[10.5px] self-start sm:self-auto">
              Qualificado pela IA
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-[#edf2ee] bg-[#fafcfb] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <button
            onClick={() => {
              onStatusChange?.(opportunity.id, 'dismissed');
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#7c3a2a] hover:bg-[#fee2e2]/60 transition-colors cursor-pointer min-h-[42px] sm:min-h-0"
          >
            <Archive size={14} />
            <span>Descartar lead</span>
          </button>

          <div className="flex items-stretch sm:items-center gap-2">
            <button
              onClick={() => {
                onStatusChange?.(opportunity.id, 'converted');
                if (onStartContact) {
                  onStartContact(opportunity);
                }
                onClose();
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl border border-[#cfded6] bg-white text-[#16382c] text-xs font-semibold hover:bg-[#f3f7f4] transition-colors cursor-pointer min-h-[42px] sm:min-h-0"
            >
              <CheckCircle2 size={14} />
              <span>Mover p/ CRM</span>
            </button>

            <a
              onClick={() => {
                onStatusChange?.(opportunity.id, 'converted');
                if (onStartContact) {
                  onStartContact(opportunity);
                }
              }}
              href={`https://wa.me/${(opportunity.phone || '').replace(/[^0-9]/g, '')}?text=${safeEncodeURIComponent(
                `Olá ${opportunity.contactName || ''}, vi sua mensagem no grupo ${opportunity.groupName || ''} referente a ${opportunity.title || ''}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-[#12382c] hover:bg-[#0c261e] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[42px] sm:min-h-0"
            >
              <Send size={13} />
              <span>WhatsApp</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
