import React from 'react';
import { X, Crown, Check, Zap, Sparkles, ArrowUpRight } from 'lucide-react';
import { planService } from '../../../services/planService';

interface PlanoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export const PlanoModal: React.FC<PlanoModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  const subscription = planService.getSubscription();
  const currentPlan = subscription.plan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e5ebe7] shadow-2xl p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f1]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              subscription.status === 'active' && subscription.planId ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#fee2e2] text-[#b91c1c]'
            }`}>
              <Crown size={22} className={subscription.status === 'active' && subscription.planId ? 'fill-[#b45309]' : 'fill-[#b91c1c]'} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-[#11241c]">
                {subscription.status === 'active' && subscription.planId ? `Plano ${currentPlan.name} Ativo` : 'Sem Plano Ativo'}
              </h3>
              <p className="text-xs text-[#63756b]">
                {subscription.status === 'active' && subscription.validUntil ? `Renovação em ${subscription.validUntil}` : 'Assinatura pendente ou não iniciada'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#788a80] hover:bg-[#f0f5f2] hover:text-[#11241c] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Benefits list */}
        <div className="flex flex-col gap-2.5 bg-[#fafcfb] p-4 rounded-2xl border border-[#e6eee8] text-xs">
          <div className="flex items-center gap-2 text-[#20362c]">
            <Check size={16} className="text-[#109353]" />
            <span className="font-semibold">{currentPlan.maxGroups} grupos únicos em automações ativas</span>
          </div>
          <div className="flex items-center gap-2 text-[#20362c]">
            <Check size={16} className="text-[#109353]" />
            <span className="font-semibold">{currentPlan.maxRoundsPerDay} envios por dia ({currentPlan.maxRoundsPerDay} rodadas)</span>
          </div>
          <div className="flex items-center gap-2 text-[#20362c]">
            <Check size={16} className="text-[#109353]" />
            <span className="font-semibold">Até {currentPlan.maxMonthlySends.toLocaleString('pt-BR')} envios por mês</span>
          </div>
          <div className="flex items-center gap-2 text-[#20362c]">
            <Check size={16} className="text-[#109353]" />
            <span className="font-semibold">{currentPlan.maxActiveCampaigns} divulgações simultâneas ativas</span>
          </div>
          <div className="flex items-center gap-2 text-[#20362c]">
            <Check size={16} className="text-[#109353]" />
            <span className="font-semibold">Histórico de {currentPlan.historyDays} dias</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {onUpgrade && (
            <button
              onClick={() => {
                onClose();
                onUpgrade();
              }}
              className="flex-1 py-2.5 bg-[#00874e] hover:bg-[#007543] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Fazer Upgrade / Renovar</span>
              <ArrowUpRight size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-[#f7faf8] text-[#11241c] font-bold text-xs sm:text-sm rounded-xl border border-[#d5ded8] transition-all cursor-pointer text-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

