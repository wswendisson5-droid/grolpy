import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { PlanId } from '../../../services/planService';

interface ClientPlanosViewProps {
  onOpenSupport?: () => void;
  onPlanChanged?: (newPlanId: PlanId) => void;
  onOpenCheckout?: (planId: PlanId) => void;
  publicMode?: boolean;
}

export const ClientPlanosView: React.FC<ClientPlanosViewProps> = ({ onOpenCheckout }) => {
  const selectPlan = () => onOpenCheckout?.('start');

  return (
    <div className="flex-1 w-full max-w-xl mx-auto pb-16 font-sans">
      <div className="text-center mb-7">
        <h1 className="text-2xl sm:text-3xl font-black text-[#11241c]">Assine a Groply</h1>
        <p className="text-sm text-[#64786d] mt-2">Um plano simples. Tudo que você precisa para divulgar.</p>
      </div>

      <div className="bg-white rounded-3xl border border-[#dfe8e2] shadow-sm p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#109353]">Assinatura mensal</span>
            <h2 className="text-xl font-black text-[#11241c] mt-1">Groply</h2>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-[#11241c]">R$ 14,90</div>
            <div className="text-xs text-[#64786d]">por mês</div>
          </div>
        </div>        <div className="my-6 h-px bg-[#edf2ef]" />
        <div className="space-y-3 text-sm text-[#30463a]">
          {[
            'Divulgações e agendamentos sem limite interno por plano',
            'Conexão com seus grupos do WhatsApp',
            'Histórico e relatórios de envios',
            'Cancele quando quiser',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f7ee] text-[#109353] flex items-center justify-center shrink-0">
                <Check size={13} strokeWidth={3} />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#fff8e8] border border-[#f1dfad] px-4 py-3 text-xs leading-relaxed text-[#725b1a]">
          Evite envios excessivos ou repetitivos. O WhatsApp pode aplicar restrições ao número em caso de abuso.
        </div>

        <button
          onClick={selectPlan}
          className="mt-6 w-full min-h-12 rounded-2xl bg-[#109353] hover:bg-[#0c7a44] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          Selecionar plano
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
};
