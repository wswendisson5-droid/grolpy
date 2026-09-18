import React, { useState } from 'react';
import { CRMContact, CRMNote } from '../../../types/crm';
import { CURRENT_AGENT } from '../../../data/crmMockData';
import {
  HugeIcon,
  BoldIcon,
  ItalicIcon,
  ListIcon,
  AttachmentIcon,
  MoreHorizontalIcon,
} from '../../icons/HugeIcon';

interface NotesTabProps {
  contact: CRMContact;
  onAddNote: (content: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  contact,
  onAddNote,
  onDeleteNote,
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteContent.trim()) return;
    onAddNote(newNoteContent.trim());
    setNewNoteContent('');
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-xs text-[#1e3429]">
      {/* 1. Note Composer Card */}
      <div className="bg-[#f8faf9] rounded-2xl border border-[#e4ece7] p-3 flex flex-col gap-2.5 shadow-2xs">
        <textarea
          rows={3}
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Adicione uma nota sobre o contato..."
          className="w-full bg-transparent text-xs text-[#152c20] placeholder-[#7a8e83] outline-hidden resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-[#e8f0ec]">
          {/* Format Tools */}
          <div className="flex items-center gap-1 text-[#65796f]">
            <button
              type="button"
              aria-label="Negrito"
              onClick={() => setNewNoteContent((prev) => prev + ' **texto**')}
              className="p-1.5 hover:bg-[#ebf3ee] hover:text-[#12382c] rounded-lg transition-colors cursor-pointer"
            >
              <HugeIcon icon={BoldIcon} size={14} />
            </button>
            <button
              type="button"
              aria-label="Itálico"
              onClick={() => setNewNoteContent((prev) => prev + ' *texto*')}
              className="p-1.5 hover:bg-[#ebf3ee] hover:text-[#12382c] rounded-lg transition-colors cursor-pointer"
            >
              <HugeIcon icon={ItalicIcon} size={14} />
            </button>
            <button
              type="button"
              aria-label="Lista"
              onClick={() => setNewNoteContent((prev) => prev + '\n- ')}
              className="p-1.5 hover:bg-[#ebf3ee] hover:text-[#12382c] rounded-lg transition-colors cursor-pointer"
            >
              <HugeIcon icon={ListIcon} size={14} />
            </button>
            <button
              type="button"
              aria-label="Anexo"
              className="p-1.5 hover:bg-[#ebf3ee] hover:text-[#12382c] rounded-lg transition-colors cursor-pointer"
            >
              <HugeIcon icon={AttachmentIcon} size={14} />
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!newNoteContent.trim()}
            className="px-3.5 py-1.5 bg-[#12382c] hover:bg-[#1a4b3b] disabled:opacity-50 disabled:hover:bg-[#12382c] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* 2. Notes List */}
      <div className="flex flex-col divide-y divide-[#f0f4f1] mt-1">
        {contact.notes.length === 0 ? (
          <div className="py-8 text-center text-[#7a8e83]">
            <p className="text-xs">Nenhuma nota adicionada ainda.</p>
          </div>
        ) : (
          contact.notes.map((note) => (
            <div key={note.id} className="py-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={note.author.avatar}
                    alt={note.author.name}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover border border-[#dde7e1]"
                  />
                  <span className="font-bold text-[#142d22] text-xs">
                    {note.author.name}
                  </span>
                  <span className="text-[11px] text-[#7a8e83] font-normal">
                    {note.createdAt}
                  </span>
                </div>

                <div className="relative group">
                  <button
                    aria-label="Opções da nota"
                    className="p-1 text-[#83978c] hover:text-[#12382c] rounded-md transition-colors cursor-pointer"
                  >
                    <HugeIcon icon={MoreHorizontalIcon} size={14} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#2b4134] leading-relaxed pl-7">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
