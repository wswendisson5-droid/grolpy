import React, { useState } from 'react';
import { CRMContact, CRMStage, CRMAssignee } from '../../../types/crm';
import { TEAM_MEMBERS } from '../../../data/crmMockData';
import {
  HugeIcon,
  Clock01Icon,
  UserIcon,
  Message02Icon,
  Calendar01Icon,
  Tag01Icon,
  PackageIcon,
  TelephoneIcon,
  Location01Icon,
  WhatsappIcon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  ChevronDownIcon,
} from '../../icons/HugeIcon';

interface DetailsTabProps {
  contact: CRMContact;
  onUpdateStatus: (newStatus: CRMStage) => void;
  onUpdateAssignee: (assignee: CRMAssignee) => void;
  onDiscard: () => void;
}

export const DetailsTab: React.FC<DetailsTabProps> = ({
  contact,
  onUpdateStatus,
  onUpdateAssignee,
  onDiscard,
}) => {
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const stageLabels: Record<CRMStage, string> = {
      novo: 'Novo contato',
      em_atendimento: 'Em atendimento',
      interessado: 'Interessado',
      proposta_enviada: 'Planos enviados',
      follow_up: 'Follow-up',
      assinatura_concluida: 'Assinatura concluída',
      concluido: 'Concluído',
      sem_retorno: 'Sem retorno',
      cancelado: 'Cancelado',
      descartado: 'Descartado',
    };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-xs text-[#1e3429]">
      {/* 1. Attributes Key-Value List */}
      <div className="flex flex-col divide-y divide-[#f0f4f1] border-b border-[#f0f4f1] pb-2">
        {/* Status */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={Clock01Icon} size={15} />
            <span>Status</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsStageDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#f2f7f4] hover:bg-[#e7f0ec] text-[#12382c] font-semibold transition-colors cursor-pointer border border-[#dce8e1]"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{stageLabels[contact.status]}</span>
              <HugeIcon icon={ChevronDownIcon} size={13} />
            </button>

            {isStageDropdownOpen && (
              <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-[#e2eae5] py-1 z-30 select-none">
                {(['novo', 'em_atendimento', 'interessado', 'proposta_enviada', 'follow_up', 'assinatura_concluida', 'sem_retorno', 'cancelado', 'descartado'] as CRMStage[]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => {
                        onUpdateStatus(st);
                        setIsStageDropdownOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-[#f2f7f4] flex items-center gap-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          st === 'concluido'
                            ? 'bg-blue-500'
                            : st === 'novo'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span>{stageLabels[st]}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Responsável */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={UserIcon} size={15} />
            <span>Responsável</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsAssigneeDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-[#f2f7f4] transition-colors cursor-pointer"
            >
              <img
                src={contact.assignedTo.avatar}
                alt={contact.assignedTo.name}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover border border-[#d9e5df]"
              />
              <span className="font-semibold text-[#142d22]">
                {contact.assignedTo.name}
              </span>
              <HugeIcon icon={ChevronDownIcon} size={13} />
            </button>

            {isAssigneeDropdownOpen && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-lg border border-[#e2eae5] py-1 z-30 select-none">
                {TEAM_MEMBERS.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      onUpdateAssignee(member);
                      setIsAssigneeDropdownOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-[#f2f7f4] flex items-center gap-2.5"
                  >
                    <img
                      src={member.avatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#142d22]">{member.name}</span>
                      <span className="text-[10px] text-[#71857a]">{member.role}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Origem */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={Message02Icon} size={15} />
            <span>Origem</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="font-semibold text-[#142d22]">Grupo do WhatsApp</span>
            <span className="text-[11px] text-[#71857a]">{contact.originGroup.name}</span>
          </div>
        </div>

        {/* Detectado em */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={Calendar01Icon} size={15} />
            <span>Detectado em</span>
          </div>
          <span className="font-semibold text-[#142d22]">{contact.detectedAt}</span>
        </div>

        {/* Segmento */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={Tag01Icon} size={15} />
            <span>Segmento</span>
          </div>
          <span className="font-semibold text-[#142d22]">{contact.segment}</span>
        </div>

        {/* Tipo */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={PackageIcon} size={15} />
            <span>Tipo</span>
          </div>
          <span className="font-semibold text-[#142d22]">{contact.typeCategory}</span>
        </div>

        {/* Telefone */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={TelephoneIcon} size={15} />
            <span>Telefone</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPhone}
              title="Copiar número"
              className="font-semibold text-[#142d22] hover:underline cursor-pointer"
            >
              {contact.phone}
            </button>
            <a
              href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Abrir no WhatsApp"
            >
              <HugeIcon icon={WhatsappIcon} size={15} className="text-emerald-600" />
            </a>
            {copiedPhone && (
              <span className="text-[10px] text-emerald-600 font-bold">Copiado!</span>
            )}
          </div>
        </div>

        {/* Localização */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#607469] font-medium">
            <HugeIcon icon={Location01Icon} size={15} />
            <span>Localização</span>
          </div>
          <span className="font-semibold text-[#142d22]">{contact.location}</span>
        </div>
      </div>

      {/* 2. Mensagem de origem */}
      <div className="flex flex-col gap-2">
        <h4 className="font-bold text-[#142d22] text-xs">Mensagem de origem</h4>
        <div className="p-3 bg-[#f7faf8] rounded-xl border border-[#e5ece7] flex flex-col gap-2">
          <p className="text-xs text-[#283f33] leading-relaxed italic">
            "{contact.originalMessage.text}"
          </p>
          <span className="text-[10px] text-[#7a8e83] self-end">
            {contact.originalMessage.time}
          </span>
        </div>
      </div>

      {/* 3. Por que foi identificada? */}
      <div className="flex flex-col gap-2">
        <h4 className="font-bold text-[#142d22] text-xs">Por que foi identificada?</h4>
        <div className="flex flex-col gap-2">
          {contact.identificationReasons.map((reason, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-[#223b2e]">
              <span className="text-[#059669] shrink-0">
                <HugeIcon icon={CheckmarkCircle01Icon} size={15} />
              </span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Bottom Actions: Descartar | Mover para etapa */}
      <div className="flex items-center gap-2.5 pt-4 mt-2 border-t border-[#f0f4f1]">
        <button
          onClick={onDiscard}
          className="flex-1 py-2.5 px-3 rounded-xl border border-[#e1eae5] hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-700 text-[#4c6155] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <HugeIcon icon={Delete01Icon} size={14} />
          <span>Descartar</span>
        </button>

        <div className="relative flex-1">
          <button
            onClick={() => setIsMoveMenuOpen((prev) => !prev)}
            className="w-full py-2.5 px-3 rounded-xl bg-[#12382c] hover:bg-[#1a4a3b] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <span>Mover para etapa</span>
            <HugeIcon icon={ChevronDownIcon} size={14} />
          </button>

          {isMoveMenuOpen && (
            <div className="absolute right-0 bottom-12 w-48 bg-white rounded-xl shadow-xl border border-[#e2eae5] py-1 z-30 select-none">
              {(['novo', 'em_atendimento', 'interessado', 'proposta_enviada', 'follow_up', 'assinatura_concluida', 'sem_retorno', 'cancelado', 'descartado'] as CRMStage[]).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdateStatus(st);
                      setIsMoveMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-[#f2f7f4] flex items-center justify-between"
                  >
                    <span>{stageLabels[st]}</span>
                    {contact.status === st && (
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
