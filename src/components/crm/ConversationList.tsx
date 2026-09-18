import React from 'react';
import { CRMContact, CRMInboxFilter, CRMMainViewMode } from '../../types/crm';
import { HugeIcon, FilterHorizontalIcon, WhatsappIcon, UserGroupIcon } from '../icons/HugeIcon';
import { ContactAvatar } from './ContactAvatar';

interface ConversationListProps {
  contacts: CRMContact[];
  allContacts?: CRMContact[];
  selectedContactId: string | null;
  onSelectContact: (contact: CRMContact) => void;
  viewMode: CRMMainViewMode;
  onChangeViewMode: (mode: CRMMainViewMode) => void;
  inboxFilter: CRMInboxFilter;
  onChangeInboxFilter: (filter: CRMInboxFilter) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  contacts,
  allContacts,
  selectedContactId,
  onSelectContact,
  viewMode,
  onChangeViewMode,
  inboxFilter,
  onChangeInboxFilter,
}) => {
  const sourceContacts = allContacts || contacts;

  // Counts
  const totalCount = sourceContacts.length;
  const conversationsCount = sourceContacts.filter(
    (c) => !c.isGroup && !c.remoteJid?.includes('@g.us')
  ).length;
  const groupsCount = sourceContacts.filter(
    (c) => Boolean(c.isGroup || c.remoteJid?.includes('@g.us'))
  ).length;
  const unreadCount = sourceContacts.filter((c) => c.unreadCount > 0).length;

  return (
    <div
      id="crm-conversation-sidebar"
      className="w-full lg:w-80 xl:w-90 bg-white border-r border-[#eaefec] flex flex-col h-full shrink-0 select-none overflow-hidden"
    >
      {/* 1. Mode Switcher: Conversas | Pipeline */}
      <div className="p-3 border-b border-[#f0f4f1]">
        <div className="bg-[#f0f4f1] p-1 rounded-xl flex items-center">
          <button
            id="tab-view-conversas"
            onClick={() => onChangeViewMode('conversas')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
              viewMode === 'conversas'
                ? 'bg-[#12382c] text-white shadow-xs'
                : 'text-[#55695e] hover:text-[#12382c]'
            }`}
          >
            Conversas
          </button>
          <button
            id="tab-view-pipeline"
            onClick={() => onChangeViewMode('pipeline')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
              viewMode === 'pipeline'
                ? 'bg-[#12382c] text-white shadow-xs'
                : 'text-[#55695e] hover:text-[#12382c]'
            }`}
          >
            Pipeline
          </button>
        </div>

        {/* 2. Inbox Filter Chips: Todos | Conversas | Grupos | Não lidos */}
        <div className="flex items-center justify-between gap-1.5 mt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => onChangeInboxFilter('todos')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                inboxFilter === 'todos'
                  ? 'bg-[#12382c] text-white shadow-xs'
                  : 'bg-[#f2f6f3] text-[#4f6458] hover:bg-[#e7eee9]'
              }`}
            >
              <span>Todos</span>
              <span
                className={`text-[11px] ${
                  inboxFilter === 'todos' ? 'text-emerald-200' : 'text-[#6a7d72]'
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => onChangeInboxFilter('conversas')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                inboxFilter === 'conversas'
                  ? 'bg-[#12382c] text-white shadow-xs'
                  : 'bg-[#f2f6f3] text-[#4f6458] hover:bg-[#e7eee9]'
              }`}
            >
              <span>Conversas</span>
              <span
                className={`text-[11px] ${
                  inboxFilter === 'conversas' ? 'text-emerald-200' : 'text-[#6a7d72]'
                }`}
              >
                {conversationsCount}
              </span>
            </button>

            <button
              onClick={() => onChangeInboxFilter('grupos')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                inboxFilter === 'grupos'
                  ? 'bg-[#12382c] text-white shadow-xs'
                  : 'bg-[#f2f6f3] text-[#4f6458] hover:bg-[#e7eee9]'
              }`}
            >
              <span>Grupos</span>
              <span
                className={`text-[11px] ${
                  inboxFilter === 'grupos' ? 'text-emerald-200' : 'text-[#6a7d72]'
                }`}
              >
                {groupsCount}
              </span>
            </button>

            <button
              onClick={() => onChangeInboxFilter('nao_lidos')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                inboxFilter === 'nao_lidos'
                  ? 'bg-[#12382c] text-white shadow-xs'
                  : 'bg-[#f2f6f3] text-[#4f6458] hover:bg-[#e7eee9]'
              }`}
            >
              <span>Não lidos</span>
              {unreadCount > 0 && (
                <span
                  className={`text-[11px] font-bold ${
                    inboxFilter === 'nao_lidos' ? 'text-emerald-200' : 'text-[#059669]'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button
            aria-label="Filtrar conversas"
            className="p-1.5 rounded-lg border border-[#e4ebe6] text-[#55695e] hover:text-[#12382c] hover:bg-[#f2f6f3] transition-colors shrink-0 cursor-pointer"
          >
            <HugeIcon icon={FilterHorizontalIcon} size={15} />
          </button>
        </div>
      </div>

      {/* 3. Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f3f7f4]">
        {contacts.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-[#6e8076] h-64">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f5f2] flex items-center justify-center text-[#108e66] mb-3">
              <HugeIcon icon={WhatsappIcon} size={24} />
            </div>
            <p className="text-sm font-bold text-[#142d23]">Nenhuma conversa ativa</p>
            <p className="text-xs text-[#708278] mt-1.5 leading-relaxed max-w-[210px]">
              Aguardando conversas do WhatsApp conectado nesta instância.
            </p>
          </div>
        ) : (
          contacts.map((contact) => {
          const isSelected = contact.id === selectedContactId || contact.remoteJid === selectedContactId;
          const isGroup = Boolean(contact.isGroup || contact.remoteJid?.includes('@g.us'));

          return (
            <button
              key={contact.id}
              id={`contact-item-${contact.id}`}
              onClick={() => onSelectContact(contact)}
              className={`w-full p-3.5 flex items-start gap-3 text-left transition-all duration-150 cursor-pointer border-l-3 ${
                isSelected
                  ? 'bg-[#f5faf7] border-[#12382c]'
                  : 'hover:bg-[#fafcfb] border-transparent'
              }`}
            >
              {/* Avatar + Online status dot */}
              <ContactAvatar
                avatar={contact.avatar}
                name={contact.name}
                size="md"
                isGroup={isGroup}
                isOnline={contact.isOnline}
              />

              {/* Text Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[13px] font-bold text-[#142d22] truncate">
                      {contact.name}
                    </span>
                    {isGroup && (
                      <span className="bg-[#eaf4ef] text-[#12382c] text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0">
                        Grupo
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] shrink-0 font-medium ${
                      isSelected || contact.unreadCount > 0
                        ? 'text-[#059669] font-semibold'
                        : 'text-[#7d9086]'
                    }`}
                  >
                    {contact.lastMessageTime}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[#5f7368] truncate leading-relaxed">
                    {contact.lastMessageSnippet}
                  </p>

                  {/* Unread badge */}
                  {contact.unreadCount > 0 && (
                    <span
                      className={`min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        contact.unreadCount >= 2
                          ? 'bg-[#059669] text-white'
                          : 'bg-[#8ca397] text-white'
                      }`}
                    >
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        }))}
      </div>
    </div>
  );
};
