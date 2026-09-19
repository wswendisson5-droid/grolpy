import React from 'react';
import { Megaphone, Sparkles, ArrowUpRight, Zap } from 'lucide-react';

interface ClientBannerProps {
  userName?: string;
  onNewCampaign?: () => void;
}

export const ClientBanner: React.FC<ClientBannerProps> = ({ userName = 'Empreendedor', onNewCampaign }) => {
  return (
    <div
      id="client-hero-banner"
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs border border-[#dce8e0] bg-gradient-to-r from-[#0d6e3e] via-[#109353] to-[#17a861] text-white p-5 sm:p-7 select-none"
    >
      {/* Subtle modern geometric background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-xl pointer-events-none -mb-20" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        {/* Left Side: Clean Typography & Greeting */}
        <div className="flex flex-col max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-[11px] font-bold tracking-wide w-fit mb-2">
            <Sparkles size={12} className="text-emerald-200" />
            <span>Painel de Divulgação Inteligente</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
            Olá, {userName}! Divulgue no piloto automático
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1.5 font-medium leading-relaxed">
            Alcance milhares de clientes qualificados em grupos selecionados do WhatsApp todos os dias com pontualidade e relatórios em tempo real.
          </p>
        </div>

        {/* Right Side: Quick Action or Status */}
        {onNewCampaign && (
          <button
            onClick={onNewCampaign}
            className="px-5 py-3 rounded-xl bg-white text-[#0d6e3e] hover:bg-emerald-50 text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Megaphone size={16} />
            <span>Criar Divulgação</span>
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

