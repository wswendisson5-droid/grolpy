import React from 'react';
import {
  CRMContact,
  CRMDetailTab,
  CRMStage,
  CRMAssignee,
  CRMTask,
} from '../../types/crm';
import { DetailsTab } from './tabs/DetailsTab';
import { NotesTab } from './tabs/NotesTab';
import { TasksTab } from './tabs/TasksTab';
import { HistoryTab } from './tabs/HistoryTab';
import { ContactAvatar } from './ContactAvatar';
import {
  HugeIcon,
  ChevronLeftIcon,
  Cancel01Icon,
  MoreHorizontalIcon,
} from '../icons/HugeIcon';

interface ContactDetailPanelProps {
  contact: CRMContact;
  activeTab: CRMDetailTab;
  onChangeTab: (tab: CRMDetailTab) => void;
  onClose: () => void;
  onUpdateStatus: (newStatus: CRMStage) => void;
  onUpdateAssignee: (assignee: CRMAssignee) => void;
  onDiscard: () => void;
  onAddNote: (content: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<CRMTask, 'id' | 'contactId' | 'timestamp'>) => void;
}

export const ContactDetailPanel: React.FC<ContactDetailPanelProps> = ({
  contact,
  activeTab,
  onChangeTab,
  onClose,
  onUpdateStatus,
  onUpdateAssignee,
  onDiscard,
  onAddNote,
  onToggleTask,
  onAddTask,
}) => {
  const tabs: { id: CRMDetailTab; label: string }[] = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'notas', label: 'Notas' },
    { id: 'tarefas', label: 'Tarefas' },
    { id: 'historico', label: 'Histórico' },
  ];

  return (
    <div
      id="crm-contact-detail-panel"
      className="w-full lg:w-96 xl:w-105 bg-white border-l border-[#eaefec] flex flex-col h-full shrink-0 select-none overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#f0f4f1] shrink-0">
        <button
          onClick={onClose}
          aria-label="Voltar"
          className="p-1.5 rounded-xl text-[#5a6f63] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer"
        >
          <HugeIcon icon={ChevronLeftIcon} size={18} />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            aria-label="Opções adicionais"
            className="p-1.5 rounded-xl text-[#5a6f63] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer"
          >
            <HugeIcon icon={MoreHorizontalIcon} size={18} />
          </button>
          <button
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-1.5 rounded-xl text-[#5a6f63] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer"
          >
            <HugeIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
      </div>

      {/* 2. Top Profile Summary Card (from Image 2) */}
      <div className="p-4 border-b border-[#f0f4f1] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar Thumbnail */}
          <ContactAvatar
            avatar={contact.avatar}
            name={contact.name}
            size="lg"
            isGroup={Boolean(contact.isGroup || contact.remoteJid?.includes('@g.us'))}
            isOnline={contact.isOnline}
          />

          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-[#142d22] truncate">
              {contact.name}
            </h3>
            <span className="text-xs text-[#5d7266] truncate mb-1">
              {contact.subtitle}
            </span>

            {/* Tags */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {contact.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f0f5f2] text-[#3f574a] border border-[#dbe6df] whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Score Circle Badge */}
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-[#edf6f1] border border-[#cbe3d5] shrink-0">
          <span className="text-base font-extrabold text-[#059669] leading-none">
            {contact.score}
          </span>
          <span className="text-[10px] font-semibold text-[#5a7065] leading-none mt-0.5">
            Score
          </span>
        </div>
      </div>

      {/* 3. 4-Tabs Navigation */}
      <div className="flex items-center border-b border-[#eaefec] px-2 shrink-0 bg-white">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 py-3 text-xs font-bold text-center relative transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#12382c]'
                  : 'text-[#6c8074] hover:text-[#12382c]'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 bg-[#12382c] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'detalhes' && (
          <DetailsTab
            contact={contact}
            onUpdateStatus={onUpdateStatus}
            onUpdateAssignee={onUpdateAssignee}
            onDiscard={onDiscard}
          />
        )}
        {activeTab === 'notas' && (
          <NotesTab
            contact={contact}
            onAddNote={onAddNote}
          />
        )}
        {activeTab === 'tarefas' && (
          <TasksTab
            contact={contact}
            onToggleTask={onToggleTask}
            onAddTask={onAddTask}
          />
        )}
        {activeTab === 'historico' && <HistoryTab contact={contact} />}
      </div>
    </div>
  );
};
