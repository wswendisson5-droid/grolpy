import React, { useState, useRef, useEffect } from 'react';
import { CRMContact, ChatMessage } from '../../types/crm';
import { ContactAvatar } from './ContactAvatar';
import { MediaMessage } from './MediaMessage';
import { safeEncodeURIComponent } from '../../utils/safeUri';
import {
  HugeIcon,
  StarIcon,
  Tag01Icon,
  MoreHorizontalIcon,
  EmojiIcon,
  SentIcon,
  PlusIcon,
  DoubleCheckIcon,
  ChevronLeftIcon,
  Layers01Icon,
  TelephoneIcon,
} from '../icons/HugeIcon';

interface ChatWindowProps {
  contact: CRMContact;
  messages: ChatMessage[];
  onSendMessage: (text: string, type?: 'text' | 'image' | 'audio' | 'document', mediaUrl?: string, fileName?: string) => void;
  onToggleFavorite?: () => void;
  onBackMobile?: () => void;
  onOpenDetailsMobile?: () => void;
  isDetailsPanelOpen?: boolean;
  onToggleDetailsPanel?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  contact,
  messages,
  onSendMessage,
  onToggleFavorite,
  onBackMobile,
  onOpenDetailsMobile,
  isDetailsPanelOpen,
  onToggleDetailsPanel,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadNewMessagesCount, setUnreadNewMessagesCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(messages.length);
  const prevContactIdRef = useRef(contact.id);

  // Poll real typing status for active contact
  useEffect(() => {
    let isMounted = true;
    let typingTimer: any;

    const checkTyping = async () => {
      const jid = contact.remoteJid || contact.id;
      if (!jid) return;
      try {
        const res = await fetch(`/api/crm/typing-status?jid=${safeEncodeURIComponent(jid)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.isTyping) {
            setIsTyping(true);
            clearTimeout(typingTimer);
            // Auto clear typing after 4 seconds to never get stuck
            typingTimer = setTimeout(() => {
              if (isMounted) setIsTyping(false);
            }, 4000);
          } else {
            setIsTyping(false);
          }
        }
      } catch {
        if (isMounted) setIsTyping(false);
      }
    };

    checkTyping();
    const interval = setInterval(checkTyping, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(typingTimer);
    };
  }, [contact.id, contact.remoteJid]);

  // Handle contact switch or message stream update
  useEffect(() => {
    const isDifferentContact = prevContactIdRef.current !== contact.id;

    if (isDifferentContact) {
      prevContactIdRef.current = contact.id;
      prevMessagesCountRef.current = messages.length;
      setUnreadNewMessagesCount(0);
      setIsAtBottom(true);
      // Immediate scroll to bottom when opening/switching conversation
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
      return;
    }

    const newMessagesArrived = messages.length > prevMessagesCountRef.current;
    if (newMessagesArrived) {
      const addedCount = messages.length - prevMessagesCountRef.current;
      prevMessagesCountRef.current = messages.length;

      // Check if user is currently scrolled up reading older messages
      if (!isAtBottom) {
        // DO NOT force scroll down! Inform user discreetly
        setUnreadNewMessagesCount((prev) => prev + addedCount);
      } else {
        // User was already at bottom, scroll down smoothly
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUnreadNewMessagesCount(0);
      }
    } else {
      prevMessagesCountRef.current = messages.length;
    }
  }, [messages, contact.id, isAtBottom]);

  // Scroll event handler to track whether user is at bottom
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80; // px tolerance
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);

    if (atBottom) {
      setUnreadNewMessagesCount(0);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadNewMessagesCount(0);
    setIsAtBottom(true);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), 'text');
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    onSendMessage(text, 'text');
  };

  const quickReplies = [
    'Olá! 👋',
    'Tenho interesse',
    'Pode me enviar mais informações?',
    'Qual o prazo de entrega?',
  ];

  return (
    <div
      id="crm-chat-center"
      className="flex-1 flex flex-col h-full bg-[#f7faf8] min-w-0 overflow-hidden relative"
    >
      {/* 1. Contact Chat Header */}
      <div
        id="crm-chat-header"
        className="h-16 px-4 lg:px-6 bg-white border-b border-[#eaefec] flex items-center justify-between gap-3 shrink-0 z-10"
      >
        {/* Left: Mobile Back Button + Avatar & Contact Meta */}
        <div className="flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="lg:hidden p-1.5 -ml-1 rounded-xl text-[#52665b] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors"
              aria-label="Voltar para lista de conversas"
            >
              <HugeIcon icon={ChevronLeftIcon} size={22} />
            </button>
          )}

          <div
            onClick={onOpenDetailsMobile}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <ContactAvatar
              avatar={contact.avatar}
              name={contact.name}
              size="md"
              isGroup={Boolean(contact.isGroup || contact.remoteJid?.includes('@g.us'))}
              isOnline={contact.isOnline}
            />

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#142d22] truncate group-hover:text-[#12382c]">
                  {contact.name}
                </span>
                {contact.isGroup ? (
                  <span className="bg-[#eaf4ef] text-[#12382c] text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0">
                    Grupo
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </div>
              <span className="text-xs text-[#63776d] truncate">
                {contact.isGroup
                  ? 'Grupo do WhatsApp • Evolution API'
                  : contact.phone
                  ? `${contact.phone} • WhatsApp`
                  : 'Contato WhatsApp'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Score Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Score Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#edf6f1] border border-[#cbe3d5] rounded-xl">
            <span className="text-sm font-extrabold text-[#059669]">
              {contact.score}
            </span>
            <span className="text-[11px] font-semibold text-[#5a7065]">
              Score
            </span>
          </div>

          {/* Star Favorite */}
          <button
            onClick={onToggleFavorite}
            aria-label="Favoritar conversa"
            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
              contact.isFavorite
                ? 'bg-amber-50 border-amber-200 text-amber-500'
                : 'border-[#e2ebe5] text-[#6b7e74] hover:text-[#12382c] hover:bg-[#f2f7f4]'
            }`}
          >
            <HugeIcon
              icon={StarIcon}
              size={17}
              className={contact.isFavorite ? 'fill-amber-400 text-amber-500' : ''}
            />
          </button>

          {/* Tag Icon */}
          <button
            aria-label="Etiquetas do contato"
            className="hidden sm:flex p-2 rounded-xl border border-[#e2ebe5] text-[#6b7e74] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer"
          >
            <HugeIcon icon={Tag01Icon} size={17} />
          </button>

          {/* Details Panel Toggle (Desktop) */}
          {onToggleDetailsPanel && (
            <button
              onClick={onToggleDetailsPanel}
              aria-label="Painel lateral"
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDetailsPanelOpen
                  ? 'bg-[#12382c] text-white border-[#12382c]'
                  : 'border-[#e2ebe5] text-[#6b7e74] hover:text-[#12382c] hover:bg-[#f2f7f4]'
              }`}
            >
              <HugeIcon icon={Layers01Icon} size={17} />
            </button>
          )}

          {/* More Options */}
          <button
            aria-label="Mais opções"
            className="p-2 rounded-xl border border-[#e2ebe5] text-[#6b7e74] hover:text-[#12382c] hover:bg-[#f2f7f4] transition-colors cursor-pointer"
          >
            <HugeIcon icon={MoreHorizontalIcon} size={17} />
          </button>
        </div>
      </div>

      {/* 2. Messages Body */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        id="crm-chat-messages-container"
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-3.5 bg-[radial-gradient(#e1ece6_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {/* Date Divider Badge */}
        <div className="flex justify-center my-1 select-none">
          <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-[#607469] border border-[#e3ebe6] shadow-2xs">
            Hoje
          </span>
        </div>

        {/* Message Thread */}
        {messages.map((msg) => {
          const isOutbound = !msg.isFromLead;
          const isSticker = msg.type === 'sticker';

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[88%] sm:max-w-[75%] ${
                isOutbound ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              {isSticker ? (
                /* Sticker: Transparent render without bubble frame */
                <div className="flex flex-col items-end">
                  {msg.mediaUrl && (
                    <MediaMessage
                      type="sticker"
                      mediaUrl={msg.mediaUrl}
                      isOutbound={isOutbound}
                      senderName={msg.senderName}
                    />
                  )}
                  <span className="text-[10px] text-[#82968b] pr-1">{msg.time}</span>
                </div>
              ) : (
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs transition-all relative ${
                    isOutbound
                      ? 'bg-[#d8edd9] text-[#133325] rounded-br-xs border border-[#c1e2c6]'
                      : 'bg-white text-[#182a21] rounded-bl-xs border border-[#e4ebe6]'
                  }`}
                >
                  {/* For WhatsApp Groups: render sender participant name & phone number */}
                  {!isOutbound && (contact.isGroup || msg.isGroup || msg.senderPhone) && (
                    <div className="flex items-center flex-wrap gap-1.5 pb-1 mb-1.5 border-b border-[#edf3ef] text-[11px]">
                      <span className="font-bold text-[#14532d]">
                        {msg.senderName && msg.senderName !== 'Contato'
                          ? msg.senderName
                          : msg.senderPhone || 'Participante'}
                      </span>
                      {msg.senderPhone && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#305c44] bg-[#eef6f1] border border-[#d2e4d9] px-1.5 py-0.5 rounded-md">
                          <HugeIcon icon={TelephoneIcon} size={10} />
                          <span>{msg.senderPhone}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rich Media rendering (image, video, audio, document) */}
                  {msg.type !== 'text' && msg.mediaUrl && (
                    <div className="mb-2">
                      <MediaMessage
                        type={msg.type}
                        mediaUrl={msg.mediaUrl}
                        caption={msg.caption}
                        fileName={msg.fileName}
                        fileSize={msg.fileSize}
                        duration={msg.duration}
                        isOutbound={isOutbound}
                        senderName={msg.senderName}
                      />
                    </div>
                  )}

                  {/* Text Message (only if not already captioned in media) */}
                  {msg.text && (!msg.mediaUrl || (msg.type !== 'image' && msg.type !== 'video')) && (
                    <p className="whitespace-pre-wrap select-text">{msg.text}</p>
                  )}

                  {/* Timestamp & Status Icon */}
                  <div
                    className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${
                      isOutbound ? 'text-[#386b52]' : 'text-[#82968b]'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {isOutbound && (
                      <span className="text-sky-600">
                        <HugeIcon icon={DoubleCheckIcon} size={13} strokeWidth={2.2} />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Real Typing Indicator (Only displayed when real typing presence event exists) */}
        {isTyping && (
          <div className="self-start flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-2xl border border-[#e4ebe6] shadow-2xs animate-in fade-in duration-150">
            <span className="text-[11px] text-[#64796e] font-medium">digitando</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Discrete Floating New Messages Indicator */}
      {unreadNewMessagesCount > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 sm:right-8 z-30 flex items-center gap-1.5 px-3.5 py-1.5 bg-[#12382c] hover:bg-[#1a4a3b] text-white text-xs font-semibold rounded-full shadow-lg border border-[#2d5748] transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span>↓ Novas mensagens</span>
          {unreadNewMessagesCount > 1 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              {unreadNewMessagesCount}
            </span>
          )}
        </button>
      )}

      {/* 3. Bottom Message Composer */}
      <div
        id="crm-chat-bottom-bar"
        className="p-3 sm:p-4 bg-white border-t border-[#eaefec] flex flex-col gap-2.5 shrink-0 z-10"
      >
        {/* Top Input Bar */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-[#f6f9f7] rounded-2xl p-1.5 border border-[#e3ebe6] focus-within:border-[#b8d1c4] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#12382c]/10 transition-all"
        >
          {/* Emoji button */}
          <button
            type="button"
            aria-label="Inserir emoji"
            onClick={() => setInputText((prev) => prev + ' 😊')}
            className="p-2 text-[#64796e] hover:text-[#12382c] rounded-xl hover:bg-[#edf4f0] transition-colors cursor-pointer"
          >
            <HugeIcon icon={EmojiIcon} size={20} />
          </button>

          <input
            type="text"
            id="crm-message-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 px-2 py-1.5 bg-transparent text-xs sm:text-[13px] text-[#152e22] placeholder-[#7d9186] outline-hidden"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Enviar mensagem"
            className="w-9 h-9 rounded-xl bg-[#12382c] hover:bg-[#1a4b3b] disabled:opacity-50 disabled:hover:bg-[#12382c] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
          >
            <HugeIcon icon={SentIcon} size={17} />
          </button>
        </form>

        {/* Quick Reply Chips Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickReply(reply)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#f1f6f3] text-[#4d6356] hover:bg-[#e4ece7] hover:text-[#12382c] transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              {reply}
            </button>
          ))}

          <button
            type="button"
            aria-label="Adicionar resposta rápida"
            onClick={() => {
              const custom = prompt('Nova resposta rápida:');
              if (custom) handleQuickReply(custom);
            }}
            className="w-6 h-6 rounded-full bg-[#f1f6f3] text-[#4d6356] hover:bg-[#e4ece7] hover:text-[#12382c] flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <HugeIcon icon={PlusIcon} size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
