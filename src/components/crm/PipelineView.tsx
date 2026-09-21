import React from 'react';
import { CRMContact, CRMStage } from '../../types/crm';
import {
  HugeIcon,
  Message01Icon,
  Clock01Icon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '../icons/HugeIcon';

interface PipelineViewProps {
  contacts: CRMContact[];
  onSelectContact: (contact: CRMContact) => void;
  onUpdateStage: (contactId: string, newStage: CRMStage) => void;
}

const STAGES: { id: CRMStage; title: string; color: string }[] = [
  { id: 'novo', title: 'Novo contato', color: 'bg-amber-500' },
  { id: 'em_atendimento', title: 'Em atendimento', color: 'bg-emerald-500' },
  { id: 'interessado', title: 'Interessado', color: 'bg-cyan-500' },
  { id: 'proposta_enviada', title: 'Planos enviados', color: 'bg-blue-500' },
  { id: 'follow_up', title: 'Follow-up', color: 'bg-indigo-500' },
  { id: 'assinatura_concluida', title: 'Assinatura concluída', color: 'bg-purple-500' },
  { id: 'sem_retorno', title: 'Sem retorno', color: 'bg-orange-500' },
  { id: 'cancelado', title: 'Cancelado', color: 'bg-rose-500' },
  { id: 'descartado', title: 'Descartado', color: 'bg-slate-400' },
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  contacts,
  onSelectContact,
  onUpdateStage,
}) => {
  const getStageContacts = (stageId: CRMStage) =>
    contacts.filter((c) => c.status === stageId);

  const moveStage = (
    contactId: string,
    currentStage: CRMStage,
    direction: 'prev' | 'next',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < STAGES.length) {
      onUpdateStage(contactId, STAGES[targetIndex].id);
    }
  };

  return (
    <div
      id="crm-pipeline-view"
      className="flex-1 bg-[#f6f9f7] overflow-x-auto p-4 sm:p-6 flex items-start gap-4 select-none"
    >
      {STAGES.map((stage, sIdx) => {
        const stageContacts = getStageContacts(stage.id);

        return (
          <div
            key={stage.id}
            className="w-72 sm:w-80 flex flex-col max-h-full shrink-0 bg-white/70 backdrop-blur-xs rounded-2xl border border-[#e3eae5] p-3 shadow-2xs"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e9f0eb] mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <span className="font-bold text-xs text-[#142d22]">
                  {stage.title}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e9f1ed] text-[#42594d]">
                {stageContacts.length}
              </span>
            </div>

            {/* Cards Column */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
              {stageContacts.length === 0 ? (
                <div className="py-8 text-center text-[#82968b] text-xs">
                  Nenhum contato nesta etapa
                </div>
              ) : (
                stageContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className="p-3.5 bg-white rounded-xl border border-[#e3ebe6] hover:border-[#b7d2c3] hover:shadow-xs transition-all cursor-pointer flex flex-col gap-2.5 group"
                  >
                    {/* Top row: Avatar + Name + Score */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-[#e2eae5] shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-[#142d22] truncate group-hover:text-[#12382c]">
                            {contact.name}
                          </span>
                          <span className="text-[11px] text-[#6d8276] truncate">
                            {contact.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center px-2 py-0.5 rounded-lg bg-[#edf6f1] border border-[#cbe3d5] shrink-0">
                        <span className="text-xs font-extrabold text-[#059669]">
                          {contact.score}
                        </span>
                      </div>
                    </div>

                    {/* Snippet */}
                    <p className="text-[11px] text-[#55695e] line-clamp-2 leading-relaxed italic bg-[#f8faf9] p-2 rounded-lg border border-[#edf3f0]">
                      "{contact.lastMessageSnippet}"
                    </p>

                    {/* Bottom Metadata & Move Controls */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#71857a] border-t border-[#f2f7f4]">
                      <div className="flex items-center gap-1.5">
                        <HugeIcon icon={Clock01Icon} size={12} />
                        <span>{contact.lastMessageTime}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {sIdx > 0 && (
                          <button
                            title="Voltar etapa"
                            onClick={(e) => moveStage(contact.id, stage.id, 'prev', e)}
                            className="p-1 rounded-md hover:bg-[#ebf3ee] text-[#55695e] transition-colors"
                          >
                            <HugeIcon icon={ChevronLeftIcon} size={14} />
                          </button>
                        )}

                        <button
                          title="Abrir chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectContact(contact);
                          }}
                          className="p-1 rounded-md hover:bg-[#ebf3ee] text-[#12382c] transition-colors"
                        >
                          <HugeIcon icon={Message01Icon} size={14} />
                        </button>

                        {sIdx < STAGES.length - 1 && (
                          <button
                            title="Avançar etapa"
                            onClick={(e) => moveStage(contact.id, stage.id, 'next', e)}
                            className="p-1 rounded-md hover:bg-[#ebf3ee] text-[#55695e] transition-colors"
                          >
                            <HugeIcon icon={ChevronRightIcon} size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
