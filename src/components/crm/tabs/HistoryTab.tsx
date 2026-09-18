import React, { useState } from 'react';
import { CRMContact, CRMHistoryEvent, HistoryEventType } from '../../../types/crm';
import {
  HugeIcon,
  ChevronDownIcon,
  WhatsappIcon,
  Target02Icon,
  UserIcon,
  SentIcon,
  Message01Icon,
  DocumentIcon,
  BoldIcon,
  CheckmarkCircle01Icon,
  Layers01Icon,
} from '../../icons/HugeIcon';

interface HistoryTabProps {
  contact: CRMContact;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ contact }) => {
  const [filter, setFilter] = useState<'all' | 'messages' | 'tasks' | 'notes'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const getEventIconData = (type: HistoryEventType) => {
    switch (type) {
      case 'radar_message':
        return {
          icon: WhatsappIcon,
          bg: 'bg-emerald-500 text-white',
          border: 'border-emerald-200',
        };
      case 'opportunity_detected':
        return {
          icon: Target02Icon,
          bg: 'bg-teal-600 text-white',
          border: 'border-teal-200',
        };
      case 'assigned':
        return {
          icon: UserIcon,
          bg: 'bg-slate-700 text-white',
          border: 'border-slate-300',
        };
      case 'first_contact':
        return {
          icon: SentIcon,
          bg: 'bg-sky-600 text-white',
          border: 'border-sky-200',
        };
      case 'client_reply':
        return {
          icon: Message01Icon,
          bg: 'bg-emerald-600 text-white',
          border: 'border-emerald-200',
        };
      case 'document_sent':
        return {
          icon: DocumentIcon,
          bg: 'bg-blue-600 text-white',
          border: 'border-blue-200',
        };
      case 'note_added':
        return {
          icon: BoldIcon,
          bg: 'bg-amber-600 text-white',
          border: 'border-amber-200',
        };
      case 'task_created':
        return {
          icon: CheckmarkCircle01Icon,
          bg: 'bg-indigo-600 text-white',
          border: 'border-indigo-200',
        };
      case 'stage_changed':
      default:
        return {
          icon: Layers01Icon,
          bg: 'bg-emerald-800 text-white',
          border: 'border-emerald-300',
        };
    }
  };

  const filteredEvents = contact.history.filter((ev) => {
    if (filter === 'messages') {
      return (
        ev.type === 'radar_message' ||
        ev.type === 'first_contact' ||
        ev.type === 'client_reply'
      );
    }
    if (filter === 'tasks') return ev.type === 'task_created';
    if (filter === 'notes') return ev.type === 'note_added';
    return true;
  });

  return (
    <div className="flex flex-col gap-4 p-4 text-xs text-[#1e3429]">
      {/* 1. Events Filter Dropdown */}
      <div className="relative flex justify-end">
        <button
          onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#dce6df] text-xs font-semibold text-[#3b5145] hover:bg-[#f2f7f4] transition-colors cursor-pointer"
        >
          <span>
            {filter === 'all'
              ? 'Todos os eventos'
              : filter === 'messages'
              ? 'Apenas mensagens'
              : filter === 'tasks'
              ? 'Apenas tarefas'
              : 'Apenas notas'}
          </span>
          <HugeIcon icon={ChevronDownIcon} size={14} />
        </button>

        {isFilterDropdownOpen && (
          <div className="absolute right-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-[#e2eae5] py-1 z-30 select-none">
            <button
              onClick={() => {
                setFilter('all');
                setIsFilterDropdownOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-[#f2f7f4]"
            >
              Todos os eventos
            </button>
            <button
              onClick={() => {
                setFilter('messages');
                setIsFilterDropdownOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-[#f2f7f4]"
            >
              Apenas mensagens
            </button>
            <button
              onClick={() => {
                setFilter('tasks');
                setIsFilterDropdownOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-[#f2f7f4]"
            >
              Apenas tarefas
            </button>
            <button
              onClick={() => {
                setFilter('notes');
                setIsFilterDropdownOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-[#f2f7f4]"
            >
              Apenas notas
            </button>
          </div>
        )}
      </div>

      {/* 2. Vertical Connecting Timeline */}
      <div className="relative pl-6 flex flex-col gap-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e2ebe5]">
        {filteredEvents.map((item) => {
          const iconConfig = getEventIconData(item.type);

          return (
            <div key={item.id} className="relative flex flex-col gap-1">
              {/* Circular Timeline Node */}
              <div
                className={`absolute -left-6 top-0 w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 ${iconConfig.border} ${iconConfig.bg} shadow-2xs z-10`}
              >
                <HugeIcon icon={iconConfig.icon} size={11} strokeWidth={2.2} />
              </div>

              {/* Title & Timestamp */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-[#142d22]">
                  {item.title}
                </span>
                <span className="text-[10px] text-[#7a8e83] shrink-0 font-medium">
                  {item.timestamp}
                </span>
              </div>

              {/* Subtitle / Quote */}
              {item.subtitle && (
                <p className="text-xs text-[#52665b] leading-relaxed break-words">
                  {item.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
