import React, { useState } from 'react';
import { Opportunity } from '../../types/nexus';
import { radarService } from '../../services/radarService';
import { safeEncodeURIComponent } from '../../utils/safeUri';
import {
  HugeIcon,
  Cancel01Icon,
  ArrowLeft01Icon,
  WhatsappIcon,
  Delete01Icon,
  Message01Icon,
  SparklesIcon,
  Clock01Icon,
  UserIcon,
  Location01Icon,
  TelephoneIcon,
  SentIcon,
  CheckmarkCircle01Icon,
  Tag01Icon,
} from '../icons/HugeIcon';

interface OpportunityDetailPanelProps {
  opportunity: Opportunity;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStage: Opportunity['stage']) => void;
  onAssignUser?: (id: string, userName: string) => void;
  onStartContact?: (opp: Opportunity) => void;
  isMobileFullscreen?: boolean;
}

type DetailTab = 'resumo' | 'ia' | 'mensagens' | 'historico';

export const OpportunityDetailPanel: React.FC<OpportunityDetailPanelProps> = ({
  opportunity,
  onClose,
  onUpdateStatus,
  onAssignUser,
  onStartContact,
  isMobileFullscreen = false,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('resumo');
  const [replyText, setReplyText] = useState('');
  const [isCopiedPhone, setIsCopiedPhone] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const cleanPhone = (opportunity.phone || '').replace(/\D/g, '');
  const suggestedGreeting = `Olá ${opportunity.contactName || ''}! Vi sua mensagem no grupo ${opportunity.groupName || ''} sobre ${opportunity.title || ''}. Como posso te ajudar?`;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${safeEncodeURIComponent(suggestedGreeting)}`;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(opportunity.phone);
    setIsCopiedPhone(true);
    setTimeout(() => setIsCopiedPhone(false), 2000);
  };

  const handleDismiss = () => {
    if (onUpdateStatus) {
      onUpdateStatus(opportunity.id, 'descartadas');
      setActionFeedback('Oportunidade descartada com sucesso.');
      setTimeout(() => {
        setActionFeedback(null);
        onClose();
      }, 1000);
    }
  };

  const handleStartContact = async () => {
    try {
      await radarService.startContact(opportunity.id, 'Enzo Santos');
    } catch {
      // safe fallback
    }

    if (onAssignUser) {
      onAssignUser(opportunity.id, 'Enzo Santos');
    }

    if (onUpdateStatus && opportunity.stage !== 'em_atendimento' && opportunity.stage !== 'concluidas') {
      onUpdateStatus(opportunity.id, 'em_atendimento');
    }

    if (onStartContact) {
      onStartContact(opportunity);
    } else {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAssign = (name: string) => {
    if (onAssignUser) {
      onAssignUser(opportunity.id, name);
    }
  };

  return (
    <div
      id={`opp-detail-panel-${opportunity.id}`}
      className={`bg-white border-l border-[#e4ece7] flex flex-col h-full overflow-hidden ${
        isMobileFullscreen
          ? 'fixed inset-0 z-50 w-full h-full'
          : 'relative w-full'
      }`}
    >
      {/* Top Header: Lead Identity & Close / Back Action */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#e9efe9] flex items-center justify-between gap-3 bg-[#fafcfb] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {isMobileFullscreen && (
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-[#2d4036] hover:bg-[#edf3f0] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Voltar para a lista"
            >
              <HugeIcon icon={ArrowLeft01Icon} size={18} />
              <span>Voltar</span>
            </button>
          )}

          <img
            src={opportunity.avatar}
            alt={opportunity.title}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border border-[#dce6df] shrink-0"
          />

          <div className="flex flex-col min-w-0">
            <h2 className="text-sm sm:text-[15px] font-bold text-[#142d23] leading-tight truncate">
              {opportunity.title}
            </h2>
            <span className="text-[11px] font-medium text-[#64766d] truncate">
              {opportunity.segment} • {opportunity.category}
            </span>
          </div>
        </div>

        {/* Header Right: Score Badge and Desktop Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-2.5 py-1 rounded-full bg-[#ecf7f1] border border-[#cbe8d5] text-[#059669] text-xs font-extrabold flex items-center gap-1 shadow-xs">
            <HugeIcon icon={SparklesIcon} size={13} />
            <span>Score {opportunity.score}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#73857d] hover:text-[#18392d] hover:bg-[#edf3f0] rounded-lg transition-colors"
            title="Fechar detalhes"
          >
            <HugeIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
      </div>

      {/* Internal Navigation Tabs: Resumo, Análise da IA, Mensagens, Histórico */}
      <div className="px-4 sm:px-5 pt-2 border-b border-[#e9efe9] flex items-center gap-1 sm:gap-2 bg-white shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('resumo')}
          className={`px-3 py-2 text-xs font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'resumo'
              ? 'text-[#12382c]'
              : 'text-[#6b7c74] hover:text-[#253930]'
          }`}
        >
          Resumo
          {activeTab === 'resumo' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#12382c] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('ia')}
          className={`px-3 py-2 text-xs font-bold transition-all relative flex items-center gap-1 whitespace-nowrap ${
            activeTab === 'ia'
              ? 'text-[#12382c]'
              : 'text-[#6b7c74] hover:text-[#253930]'
          }`}
        >
          <HugeIcon icon={SparklesIcon} size={13} className="text-[#059669]" />
          <span>Análise da IA</span>
          {activeTab === 'ia' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#12382c] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('mensagens')}
          className={`px-3 py-2 text-xs font-bold transition-all relative flex items-center gap-1 whitespace-nowrap ${
            activeTab === 'mensagens'
              ? 'text-[#12382c]'
              : 'text-[#6b7c74] hover:text-[#253930]'
          }`}
        >
          <HugeIcon icon={Message01Icon} size={13} />
          <span>Mensagens</span>
          {opportunity.messagesThread && opportunity.messagesThread.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#e3efe9] text-[#12382c] text-[10px] font-bold flex items-center justify-center">
              {opportunity.messagesThread.length}
            </span>
          )}
          {activeTab === 'mensagens' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#12382c] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-3 py-2 text-xs font-bold transition-all relative flex items-center gap-1 whitespace-nowrap ${
            activeTab === 'historico'
              ? 'text-[#12382c]'
              : 'text-[#6b7c74] hover:text-[#253930]'
          }`}
        >
          <HugeIcon icon={Clock01Icon} size={13} />
          <span>Histórico</span>
          {activeTab === 'historico' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#12382c] rounded-full" />
          )}
        </button>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {actionFeedback && (
          <div className="p-3 bg-[#e8f6ed] border border-[#c6e8d2] text-[#059669] text-xs font-semibold rounded-xl flex items-center gap-2">
            <HugeIcon icon={CheckmarkCircle01Icon} size={16} />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* TAB 1: RESUMO */}
        {activeTab === 'resumo' && (
          <div className="space-y-4">
            {/* Detected Message in WhatsApp Box */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f8faf9] border border-[#e4ede7] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#63756c]">
                <div className="flex items-center gap-1.5 font-bold text-[#1a382d]">
                  <HugeIcon icon={Message01Icon} size={14} className="text-[#059669]" />
                  <span>Mensagem detectada no WhatsApp</span>
                </div>
                <span>{opportunity.timestamp}</span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#1e2f27] leading-relaxed italic bg-white p-3 rounded-xl border border-[#e7ede9]">
                "{opportunity.messageOriginal}"
              </p>
              <div className="flex items-center justify-between text-[10.5px] text-[#718279] pt-1">
                <span>Remetente: <strong className="text-[#1a382d]">{opportunity.contactName}</strong></span>
                <span className="flex items-center gap-1 font-semibold text-[#059669]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Capturado via Evolution API
                </span>
              </div>
            </div>

            {/* Motivo da Identificação */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f2f8f5] border border-[#d7e9df] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#143c2e]">
                <HugeIcon icon={SparklesIcon} size={14} className="text-[#059669]" />
                <span>Motivo da identificação pela IA</span>
              </div>
              <p className="text-xs text-[#263e33] leading-relaxed">
                {opportunity.detectionReason}
              </p>
            </div>

            {/* Informações do Lead */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#e5ece7] space-y-3">
              <h3 className="text-xs font-bold text-[#142d23] uppercase tracking-wider text-[11px]">
                Informações do Lead
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Nome do Contato */}
                <div className="p-2.5 rounded-xl bg-[#f9faf9] border border-[#ecf1ee]">
                  <span className="text-[10.5px] text-[#72837a] block">Contato</span>
                  <span className="font-bold text-[#1a2f26]">{opportunity.contactName}</span>
                </div>

                {/* Telefone com Ação de Copiar */}
                <div className="p-2.5 rounded-xl bg-[#f9faf9] border border-[#ecf1ee] flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] text-[#72837a] block">WhatsApp / Telefone</span>
                    <span className="font-bold text-[#1a2f26]">{opportunity.phone}</span>
                  </div>
                  <button
                    onClick={handleCopyPhone}
                    className="p-1 text-[#5d7066] hover:text-[#18392d] hover:bg-[#eaf1ec] rounded-md transition-colors text-[10.5px] font-semibold"
                    title="Copiar telefone"
                  >
                    {isCopiedPhone ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                {/* Grupo do WhatsApp de Origem */}
                <div className="p-2.5 rounded-xl bg-[#f9faf9] border border-[#ecf1ee]">
                  <span className="text-[10.5px] text-[#72837a] block">Grupo de Origem</span>
                  <span className="font-bold text-[#1a2f26] truncate block">{opportunity.groupName}</span>
                </div>

                {/* Cidade / Região */}
                <div className="p-2.5 rounded-xl bg-[#f9faf9] border border-[#ecf1ee]">
                  <span className="text-[10.5px] text-[#72837a] block">Localização</span>
                  <span className="font-bold text-[#1a2f26]">{opportunity.location || 'Espírito Santo'}</span>
                </div>
              </div>
            </div>

            {/* Responsável pelo Atendimento */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#e5ece7] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#142d23] text-[11px] uppercase tracking-wider">
                  Responsável
                </span>
                <span className="text-[11px] text-[#72837a]">Clique para alterar</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAssign('Enzo Santos')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    opportunity.assignedTo?.name === 'Enzo Santos'
                      ? 'bg-[#eaf5ef] border-[#143d2f] text-[#143d2f] shadow-xs ring-1 ring-[#143d2f]'
                      : 'bg-white border-[#e3ebe6] text-[#4d5e55] hover:bg-[#f8faf9]'
                  }`}
                >
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
                    alt="Enzo Santos"
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span>Enzo Santos (Você)</span>
                </button>

                <button
                  onClick={() => handleAssign('Mariana Lima')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    opportunity.assignedTo?.name === 'Mariana Lima'
                      ? 'bg-[#eaf5ef] border-[#143d2f] text-[#143d2f] shadow-xs ring-1 ring-[#143d2f]'
                      : 'bg-white border-[#e3ebe6] text-[#4d5e55] hover:bg-[#f8faf9]'
                  }`}
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                    alt="Mariana Lima"
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span>Mariana Lima</span>
                </button>

                <button
                  onClick={() => handleAssign('Não atribuído')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    !opportunity.assignedTo
                      ? 'bg-[#f0f4f2] border-[#8a9d94] text-[#1c2c24]'
                      : 'bg-white border-[#e3ebe6] text-[#6d7f76] hover:bg-[#f8faf9]'
                  }`}
                >
                  Não atribuído
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANÁLISE DA IA */}
        {activeTab === 'ia' && (
          <div className="space-y-4">
            {/* Score Breakdown */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12382c] to-[#1b4b3c] text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#c0dbd0]">Pontuação Preditiva</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-xs font-bold">
                  IA Nexus v2.4
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">{opportunity.score}</span>
                <span className="text-xs text-[#b8d4c8]">/ 100 pontos de aderência comercial</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${opportunity.score}%` }}
                />
              </div>
            </div>

            {/* Análise de Intenção e Ticket */}
            <div className="p-4 rounded-2xl bg-white border border-[#e5ece7] space-y-3">
              <div>
                <span className="text-[11px] font-bold text-[#687a71] uppercase tracking-wider">
                  Intenção Identificada
                </span>
                <p className="text-xs sm:text-[13px] text-[#1a2f26] font-semibold mt-1">
                  {opportunity.aiAnalysis.intent}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#edf2ef]">
                <div>
                  <span className="text-[10.5px] text-[#718279] block">Orçamento Estimado</span>
                  <span className="text-xs font-bold text-[#143c2e]">
                    {opportunity.aiAnalysis.budget}
                  </span>
                </div>
                <div>
                  <span className="text-[10.5px] text-[#718279] block">Nível de Urgência</span>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold mt-0.5 ${
                    opportunity.aiAnalysis.urgency === 'Alta'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {opportunity.aiAnalysis.urgency}
                  </span>
                </div>
              </div>
            </div>

            {/* Palavras-chave & Gatilhos */}
            <div className="p-4 rounded-2xl bg-white border border-[#e5ece7] space-y-2.5">
              <span className="text-[11px] font-bold text-[#687a71] uppercase tracking-wider">
                Gatilhos Semânticos Detectados
              </span>
              <div className="flex flex-wrap gap-1.5">
                {opportunity.aiAnalysis.keyKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-[#edf5f1] border border-[#d6e7de] text-[#12382c] text-xs font-medium"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MENSAGENS */}
        {activeTab === 'mensagens' && (
          <div className="space-y-3 flex flex-col h-[340px]">
            <div className="flex-1 overflow-y-auto space-y-2.5 p-3 rounded-2xl bg-[#f7faf8] border border-[#e5ede7]">
              {opportunity.messagesThread?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.isFromLead
                      ? 'self-start items-start'
                      : 'self-end items-end ml-auto'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      msg.isFromLead
                        ? 'bg-white text-[#1f2f27] border border-[#e5eee8] rounded-tl-xs'
                        : 'bg-[#12382c] text-white rounded-tr-xs'
                    }`}
                  >
                    <span className="text-[10px] font-bold block opacity-75 mb-0.5">
                      {msg.sender}
                    </span>
                    {msg.text}
                  </div>
                  <span className="text-[9.5px] text-[#84968d] mt-0.5 px-1">
                    {msg.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Reply Bar via Evolution API */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Enviar mensagem via Evolution API..."
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-[#dce5e0] text-[#182a22] placeholder-[#8d9e96] focus:outline-none focus:border-[#143d2f]"
              />
              <button
                onClick={() => {
                  if (!replyText.trim()) return;
                  alert(`Mensagem disparada via Evolution API para ${opportunity.contactName}: "${replyText}"`);
                  setReplyText('');
                }}
                className="p-2 rounded-xl bg-[#12382c] text-white hover:bg-[#1a4b3b] transition-colors"
                title="Enviar"
              >
                <HugeIcon icon={SentIcon} size={16} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: HISTÓRICO */}
        {activeTab === 'historico' && (
          <div className="p-4 rounded-2xl bg-white border border-[#e5ece7] space-y-4">
            <span className="text-[11px] font-bold text-[#687a71] uppercase tracking-wider block">
              Trilha de Auditoria & Eventos
            </span>

            <div className="relative pl-6 space-y-4 border-l-2 border-[#e6eee9] ml-2">
              {opportunity.history?.map((item) => (
                <div key={item.id} className="relative">
                  <span
                    className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                      item.type === 'ai'
                        ? 'bg-emerald-500'
                        : item.type === 'user'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-[#7c8e85]">
                      {item.timestamp} • {item.author}
                    </span>
                    <span className="text-xs font-semibold text-[#1a2f26] mt-0.5">
                      {item.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer: Descartar & Iniciar Contato */}
      <div className="p-4 border-t border-[#e8efe9] bg-[#fafcfb] shrink-0 flex items-center justify-between gap-3">
        <button
          onClick={handleDismiss}
          className="px-3.5 py-2.5 rounded-xl border border-[#e5ece8] bg-white text-[#687a71] hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <HugeIcon icon={Delete01Icon} size={15} />
          <span>Descartar</span>
        </button>

        <button
          onClick={handleStartContact}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#12382c] hover:bg-[#1a4a3b] active:scale-[0.99] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <HugeIcon icon={WhatsappIcon} size={17} className="text-emerald-300" />
          <span>Iniciar contato</span>
        </button>
      </div>
    </div>
  );
};
