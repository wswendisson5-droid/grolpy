import React, { useState, useEffect } from 'react';
import {
  Send,
  BarChart3,
  Crown,
  Check,
  Lock,
  Headphones,
  Users,
  MessageSquare,
  History,
  Clock,
  Calendar,
  Mail,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { planService, PlanId, PlanConfig, PLANS } from '../../../services/planService';

interface ClientPlanosViewProps {
  onOpenSupport?: () => void;
  onPlanChanged?: (newPlanId: PlanId) => void;
  onOpenCheckout?: (planId: PlanId) => void;
  publicMode?: boolean;
}

export const ClientPlanosView: React.FC<ClientPlanosViewProps> = ({
  onOpenSupport,
  onPlanChanged,
  onOpenCheckout,
  publicMode = false,
}) => {
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>(planService.getSubscription().planId);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const unsub = planService.subscribe(() => {
      setCurrentPlanId(planService.getSubscription().planId);
    });
    return unsub;
  }, []);

  const handleSelectPlan = async (planId: PlanId) => {
    if (onOpenCheckout) {
      onOpenCheckout(planId);
      return;
    }

    if (planId === currentPlanId) return;

    const res = await planService.setPlan(planId);
    if (res.success) {
      setCurrentPlanId(planId);
      const isUpgrade = PLANS[planId].maxGroups > PLANS[currentPlanId].maxGroups;
      setFeedbackMessage({
        type: 'success',
        text: isUpgrade
          ? `Parabéns! Você fez upgrade para o Plano ${PLANS[planId].name}. Seus novos limites foram liberados imediatamente.`
          : `Plano alterado para ${PLANS[planId].name}. Seus dados foram preservados e novos limites foram atualizados.`,
      });
      onPlanChanged && onPlanChanged(planId);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const faqs = [
    {
      q: 'Como funcionam os grupos em automações?',
      a: 'O limite do seu plano representa o total de grupos únicos participando de divulgações ativas ou programadas. O mesmo grupo em duas divulgações consome apenas 1 grupo do seu plano.',
    },
    {
      q: 'O que são rodadas de envio?',
      a: 'É a quantidade máxima de envios que um mesmo grupo pode receber por dia. No Start é 1 envio/dia, no Pro são 2 envios/dia e no Max são até 3 envios/dia.',
    },
    {
      q: 'Posso alterar de plano depois?',
      a: 'Sim! No upgrade seus limites aumentam instantaneamente. No downgrade, suas divulgações e histórico existentes não são apagados, apenas bloqueando novas ativações até se adequar.',
    },
    {
      q: 'Há limite de grupos por conta do WhatsApp?',
      a: 'Não. Você pode ter centenas de grupos conectados no seu WhatsApp. O limite do plano se aplica apenas à quantidade de grupos únicos selecionados em automações ativas.',
    },
    {
      q: 'O que acontece se eu atingir o limite do plano?',
      a: 'O sistema avisa você com clareza. Você poderá remover grupos de automações antigas ou fazer upgrade com 1 clique para continuar.',
    },
    {
      q: 'Como funciona o cancelamento?',
      a: 'Sem fidelidade. Você pode pausar ou cancelar quando quiser diretamente no painel ou com nosso suporte, sem multas ou taxas ocultas.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16 font-sans">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-xs animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-[#eaf6ef] text-[#109353] border border-[#c4e6ce]'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP PRICING CARDS ROW (Exact match to image 1) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* CARD 1: START */}
        <div
          id="plan-card-start"
          className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
        >
          <div className="flex flex-col gap-5">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#f0f4f1] text-[#2d4036] flex items-center justify-center">
                <Send size={20} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-extrabold text-[#11241c]">Start</h3>
                <span className="text-xs text-[#63756b]">Comece a divulgar</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 text-[#11241c]">
              <span className="text-sm font-extrabold">R$</span>
              <span className="text-3xl sm:text-4xl font-black tracking-tight">39,90</span>
              <span className="text-xs font-semibold text-[#63756b]">/ mês</span>
            </div>

            {/* Features */}
            <div className="flex flex-col gap-2.5 pt-2 text-xs text-[#20362c]">
              <div className="flex items-center gap-2.5">
                <Users size={15} className="text-[#63756b] shrink-0" />
                <span><strong>20</strong> grupos em automações</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Send size={15} className="text-[#63756b] shrink-0" />
                <span><strong>1</strong> envio por dia (1 rodada)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageSquare size={15} className="text-[#63756b] shrink-0" />
                <span>Até <strong>600</strong> envios por mês</span>
              </div>
              <div className="flex items-center gap-2.5">
                <History size={15} className="text-[#63756b] shrink-0" />
                <span><strong>2</strong> divulgações ativas</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={15} className="text-[#63756b] shrink-0" />
                <span>Histórico de <strong>7 dias</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar size={15} className="text-[#63756b] shrink-0" />
                <span>Agendamento de envios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-[#63756b] shrink-0" />
                <span>Suporte por e-mail</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {!publicMode && currentPlanId === 'start' ? (
              <button
                disabled
                className="w-full py-2.5 bg-[#e8f7ee] text-[#109353] font-extrabold text-xs sm:text-sm rounded-2xl border border-[#bce8cc] text-center"
              >
                Plano atual
              </button>
            ) : (
              <button
                onClick={() => handleSelectPlan('start')}
                className="w-full py-2.5 bg-white hover:bg-[#f7faf8] text-[#11241c] font-extrabold text-xs sm:text-sm rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
              >
                Assinar plano
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: PRO (Featured Dark Green Card from Reference Image) */}
        <div
          id="plan-card-pro"
          className="bg-[#062c20] text-white rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-lg relative border border-[#0d4432] ring-2 ring-[#00c968]/30"
        >
          {/* Badge "Plano atual" */}
          {!publicMode && currentPlanId === 'pro' && (
            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-[#34d399] text-[#062c20] text-[11px] font-extrabold">
              Plano atual
            </div>
          )}

          <div className="flex flex-col gap-5">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0b3d2c] text-[#34d399] flex items-center justify-center">
                <BarChart3 size={20} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-extrabold text-white">Pro</h3>
                <span className="text-xs text-[#a3d9be]">Mais resultados</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 text-white">
              <span className="text-sm font-extrabold">R$</span>
              <span className="text-3xl sm:text-4xl font-black tracking-tight">69,90</span>
              <span className="text-xs font-semibold text-[#a3d9be]">/ mês</span>
            </div>

            {/* Features (Green checkmarks) */}
            <div className="flex flex-col gap-2.5 pt-2 text-xs text-[#e1f5eb]">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#10b981] text-[#062c20] flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span><strong>45</strong> grupos em automações</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#10b981] text-[#062c20] flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span><strong>2</strong> envios por dia (2 rodadas)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#10b981] text-[#062c20] flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Até <strong>2.700</strong> envios por mês</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#10b981] text-[#062c20] flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span><strong>5</strong> divulgações ativas</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#10b981] text-[#062c20] flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Histórico de <strong>30 dias</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#10b981] text-[#062c20] flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Agendamento de envios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#10b981] text-[#062c20] flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Suporte prioritário</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {!publicMode && currentPlanId === 'pro' ? (
              <button
                disabled
                className="w-full py-2.5 bg-[#00c968] text-[#04261b] font-black text-xs sm:text-sm rounded-2xl shadow-xs text-center cursor-default"
              >
                Plano atual
              </button>
            ) : (
              <button
                onClick={() => handleSelectPlan('pro')}
                className="w-full py-2.5 bg-[#00c968] hover:bg-[#00b35c] text-[#04261b] font-black text-xs sm:text-sm rounded-2xl transition-all cursor-pointer text-center"
              >
                Assinar plano
              </button>
            )}
          </div>
        </div>

        {/* CARD 3: MAX */}
        <div
          id="plan-card-max"
          className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
        >
          <div className="flex flex-col gap-5">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#f0f4f1] text-[#2d4036] flex items-center justify-center">
                <Crown size={20} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-extrabold text-[#11241c]">Max</h3>
                <span className="text-xs text-[#63756b]">Sem limites para crescer</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 text-[#11241c]">
              <span className="text-sm font-extrabold">R$</span>
              <span className="text-3xl sm:text-4xl font-black tracking-tight">119,90</span>
              <span className="text-xs font-semibold text-[#63756b]">/ mês</span>
            </div>

            {/* Features */}
            <div className="flex flex-col gap-2.5 pt-2 text-xs text-[#20362c]">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span><strong>90</strong> grupos em automações</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span><strong>3</strong> envios por dia (3 rodadas)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Até <strong>8.100</strong> envios por mês</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span><strong>10</strong> divulgações ativas</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Histórico de <strong>90 dias</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Agendamento de envios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Suporte VIP</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {!publicMode && currentPlanId === 'max' ? (
              <button
                disabled
                className="w-full py-2.5 bg-[#e8f7ee] text-[#109353] font-extrabold text-xs sm:text-sm rounded-2xl border border-[#bce8cc] text-center"
              >
                Plano atual
              </button>
            ) : (
              <button
                onClick={() => handleSelectPlan('max')}
                className="w-full py-2.5 bg-white hover:bg-[#f7faf8] text-[#11241c] font-extrabold text-xs sm:text-sm rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
              >
                Assinar plano
              </button>
            )}
          </div>
        </div>

        {/* CARD 4: TODOS OS PLANOS INCLUEM */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] flex flex-col justify-between shadow-2xs">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-[#11241c]">Todos os planos incluem</h3>

            <div className="flex flex-col gap-2.5 text-xs text-[#20362c]">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Conexão com WhatsApp</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Criação de divulgações</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Agendamento de envios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Relatórios de desempenho</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Segurança e estabilidade</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0 font-bold">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Suporte especializado</span>
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-[#f0f4f1] pt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#f5f8f6] text-[#2d4036] flex items-center justify-center shrink-0">
                <Lock size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#11241c]">Sem fidelidade</span>
                <span className="text-[11px] text-[#63756b]">Cancele quando quiser.</span>
              </div>
            </div>

            {/* Support section */}
            <div className="border-t border-[#f0f4f1] pt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#f5f8f6] text-[#2d4036] flex items-center justify-center shrink-0">
                <Headphones size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#11241c]">Precisa de ajuda?</span>
                <span className="text-[11px] text-[#63756b]">Fale com nosso time</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onOpenSupport}
              className="w-full py-2 bg-white hover:bg-[#f7faf8] text-[#11241c] font-bold text-xs rounded-2xl border border-[#d5ded8] transition-all cursor-pointer text-center"
            >
              Abrir suporte
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BOTTOM SECTION: COMPARISON TABLE + FAQS & BANNER */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: COMPARE OS PLANOS TABLE (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] shadow-2xs flex flex-col gap-4">
          <h3 className="text-base sm:text-lg font-extrabold text-[#11241c]">
            Compare os planos
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#f0f4f1] text-[#63756b] font-bold">
                  <th className="py-3 px-2">Recursos</th>
                  <th className="py-3 px-2 text-center">Start</th>
                  <th className="py-3 px-2 text-center text-[#109353]">Pro</th>
                  <th className="py-3 px-2 text-center">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f4f1] text-[#20362c]">
                <tr>
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    <Users size={15} className="text-[#63756b]" />
                    <span>Grupos em automações</span>
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold">20</td>
                  <td className="py-3 px-2 text-center font-extrabold text-[#109353] bg-[#f2faf5]">45</td>
                  <td className="py-3 px-2 text-center font-extrabold">90</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    <Send size={15} className="text-[#63756b]" />
                    <span>Envios por dia (rodadas)</span>
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold">1</td>
                  <td className="py-3 px-2 text-center font-extrabold text-[#109353] bg-[#f2faf5]">2</td>
                  <td className="py-3 px-2 text-center font-extrabold">3</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    <BarChart3 size={15} className="text-[#63756b]" />
                    <span>Envios por mês (até)</span>
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold">600</td>
                  <td className="py-3 px-2 text-center font-extrabold text-[#109353] bg-[#f2faf5]">2.700</td>
                  <td className="py-3 px-2 text-center font-extrabold">8.100</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    <History size={15} className="text-[#63756b]" />
                    <span>Divulgações ativas</span>
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold">2</td>
                  <td className="py-3 px-2 text-center font-extrabold text-[#109353] bg-[#f2faf5]">5</td>
                  <td className="py-3 px-2 text-center font-extrabold">10</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    <Clock size={15} className="text-[#63756b]" />
                    <span>Histórico de envios</span>
                  </td>
                  <td className="py-3 px-2 text-center font-bold">7 dias</td>
                  <td className="py-3 px-2 text-center font-bold text-[#109353] bg-[#f2faf5]">30 dias</td>
                  <td className="py-3 px-2 text-center font-bold">90 dias</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    <Calendar size={15} className="text-[#63756b]" />
                    <span>Agendamento de envios</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="w-4 h-4 mx-auto rounded-full bg-[#109353] text-white flex items-center justify-center font-bold">
                      <Check size={11} className="stroke-[3]" />
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center bg-[#f2faf5]">
                    <div className="w-4 h-4 mx-auto rounded-full bg-[#109353] text-white flex items-center justify-center font-bold">
                      <Check size={11} className="stroke-[3]" />
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="w-4 h-4 mx-auto rounded-full bg-[#109353] text-white flex items-center justify-center font-bold">
                      <Check size={11} className="stroke-[3]" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    <Headphones size={15} className="text-[#63756b]" />
                    <span>Suporte</span>
                  </td>
                  <td className="py-3 px-2 text-center font-semibold">E-mail</td>
                  <td className="py-3 px-2 text-center font-bold text-[#109353] bg-[#f2faf5]">Prioritário</td>
                  <td className="py-3 px-2 text-center font-bold">VIP</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: FAQ ACCORDION + BANNER (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* FAQ Accordion */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e5ebe7] shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[#11241c]">
                Dúvidas frequentes
              </h3>
              <button
                onClick={() => setActiveFaq(activeFaq === null ? 0 : null)}
                className="px-3 py-1 bg-[#f0f4f1] hover:bg-[#e4ede8] text-[#2d4036] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            <div className="flex flex-col divide-y divide-[#f0f4f1]">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-2 text-left text-xs sm:text-[13px] font-semibold text-[#11241c] hover:text-[#109353] transition-colors cursor-pointer py-1"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp size={16} className="text-[#109353] shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-[#718579] shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <p className="pt-2 text-xs text-[#596d62] leading-relaxed animate-in fade-in duration-150">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dark Green Promo Banner */}
          <div className="bg-[#062c20] text-white rounded-3xl p-5 sm:p-6 border border-[#0d4432] shadow-md flex items-center justify-between gap-4 overflow-hidden relative">
            <div className="flex flex-col gap-1.5 z-10">
              <h4 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Mais resultados
                <br />
                com menos esforço.
              </h4>
              <div className="w-8 h-1 bg-[#00c968] rounded-full mt-1" />
            </div>

            {/* Smartphone visual badge */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="w-20 h-28 bg-[#093527] rounded-2xl border-2 border-[#13503b] p-1.5 shadow-2xl flex flex-col items-center justify-between">
                <div className="w-6 h-1 bg-white/20 rounded-full" />
                <div className="w-10 h-10 rounded-xl bg-[#00c968] text-[#062c20] flex items-center justify-center shadow-lg">
                  <MessageSquare size={18} className="fill-[#062c20]" />
                </div>
                <span className="text-[9px] font-extrabold text-[#34d399] tracking-wider">
                  groply
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
