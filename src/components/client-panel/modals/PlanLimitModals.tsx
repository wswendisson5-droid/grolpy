import React from 'react';
import {
  X,
  Users,
  Send,
  Layers,
  Clock,
  Calendar,
  Crown,
  Lock,
  RotateCw,
  Zap,
  ArrowUpRight,
  Info,
  Check,
  BarChart3,
  MessageSquare,
} from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

// -------------------------------------------------------------
// MODAL 1: Limite de grupos atingido
// -------------------------------------------------------------
interface GroupLimitModalProps extends BaseModalProps {
  planName?: string;
  limit?: number;
  used?: number;
  onManageCampaigns?: () => void;
}

export const GroupLimitModal: React.FC<GroupLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  planName = 'Start',
  limit = 20,
  used = 20,
  onManageCampaigns,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e2eae5] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 relative animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon with yellow exclamation badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#e8f7ee] text-[#109353] flex items-center justify-center relative shrink-0">
          <Users size={26} className="stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#f59e0b] text-white flex items-center justify-center font-black text-xs ring-2 ring-white">
            !
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#11241c] tracking-tight">
            Limite de grupos atingido
          </h3>
          <p className="text-xs sm:text-[13px] text-[#55695e] leading-relaxed">
            Seu plano atual permite até {limit} grupos únicos em automações. Você já está utilizando todos os grupos disponíveis.
          </p>
        </div>

        {/* Usage Progress Card */}
        <div className="bg-[#fafcfb] p-3.5 rounded-2xl border border-[#e2eae5] flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#11241c]">
            <Users size={17} className="text-[#109353]" />
            <span>
              <strong className="font-extrabold">{used} de {limit}</strong> grupos utilizados
            </span>
          </div>
          <div className="w-full bg-[#e2ebe6] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#109353] h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%` }}
            />
          </div>
        </div>

        {/* Tip Box */}
        <div className="flex items-start gap-2.5 text-xs text-[#5d7165] bg-[#f4f7f5] p-3 rounded-2xl border border-[#e5ebe7]">
          <Info size={16} className="text-[#788c80] shrink-0 mt-0.5" />
          <p className="leading-snug">
            Dica: você pode remover grupos de divulgações existentes ou fazer upgrade para continuar.
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              onClose();
              onManageCampaigns && onManageCampaigns();
            }}
            className="w-full py-2.5 px-3 bg-white hover:bg-[#f5f8f6] text-[#2d4036] text-xs sm:text-sm font-bold rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
          >
            Gerenciar divulgações
          </button>
          <button
            onClick={() => {
              onClose();
              onUpgrade();
            }}
            className="w-full py-2.5 px-3 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight size={16} />
            <span>Fazer upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MODAL 2: Limite de envios do mês atingido
// -------------------------------------------------------------
interface MonthlySendsLimitModalProps extends BaseModalProps {
  used?: number;
  limit?: number;
  renewalDate?: string;
}

export const MonthlySendsLimitModal: React.FC<MonthlySendsLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  used = 600,
  limit = 600,
  renewalDate = 'Próximo mês',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e2eae5] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon: Red Send with red exclamation */}
        <div className="w-14 h-14 rounded-2xl bg-[#fee2e2] text-[#ef4444] flex items-center justify-center relative shrink-0">
          <Send size={24} className="stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center font-black text-xs ring-2 ring-white">
            !
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#11241c] tracking-tight">
            Limite de envios do mês atingido
          </h3>
          <p className="text-xs sm:text-[13px] text-[#55695e] leading-relaxed">
            Você atingiu o limite de envios do seu plano. Seus envios serão liberados novamente no próximo ciclo ou você pode fazer um upgrade para continuar divulgando agora.
          </p>
        </div>

        {/* Usage Box with red bar */}
        <div className="bg-[#fafcfb] p-3.5 rounded-2xl border border-[#e2eae5] flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#11241c]">
            <BarChart3 size={17} className="text-[#ef4444]" />
            <span>
              <strong className="font-extrabold">{used.toLocaleString('pt-BR')} de {limit.toLocaleString('pt-BR')}</strong> envios utilizados
            </span>
          </div>
          <div className="w-full bg-[#fde8e8] h-2.5 rounded-full overflow-hidden">
            <div className="bg-[#ef4444] h-full rounded-full w-full" />
          </div>
        </div>

        {/* Renewal card */}
        <div className="flex items-center gap-3 text-xs bg-[#fef2f2] p-3.5 rounded-2xl border border-[#fecaca]">
          <Calendar size={20} className="text-[#dc2626] shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-[#991b1b]">
              Próxima renovação em {renewalDate}
            </span>
            <span className="text-[11px] text-[#b91c1c]">
              Se preferir, faça um upgrade e continue hoje mesmo.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-3 bg-white hover:bg-[#f5f8f6] text-[#2d4036] text-xs sm:text-sm font-bold rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
          >
            Aguardar renovação
          </button>
          <button
            onClick={() => {
              onClose();
              onUpgrade();
            }}
            className="w-full py-2.5 px-3 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Zap size={16} />
            <span>Fazer upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MODAL 3: Limite de divulgações atingido
// -------------------------------------------------------------
interface CampaignsLimitModalProps extends BaseModalProps {
  limit?: number;
  used?: number;
  onManageCampaigns?: () => void;
}

export const CampaignsLimitModal: React.FC<CampaignsLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  limit = 2,
  used = 2,
  onManageCampaigns,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e2eae5] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon: Orange Layers */}
        <div className="w-14 h-14 rounded-2xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center relative shrink-0">
          <Layers size={24} className="stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#f59e0b] text-white flex items-center justify-center font-black text-xs ring-2 ring-white">
            !
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#11241c] tracking-tight">
            Limite de divulgações atingido
          </h3>
          <p className="text-xs sm:text-[13px] text-[#55695e] leading-relaxed">
            Seu plano permite até {limit} divulgações ativas. Você já está com o limite máximo de divulgações neste momento.
          </p>
        </div>

        {/* Usage bar */}
        <div className="bg-[#fafcfb] p-3.5 rounded-2xl border border-[#e2eae5] flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#11241c]">
            <Layers size={17} className="text-[#ea580c]" />
            <span>
              <strong className="font-extrabold">{used} de {limit}</strong> divulgações ativas
            </span>
          </div>
          <div className="w-full bg-[#ffedd5] h-2.5 rounded-full overflow-hidden">
            <div className="bg-[#f59e0b] h-full rounded-full w-full" />
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2.5 text-xs text-[#5d7165] bg-[#f4f7f5] p-3 rounded-2xl border border-[#e5ebe7]">
          <Info size={16} className="text-[#788c80] shrink-0 mt-0.5" />
          <p className="leading-snug">
            Você pode pausar uma divulgação existente ou fazer upgrade para criar novas divulgações.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              onClose();
              onManageCampaigns && onManageCampaigns();
            }}
            className="w-full py-2.5 px-3 bg-white hover:bg-[#f5f8f6] text-[#2d4036] text-xs sm:text-sm font-bold rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
          >
            Gerenciar divulgações
          </button>
          <button
            onClick={() => {
              onClose();
              onUpgrade();
            }}
            className="w-full py-2.5 px-3 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight size={16} />
            <span>Fazer upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MODAL 4: Limite diário atingido para este grupo
// -------------------------------------------------------------
interface DailyRoundsLimitModalProps extends BaseModalProps {
  groupName?: string;
  currentRounds?: number;
  limit?: number;
  lastSentTime?: string;
  onChangeSchedule?: () => void;
}

export const DailyRoundsLimitModal: React.FC<DailyRoundsLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  groupName = 'Classificados Vitória',
  currentRounds = 1,
  limit = 1,
  lastSentTime = '09:00',
  onChangeSchedule,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e2eae5] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon: Blue Clock */}
        <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center relative shrink-0">
          <Clock size={24} className="stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#f59e0b] text-white flex items-center justify-center font-black text-xs ring-2 ring-white">
            !
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#11241c] tracking-tight">
            Limite diário atingido para este grupo
          </h3>
          <p className="text-xs sm:text-[13px] text-[#55695e] leading-relaxed">
            No seu plano atual, cada grupo pode receber no máximo {limit} envio{limit > 1 ? 's' : ''} por dia. Este grupo já possui um envio programado para hoje.
          </p>
        </div>

        {/* Group target card */}
        <div className="bg-[#fafcfb] p-3 rounded-2xl border border-[#e2eae5] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 text-[#128C7E] flex items-center justify-center shrink-0">
              <MessageSquare size={18} className="fill-[#25D366] stroke-none" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold text-[#11241c] truncate">
                {groupName}
              </span>
              <span className="text-[11px] text-[#6b7e73]">
                Enviado hoje às {lastSentTime}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] text-xs font-extrabold shrink-0">
            {currentRounds}/{limit}
          </span>
        </div>

        <p className="text-xs text-[#5d7165]">
          Você pode alterar a programação ou fazer upgrade para enviar mais vezes por dia.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              onClose();
              onChangeSchedule && onChangeSchedule();
            }}
            className="w-full py-2.5 px-3 bg-white hover:bg-[#f5f8f6] text-[#2d4036] text-xs sm:text-sm font-bold rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
          >
            Alterar programação
          </button>
          <button
            onClick={() => {
              onClose();
              onUpgrade();
            }}
            className="w-full py-2.5 px-3 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight size={16} />
            <span>Fazer upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MODAL 5: Sua assinatura venceu
// -------------------------------------------------------------
interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenew: () => void;
  onViewPlans: () => void;
  expiredDate?: string;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  onRenew,
  onViewPlans,
  expiredDate = 'Recente',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e2eae5] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon: Red calendar with red X */}
        <div className="w-14 h-14 rounded-2xl bg-[#fee2e2] text-[#ef4444] flex items-center justify-center relative shrink-0">
          <Calendar size={24} className="stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center font-black text-xs ring-2 ring-white">
            ✕
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#11241c] tracking-tight">
            Sua assinatura venceu
          </h3>
          <p className="text-xs sm:text-[13px] text-[#55695e] leading-relaxed">
            Sua assinatura do Groply expirou em {expiredDate}. Para continuar utilizando a plataforma e suas automações, renove seu plano agora mesmo.
          </p>
        </div>

        {/* Alert box */}
        <div className="flex items-start gap-3 bg-[#fff5f5] p-3.5 rounded-2xl border border-[#fecaca] text-xs">
          <Lock size={18} className="text-[#dc2626] shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-bold text-[#991b1b]">Seu acesso está limitado</span>
            <span className="text-[#b91c1c] text-[11px] leading-relaxed">
              Novos envios e automações estão pausados até a renovação da assinatura.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              onClose();
              onViewPlans();
            }}
            className="w-full py-2.5 px-3 bg-white hover:bg-[#f5f8f6] text-[#2d4036] text-xs sm:text-sm font-bold rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
          >
            Ver planos
          </button>
          <button
            onClick={() => {
              onClose();
              onRenew();
            }}
            className="w-full py-2.5 px-3 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCw size={16} />
            <span>Renovar agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MODAL 6: Recurso indisponível no seu plano
// -------------------------------------------------------------
interface FeatureUnavailableModalProps extends BaseModalProps {
  onViewPlans?: () => void;
}

export const FeatureUnavailableModal: React.FC<FeatureUnavailableModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  onViewPlans,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e2eae5] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon: Purple Crown */}
        <div className="w-14 h-14 rounded-2xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center relative shrink-0">
          <Crown size={26} className="stroke-[2.2]" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#11241c] tracking-tight">
            Recurso indisponível no seu plano
          </h3>
          <p className="text-xs sm:text-[13px] text-[#55695e] leading-relaxed">
            Este recurso está disponível apenas nos planos Pro e Max. Faça um upgrade e tenha acesso a mais grupos, mais envios e mais resultados.
          </p>
        </div>

        {/* Checklist */}
        <div className="bg-[#fafcfb] p-3.5 rounded-2xl border border-[#e2eae5] flex flex-col gap-2 text-xs font-semibold text-[#20362c]">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-[#109353] stroke-[3]" />
            <span>Mais grupos em automações</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={16} className="text-[#109353] stroke-[3]" />
            <span>Mais envios por dia</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={16} className="text-[#109353] stroke-[3]" />
            <span>Mais divulgações ativas</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={16} className="text-[#109353] stroke-[3]" />
            <span>Suporte prioritário</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              onClose();
              if (onViewPlans) onViewPlans();
              else onUpgrade();
            }}
            className="w-full py-2.5 px-3 bg-white hover:bg-[#f5f8f6] text-[#2d4036] text-xs sm:text-sm font-bold rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
          >
            Ver todos os planos
          </button>
          <button
            onClick={() => {
              onClose();
              onUpgrade();
            }}
            className="w-full py-2.5 px-3 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight size={16} />
            <span>Fazer upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
};
