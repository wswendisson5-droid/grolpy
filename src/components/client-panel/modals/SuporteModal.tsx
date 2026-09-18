import React from 'react';
import { X, Headphones, MessageSquare, Mail, ExternalLink } from 'lucide-react';

interface SuporteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuporteModal: React.FC<SuporteModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e5ebe7] shadow-2xl p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold">
              <Headphones size={22} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-[#11241c]">Central de Ajuda & Suporte</h3>
              <p className="text-xs text-[#63756b]">Equipe pronta para te auxiliar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5">
          <a
            href="https://wa.me/5548991060629?text=Ol%C3%A1%2C+preciso+de+suporte+com+o+Grouply"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-2xl bg-[#f0f9f4] hover:bg-[#e4f4ec] border border-[#d2eadc] flex items-center justify-between transition-colors text-xs sm:text-sm font-bold text-[#0e7440]"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare size={18} />
              <span>Chamar Suporte no WhatsApp</span>
            </div>
            <ExternalLink size={16} />
          </a>

          <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2eae5] flex items-center gap-2.5 text-xs text-[#485c51]">
            <Mail size={16} className="text-[#109353]" />
            <span>suporte@divulgazap.com.br</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#f0f4f1] hover:bg-[#e4ece7] text-[#2d4237] font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
