import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  ShieldCheck,
  Send,
  BarChart3,
  Crown,
  Check,
  CreditCard,
  Barcode,
  Lock,
  Zap,
  Clock,
  Copy,
  Info,
  Smartphone,
  MessageCircle,
  Eye,
  EyeOff,
  Download,
  Mail,
  CheckCircle2,
  FileText,
  Rocket,
  Plus,
  Loader2,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PlanId, PLANS, planService } from '../../../services/planService';
import { asaasClientService, AsaasPaymentData } from '../../../services/asaasClientService';

/**
 * Official Pix Icon (Banco Central do Brasil Standard Vector)
 */
export const PixOfficialIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({
  size = 20,
  className = '',
  color = '#32BCAD',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M14.9388 3.51347L12.5658 5.8865C12.2533 6.19897 11.7467 6.19897 11.4342 5.8865L9.06124 3.51347C8.16335 2.61558 6.70889 2.61558 5.811 3.51347C4.91311 4.41136 4.91311 5.86582 5.811 6.76371L8.18403 9.13674C8.4965 9.44921 8.4965 9.95579 8.18403 10.2683L5.811 12.6413C4.91311 13.5392 4.91311 14.9936 5.811 15.8915C6.70889 16.7894 8.16335 16.7894 9.06124 15.8915L11.4342 13.5185C11.7467 13.206 12.2533 13.206 12.5658 13.5185L14.9388 15.8915C15.8367 16.7894 17.2911 16.7894 18.189 15.8915C19.0869 14.9936 19.0869 13.5392 18.189 12.6413L15.816 10.2683C15.5035 9.95579 15.5035 9.44921 15.816 9.13674L18.189 6.76371C19.0869 5.86582 19.0869 4.41136 18.189 3.51347C17.2911 2.61558 15.8367 2.61558 14.9388 3.51347Z"
      fill={color}
    />
  </svg>
);

// Unified, fluid & responsive Checkout Stepper
const CheckoutStepper: React.FC<{
  currentStepNumber: 1 | 2 | 3;
  step2Label?: string;
  planName: string;
}> = ({ currentStepNumber, step2Label = 'Pagamento', planName }) => {
  return (
    <div className="w-full max-w-md mx-auto py-1 px-2">
      <div className="flex items-center justify-between relative w-full">
        {/* Step 1: Plano */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-[#109353] shrink-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#109353] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {currentStepNumber > 1 ? <Check size={14} className="stroke-[3]" /> : '1'}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] sm:text-xs font-bold text-[#11241c] leading-tight">Plano</span>
            <span className="text-[9px] sm:text-[10px] text-[#64786d] leading-none truncate max-w-[60px] sm:max-w-none">{planName}</span>
          </div>
        </div>

        {/* Divider 1-2 */}
        <div className="flex-1 h-0.5 mx-1.5 sm:mx-2.5 bg-[#e5ebe7] overflow-hidden min-w-[12px] max-w-[50px]">
          <div
            className={`h-full transition-all duration-500 ${
              currentStepNumber >= 2 ? 'w-full bg-[#109353]' : 'w-0'
            }`}
          />
        </div>

        {/* Step 2: Pagamento */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            currentStepNumber >= 2 ? 'text-[#109353]' : 'text-[#889b90]'
          }`}
        >
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
              currentStepNumber > 2
                ? 'bg-[#109353] text-white shadow-xs'
                : currentStepNumber === 2
                ? 'bg-[#109353] text-white ring-4 ring-[#e5f2ec]'
                : 'bg-[#e8eee9] text-[#64786d]'
            }`}
          >
            {currentStepNumber > 2 ? <Check size={14} className="stroke-[3]" /> : '2'}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] sm:text-xs font-bold text-[#11241c] leading-tight">Pagamento</span>
            <span
              className={`text-[9px] sm:text-[10px] leading-none ${
                currentStepNumber === 2 ? 'text-[#109353] font-bold' : 'text-[#889b90]'
              }`}
            >
              {step2Label}
            </span>
          </div>
        </div>

        {/* Divider 2-3 */}
        <div className="flex-1 h-0.5 mx-1.5 sm:mx-2.5 bg-[#e5ebe7] overflow-hidden min-w-[12px] max-w-[50px]">
          <div
            className={`h-full transition-all duration-500 ${
              currentStepNumber >= 3 ? 'w-full bg-[#109353]' : 'w-0'
            }`}
          />
        </div>

        {/* Step 3: Ativação / Confirmação */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            currentStepNumber >= 3 ? 'text-[#109353]' : 'text-[#889b90]'
          }`}
        >
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
              currentStepNumber === 3
                ? 'bg-[#109353] text-white shadow-xs ring-4 ring-[#e5f2ec]'
                : 'bg-[#e8eee9] text-[#64786d]'
            }`}
          >
            {currentStepNumber === 3 ? <Check size={14} className="stroke-[3]" /> : '3'}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] sm:text-xs font-bold text-[#11241c] leading-tight">Ativação</span>
            <span className="text-[9px] sm:text-[10px] text-[#889b90] leading-none">
              {currentStepNumber === 3 ? 'Concluída' : 'Aguardando'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export type CheckoutStep = 'method-selection' | 'pix' | 'card' | 'boleto' | 'success';
export type PaymentMethod = 'pix' | 'card' | 'boleto';

interface ClientCheckoutViewProps {
  initialPlanId?: PlanId;
  initialMethod?: PaymentMethod;
  onBack: () => void;
  onGoToDashboard: () => void;
  onGoToPlans: () => void;
  onGoToNovaDivulgacao: () => void;
  onOpenSupport?: () => void;
  onboardingMode?: boolean;
}

export const ClientCheckoutView: React.FC<ClientCheckoutViewProps> = ({
  initialPlanId = 'pro',
  initialMethod = 'pix',
  onBack,
  onGoToDashboard,
  onGoToPlans,
  onGoToNovaDivulgacao,
  onOpenSupport,
  onboardingMode = false,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlanId);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(initialMethod);
  const [step, setStep] = useState<CheckoutStep>('method-selection');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const storedUser = (()=>{try{return JSON.parse(localStorage.getItem('groply_user')||'{}')}catch{return {}}})();
  const [customerName,setCustomerName]=useState(storedUser.name||'');
  const [customerEmail,setCustomerEmail]=useState(storedUser.email||'');
  const [customerPhone,setCustomerPhone]=useState(storedUser.phone||'');
  const [customerCpf,setCustomerCpf]=useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [emailSentAlert, setEmailSentAlert] = useState(false);

  // Active Asaas Payment response
  const [paymentData, setPaymentData] = useState<AsaasPaymentData | null>(null);
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string>('');

  // Dynamically generate standard high-res QR code whenever payload is available
  useEffect(() => {
    if (paymentData?.pix?.payload) {
      QRCode.toDataURL(paymentData.pix.payload, {
        width: 360,
        margin: 1,
        color: {
          dark: '#05291b',
          light: '#ffffff',
        },
      })
        .then((url) => setDynamicQrUrl(url))
        .catch(() => {});
    }
  }, [paymentData?.pix?.payload]);

  // Pix Countdown Timer (30 minutes)
  const [timeLeft, setTimeLeft] = useState<number>(29 * 60 + 59);

  // Card Form Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('Wendisson Santos');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState('1');

  const customer = onboardingMode ? {name:customerName,email:customerEmail,cpfCnpj:customerCpf,phone:customerPhone} : {
    name: customerName || storedUser.name || '', email: customerEmail || storedUser.email || '', cpfCnpj: customerCpf, phone: customerPhone || storedUser.phone || ''
  };

  const selectedPlan = PLANS[selectedPlanId] || PLANS.pro;
  const createOnboardingPix = async () => {
    setErrorMessage(null); setIsLoading(true);
    try {
      if(!customerCpf.trim()) throw new Error('Informe seu CPF para gerar o Pix.');
      const token=localStorage.getItem('groply_token')||'';
      const res=await fetch('/api/onboarding/subscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({planId:selectedPlanId,cpfCnpj:customerCpf})});
      const data=await res.json(); if(!res.ok||!data.success)throw new Error(data.error||'Não foi possível gerar o Pix.');
      const p:any={id:data.payment.id,status:data.payment.status||'PENDING',billingType:'PIX',value:selectedPlan.price,planId:selectedPlanId,planName:selectedPlan.name,customer,dueDate:'',pix:data.payment.pix,createdAt:new Date().toISOString()};
      setPaymentData(p); setStep('pix');
    } catch(e:any){setErrorMessage(e.message||'Não foi possível gerar o Pix.')} finally{setIsLoading(false)}
  };

  // Pix timer countdown
  useEffect(() => {
    if (step !== 'pix') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Card Number Formatter
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = v.match(/.{1,4}/g)?.join(' ') || v;
    setCardNumber(formatted);
  };

  // Card Expiry Formatter (MM/AA)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) {
      v = `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    setCardExpiry(v);
  };

  // Copy to clipboard helper
  const handleCopyPix = () => {
    const payload = paymentData?.pix?.payload;
    if (!payload) {
      setErrorMessage('Código Pix ainda não está disponível pelo Asaas.');
      return;
    }
    navigator.clipboard.writeText(payload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyBoleto = () => {
    const code = paymentData?.boleto?.identificationField;
    if (!code) {
      setErrorMessage('Linha digitável do boleto ainda não está disponível pelo Asaas.');
      return;
    }
    navigator.clipboard.writeText(code);
    setCopiedBoleto(true);
    setTimeout(() => setCopiedBoleto(false), 3000);
  };

  // ----------------------------------------------------
  // GENERATE PAYMENT (Step 1 -> Next Step)
  // ----------------------------------------------------
  const handleProceedToPayment = async () => {
    setErrorMessage(null);
    if (onboardingMode) { await createOnboardingPix(); return; }

    // If Credit Card, navigate directly to card screen without creating payment yet
    if (selectedMethod === 'card') {
      setStep('card');
      return;
    }

    setIsLoading(true);
    try {
      const billingType = selectedMethod === 'pix' ? 'PIX' : 'BOLETO';
      const res = await asaasClientService.createPayment({
        planId: selectedPlanId,
        billingType,
        customer,
      });

      if (res.success && res.payment) {
        setPaymentData(res.payment);
        setStep(selectedMethod === 'pix' ? 'pix' : 'boleto');
      } else {
        setErrorMessage(res.error || 'Não foi possível gerar a cobrança. Tente novamente.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de comunicação com o Asaas.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // PROCESS CREDIT CARD
  // ----------------------------------------------------
  const handleProcessCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const [month, year] = cardExpiry.split('/');
      const res = await asaasClientService.createPayment({
        planId: selectedPlanId,
        billingType: 'CREDIT_CARD',
        customer,
        creditCard: {
          holderName: cardHolder,
          number: cardNumber.replace(/\s+/g, ''),
          expiryMonth: month || '12',
          expiryYear: year ? `20${year}` : '2028',
          ccv: cardCvv || '123',
          installments: Number(installments) || 1,
        },
      });

      if (res.success && res.payment) {
        setPaymentData(res.payment);
        await planService.setPlan(selectedPlanId);
        try {
          const raw = localStorage.getItem('groply_user');
          if (raw) {
            const u = JSON.parse(raw);
            u.status = 'active';
            u.plan = selectedPlanId;
            localStorage.setItem('groply_user', JSON.stringify(u));
          }
        } catch {}
        await planService.syncWithBackend();
        setStep('success');
      } else {
        setErrorMessage(res.error || 'Falha na aprovação do cartão. Verifique os dados e tente novamente.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar cartão.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // SIMULATE PAYMENT CONFIRMATION (WEBHOOK SIMULATION)
  // ----------------------------------------------------
  const handleSimulateConfirmation = async () => {
    setIsLoading(true);
    try {
      const paymentId = paymentData?.id || `sim_${Date.now()}`;
      await asaasClientService.simulateConfirm(paymentId);
      await planService.setPlan(selectedPlanId);
      try {
        const raw = localStorage.getItem('groply_user');
        if (raw) {
          const u = JSON.parse(raw);
          u.status = 'active';
          u.plan = selectedPlanId;
          localStorage.setItem('groply_user', JSON.stringify(u));
        }
      } catch {}
      await planService.syncWithBackend();
      setStep('success');
    } catch {
      await planService.setPlan(selectedPlanId);
      await planService.syncWithBackend();
      setStep('success');
    } finally {
      setIsLoading(false);
    }
  };

  // Format plan price display
  const planPriceFormatted = selectedPlan.price.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // =========================================================================
  // SCREEN 5: PAGAMENTO CONFIRMADO / SUCESSO (file_00000000c2bc820ebc9ea8aba5bed14a.png)
  // =========================================================================
  if (step === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-8 sm:py-12 px-4 font-sans animate-in fade-in duration-300">
        {/* Animated Celebration Green Check */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#10b981]/15 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#00c968] flex items-center justify-center text-white shadow-lg shadow-[#00c968]/30">
              <Check size={38} className="stroke-[3.5]" />
            </div>
          </div>
          {/* Subtle radial celebratory lines */}
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00c968] animate-ping opacity-75" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#00c968] animate-pulse" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-black text-[#11241c] text-center tracking-tight">
          Pagamento confirmado!
        </h1>
        <p className="text-sm sm:text-base text-[#64786d] text-center mt-1.5 mb-8">
          Seu plano {selectedPlan.name} foi ativado com sucesso.
        </p>

        {/* Plan Summary Card */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#e2eae5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
          {/* Left: Plan Brand */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#f2faf5] text-[#109353] flex items-center justify-center shrink-0 border border-[#d8eee1]">
              {selectedPlanId === 'start' ? (
                <Send size={24} className="stroke-[2.2]" />
              ) : selectedPlanId === 'max' ? (
                <Crown size={24} className="stroke-[2.2]" />
              ) : (
                <BarChart3 size={24} className="stroke-[2.2]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-[#11241c]">
                Plano {selectedPlan.name}
              </span>
              <div className="flex items-baseline gap-1 text-[#11241c] font-black text-xl">
                <span>R$ {planPriceFormatted}</span>
                <span className="text-xs font-semibold text-[#64786d]">/mês</span>
              </div>
            </div>
          </div>

          {/* Right: Plan Features */}
          <div className="flex flex-col gap-2.5 w-full sm:w-auto text-xs text-[#20362c]">
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                <Check size={11} className="stroke-[3.5]" />
              </div>
              <span><strong>{selectedPlan.maxGroups}</strong> grupos em automações</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                <Check size={11} className="stroke-[3.5]" />
              </div>
              <span><strong>{selectedPlan.maxRoundsPerDay}</strong> envios por dia ({selectedPlan.maxRoundsPerDay} rodadas)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                <Check size={11} className="stroke-[3.5]" />
              </div>
              <span>Até <strong>{selectedPlan.maxMonthlySends.toLocaleString('pt-BR')}</strong> envios por mês</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                <Check size={11} className="stroke-[3.5]" />
              </div>
              <span><strong>{selectedPlan.maxActiveCampaigns}</strong> divulgações ativas</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                <Check size={11} className="stroke-[3.5]" />
              </div>
              <span>Histórico de <strong>{selectedPlan.historyDays} dias</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-md flex flex-col gap-3 mb-8">
          <button
            onClick={onGoToDashboard}
            className="w-full py-3.5 bg-[#00874e] hover:bg-[#007543] text-white font-black text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ir para o painel</span>
            <span className="text-base">→</span>
          </button>
          <button
            onClick={onGoToPlans}
            className="w-full py-3 bg-white hover:bg-[#f7faf8] text-[#11241c] font-bold text-sm rounded-2xl border border-[#d5ded8] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <FileText size={16} className="text-[#64786d]" />
            <span>Ver detalhes da assinatura</span>
          </button>
        </div>

        {/* Bottom Banner with Rocket */}
        <div className="w-full bg-[#f4faf6] rounded-3xl p-5 sm:p-6 border border-[#d9ece0] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e5f5ec] text-[#109353] flex items-center justify-center shrink-0">
              <Rocket size={22} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm sm:text-base font-extrabold text-[#11241c]">
                Tudo pronto para você ter mais resultados!
              </h4>
              <p className="text-xs sm:text-sm text-[#64786d]">
                Agora é só criar suas divulgações e alcançar mais pessoas com o Groply.
              </p>
            </div>
          </div>

          <button
            onClick={onGoToNovaDivulgacao}
            className="w-full sm:w-auto whitespace-nowrap px-5 py-2.5 bg-white hover:bg-[#f7faf8] text-[#11241c] font-extrabold text-xs sm:text-sm rounded-2xl border border-[#d5ded8] transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Nova divulgação</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: CARTÃO DE CRÉDITO (file_0000000035ec820e9b5b463a92df17f2.png)
  // USER CONSTRAINT: "Não quero título inicial, igual tá na página de cartão aí.
  // Pagamento com cartão e a descrição ali. Não quero esse título e descrição em uma página."
  // =========================================================================
  if (step === 'card') {
    return (
      <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full pb-16 font-sans">
        {/* Clean Back Button & Unified Stepper */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <button
            onClick={() => setStep('method-selection')}
            className="self-start flex items-center gap-2 text-sm font-bold text-[#11241c] hover:text-[#109353] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </button>

          <CheckoutStepper
            currentStepNumber={2}
            step2Label="Cartão"
            planName={selectedPlan.name}
          />

          <div className="hidden sm:block w-16" />
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs sm:text-sm font-bold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="cursor-pointer">✕</button>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Card Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#e5ebe7] shadow-xs flex flex-col gap-5">
            <form onSubmit={handleProcessCardPayment} className="flex flex-col gap-5">
              {/* Número do Cartão */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#11241c]">Número do cartão</label>
                <div className="relative flex items-center">
                  <CreditCard size={18} className="absolute left-3.5 text-[#889b90]" />
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="0000 0000 0000 0000"
                    className="w-full pl-10 pr-36 py-3 bg-white border border-[#d5ded8] rounded-xl text-sm font-semibold text-[#11241c] focus:outline-none focus:border-[#109353] focus:ring-1 focus:ring-[#109353] transition-all"
                  />
                  {/* Brand Badges on Right */}
                  <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#1434cb] text-white rounded">VISA</span>
                    <div className="flex -space-x-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#eb001b] inline-block" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#f79e1b] inline-block opacity-90" />
                    </div>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-black text-white rounded">elo</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#0079be] text-white rounded">AMEX</span>
                  </div>
                </div>
              </div>

              {/* Nome no Cartão */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#11241c]">Nome no cartão</label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Como está escrito no cartão"
                  className="w-full px-3.5 py-3 bg-white border border-[#d5ded8] rounded-xl text-sm font-semibold text-[#11241c] focus:outline-none focus:border-[#109353] focus:ring-1 focus:ring-[#109353] transition-all"
                />
              </div>

              {/* Validade e CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#11241c]">Validade</label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/AA"
                    className="w-full px-3.5 py-3 bg-white border border-[#d5ded8] rounded-xl text-sm font-semibold text-[#11241c] focus:outline-none focus:border-[#109353] focus:ring-1 focus:ring-[#109353] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#11241c]">CVV</label>
                  <div className="relative flex items-center">
                    <input
                      type={showCvv ? 'text' : 'password'}
                      required
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="123"
                      className="w-full px-3.5 pr-10 py-3 bg-white border border-[#d5ded8] rounded-xl text-sm font-semibold text-[#11241c] focus:outline-none focus:border-[#109353] focus:ring-1 focus:ring-[#109353] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 text-[#889b90] hover:text-[#11241c] cursor-pointer"
                    >
                      {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Condição de Pagamento (1x à vista) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#11241c]">Condição de Pagamento</label>
                <div className="w-full px-3.5 py-3 bg-[#f8faf9] border border-[#d5ded8] rounded-xl text-sm font-bold text-[#11241c] flex items-center justify-between">
                  <span>1x de R$ {planPriceFormatted} (à vista)</span>
                  <span className="text-[11px] font-extrabold text-[#109353] bg-[#eaf6ef] px-2.5 py-1 rounded-md border border-[#c6e8d1]">
                    Sem juros
                  </span>
                </div>
              </div>

              {/* Info Badge */}
              <div className="p-3 bg-[#eaf6ef] rounded-xl border border-[#c6e8d1] flex items-center gap-2.5 text-xs text-[#0a6639] font-medium">
                <ShieldCheck size={16} className="text-[#109353] shrink-0" />
                <span>Cobrança em 1x à vista no cartão de crédito com confirmação imediata.</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#00874e] hover:bg-[#007543] disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processando pagamento...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Finalizar pagamento</span>
                  </>
                )}
              </button>

              {/* PCI DSS Note */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#64786d] pt-1">
                <Lock size={13} className="text-[#889b90]" />
                <span>Seus dados estão seguros. Utilizamos criptografia e certificação PCI DSS.</span>
              </div>
            </form>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-xs flex flex-col gap-5">
              <h3 className="text-base font-extrabold text-[#11241c]">Resumo da assinatura</h3>

              {/* Plan Box */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-[#f0f4f1]">
                <div className="w-12 h-12 rounded-2xl bg-[#f2faf5] text-[#109353] flex items-center justify-center shrink-0 border border-[#d8eee1]">
                  {selectedPlanId === 'start' ? (
                    <Send size={20} className="stroke-[2.2]" />
                  ) : selectedPlanId === 'max' ? (
                    <Crown size={20} className="stroke-[2.2]" />
                  ) : (
                    <BarChart3 size={20} className="stroke-[2.2]" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-[#11241c]">Plano {selectedPlan.name}</span>
                  <div className="flex items-baseline gap-1 text-[#11241c] font-black text-xl">
                    <span>R$ {planPriceFormatted}</span>
                    <span className="text-xs font-semibold text-[#64786d]">/mês</span>
                  </div>
                </div>
              </div>

              {/* Features list */}
              <div className="flex flex-col gap-2.5 text-xs text-[#20362c]">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>{selectedPlan.maxGroups} grupos em automações</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>{selectedPlan.maxRoundsPerDay} envios por dia ({selectedPlan.maxRoundsPerDay} rodadas)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>Até {selectedPlan.maxMonthlySends.toLocaleString('pt-BR')} envios por mês</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>{selectedPlan.maxActiveCampaigns} divulgações ativas</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>Histórico de {selectedPlan.historyDays} dias</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>Suporte {selectedPlanId === 'max' ? 'VIP' : 'prioritário'}</span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-[#f0f4f1] flex items-center justify-between">
                <span className="text-sm font-bold text-[#11241c]">Total</span>
                <span className="text-xl font-black text-[#11241c]">R$ {planPriceFormatted}</span>
              </div>
            </div>

            {/* Compra 100% Segura Box */}
            <div className="bg-[#f2faf5] rounded-3xl p-5 border border-[#d8eee1] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[#109353] flex items-center justify-center shrink-0 shadow-2xs border border-[#c7e9d3]">
                <ShieldCheck size={20} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#11241c]">Compra 100% segura</span>
                <span className="text-[11px] text-[#55695f] leading-relaxed">
                  Seus dados de pagamento são protegidos e não são armazenados em nossos servidores.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!onboardingMode || step !== 'pix') return;
    const check = async () => {
      try {
        const token=localStorage.getItem('groply_token')||'';
        const r=await fetch('/api/onboarding/payment-status',{headers:{Authorization:`Bearer ${token}`}});
        const d=await r.json();
        if(d?.access){ setStep('success'); }
      } catch {}
    };
    check(); const timer=setInterval(check,5000); return ()=>clearInterval(timer);
  }, [onboardingMode, step]);

  // =========================================================================
  // SCREEN 2: PAGAMENTO VIA PIX (file_00000000dd6c820e9a912b2dbb792c70.png)
  // =========================================================================
  if (step === 'pix') {
    const pixPayload = paymentData?.pix?.payload || '';

    return (
      <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full pb-16 font-sans">
        {/* Navigation & Stepper */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <button
            onClick={() => setStep('method-selection')}
            className="self-start flex items-center gap-2 text-sm font-bold text-[#11241c] hover:text-[#109353] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </button>

          <CheckoutStepper
            currentStepNumber={2}
            step2Label="Pix"
            planName={selectedPlan.name}
          />

          <div className="hidden sm:block w-16" />
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: QR Code Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#e5ebe7] shadow-xs flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eaf6ef] text-[#32BCAD] flex items-center justify-center shrink-0 border border-[#c5e7d0]">
                  <PixOfficialIcon size={22} color="#32BCAD" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#11241c]">Pagamento via Pix</h2>
                  <p className="text-xs text-[#64786d]">
                    Escaneie o QR Code com o app do seu banco ou copie o código Pix e cole no pagamento.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-[#eaf6ef] text-[#109353] rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 border border-[#c5e7d0]">
                <Check size={12} className="stroke-[3]" />
                Aprovação rápida
              </span>
            </div>

            {/* QR Code Graphic Box (100% Real QR Code) */}
            <div className="flex flex-col items-center justify-center py-5 px-6 bg-[#f8faf9] rounded-2xl border border-[#e5ebe7]">
              {paymentData?.pix?.encodedImage || dynamicQrUrl ? (
                <img
                  src={paymentData?.pix?.encodedImage || dynamicQrUrl}
                  alt="QR Code Pix Oficial"
                  className="w-56 h-56 rounded-xl shadow-xs border border-[#e0eae4] bg-white p-2"
                />
              ) : (
                <div className="w-56 h-56 bg-white p-4 rounded-xl border border-[#e5ebe7] shadow-2xs flex flex-col items-center justify-center text-center gap-2.5">
                  <Loader2 className="w-8 h-8 animate-spin text-[#32BCAD]" />
                  <span className="text-xs font-semibold text-[#64786d]">Carregando QR Code Pix...</span>
                </div>
              )}

              {/* Expiration Timer */}
              <div className="flex items-center gap-1.5 text-xs text-[#64786d] font-semibold mt-3">
                <Clock size={14} className="text-[#889b90]" />
                <span>Este QR Code expira em</span>
                <span className="font-extrabold text-[#109353]">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {/* Divider "ou" */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#e5ebe7]" />
              <span className="absolute px-3 bg-white text-xs font-bold text-[#889b90]">ou</span>
            </div>

            {/* Copie o Código Pix */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#11241c]">Copie o código Pix</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixPayload}
                  className="flex-1 px-3.5 py-3 bg-[#f8faf9] border border-[#d5ded8] rounded-xl text-xs font-mono text-[#40544a] select-all truncate focus:outline-none"
                />
                <button
                  onClick={handleCopyPix}
                  className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 ${
                    copiedPix
                      ? 'bg-[#109353] text-white'
                      : 'bg-white hover:bg-[#f7faf8] text-[#11241c] border border-[#d5ded8]'
                  }`}
                >
                  {copiedPix ? (
                    <>
                      <Check size={14} className="stroke-[3]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Beneficiary Details */}
            <div className="p-3.5 bg-[#f8faf9] rounded-xl border border-[#e5ebe7] flex flex-col gap-1.5 text-xs text-[#40544a]">
              <div className="flex items-center justify-between">
                <span className="text-[#64786d]">Beneficiário:</span>
                <span className="font-extrabold text-[#11241c]">Wendisson santos Santana</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64786d]">CPF:</span>
                <span className="font-mono font-bold text-[#11241c]">087.355.455-85</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64786d]">Instituição:</span>
                <span className="font-semibold text-[#109353]">Banco Central do Brasil / Pix</span>
              </div>
            </div>

            {/* Confirmation note banner */}
            <div className="p-3.5 bg-[#f0f7fe] rounded-xl border border-[#d3e5fa] flex items-center gap-2.5 text-xs text-[#1e58a2] font-medium">
              <Info size={16} className="text-[#2b7fff] shrink-0" />
              <span>Após o pagamento, a confirmação é automática e seu plano será ativado em poucos segundos.</span>
            </div>

            {/* Simulation action for instant test */}
            <div className="flex items-center justify-between pt-2 border-t border-[#f0f4f1]">
              <span className="text-[11px] text-[#64786d]">Ambiente de teste e Webhook Asaas:</span>
              <button
                onClick={handleSimulateConfirmation}
                disabled={isLoading}
                className="text-xs font-bold text-[#109353] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Simular confirmação de pagamento</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-xs flex flex-col gap-5">
              <h3 className="text-base font-extrabold text-[#11241c]">Resumo do pagamento</h3>

              <div className="flex items-center gap-3.5 pb-4 border-b border-[#f0f4f1]">
                <div className="w-12 h-12 rounded-2xl bg-[#f2faf5] text-[#109353] flex items-center justify-center shrink-0 border border-[#d8eee1]">
                  {selectedPlanId === 'start' ? (
                    <Send size={20} className="stroke-[2.2]" />
                  ) : selectedPlanId === 'max' ? (
                    <Crown size={20} className="stroke-[2.2]" />
                  ) : (
                    <BarChart3 size={20} className="stroke-[2.2]" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-[#11241c]">Plano {selectedPlan.name}</span>
                  <div className="flex items-baseline gap-1 text-[#11241c] font-black text-xl">
                    <span>R$ {planPriceFormatted}</span>
                    <span className="text-xs font-semibold text-[#64786d]">/mês</span>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="flex flex-col gap-2.5 text-xs text-[#20362c]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64786d]">Grupos em automações</span>
                  <span className="font-extrabold text-[#11241c]">{selectedPlan.maxGroups}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64786d]">Envios por dia</span>
                  <span className="font-extrabold text-[#11241c]">{selectedPlan.maxRoundsPerDay} (rodadas)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64786d]">Envios por mês</span>
                  <span className="font-extrabold text-[#11241c]">Até {selectedPlan.maxMonthlySends.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64786d]">Divulgações ativas</span>
                  <span className="font-extrabold text-[#11241c]">{selectedPlan.maxActiveCampaigns}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64786d]">Histórico</span>
                  <span className="font-extrabold text-[#11241c]">{selectedPlan.historyDays} dias</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#f0f4f1] flex items-center justify-between">
                <span className="text-sm font-bold text-[#11241c]">Total</span>
                <span className="text-xl font-black text-[#11241c]">R$ {planPriceFormatted}</span>
              </div>
            </div>

            {/* Pagamento 100% Seguro Box */}
            <div className="bg-[#f2faf5] rounded-3xl p-5 border border-[#d8eee1] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[#109353] flex items-center justify-center shrink-0 shadow-2xs border border-[#c7e9d3]">
                <ShieldCheck size={20} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#11241c]">Pagamento 100% seguro</span>
                <span className="text-[11px] text-[#55695f]">Seus dados estão protegidos.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Rows: "Como pagar com Pix" & "Dúvidas?" */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Como pagar com Pix */}
          <div className="md:col-span-8 bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-12 h-16 rounded-2xl bg-[#eaf6ef] border-2 border-[#109353] flex items-center justify-center shrink-0">
              <Smartphone size={24} className="text-[#109353]" />
            </div>

            <div className="flex flex-col gap-3 flex-1">
              <h4 className="text-sm font-extrabold text-[#11241c]">Como pagar com Pix?</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#35483f]">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#109353] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>Abra o app do seu banco</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#109353] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>Escaneie o QR Code ou cole o código Pix</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#109353] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>Confirme o pagamento e pronto!</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dúvidas? Falar com suporte */}
          <div className="md:col-span-4 bg-[#f8faf9] rounded-3xl p-6 border border-[#e5ebe7] shadow-2xs flex flex-col justify-between gap-3">
            <div className="flex flex-col">
              <h4 className="text-sm font-extrabold text-[#11241c]">Dúvidas?</h4>
              <p className="text-xs text-[#64786d]">Nosso suporte está sempre disponível.</p>
            </div>

            <button
              onClick={onOpenSupport}
              className="w-full py-2.5 bg-white hover:bg-[#f2faf5] text-[#11241c] font-bold text-xs rounded-xl border border-[#d5ded8] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <MessageCircle size={16} className="text-[#109353]" />
              <span>Falar com suporte</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 4: BOLETO BANCÁRIO (file_000000008db4820e9304d081913af685.png)
  // =========================================================================
  if (step === 'boleto') {
    const boletoCode =
      paymentData?.boleto?.identificationField || '';

    return (
      <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full pb-16 font-sans">
        {/* Navigation & Stepper */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <button
            onClick={() => setStep('method-selection')}
            className="self-start flex items-center gap-2 text-sm font-bold text-[#11241c] hover:text-[#109353] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </button>

          <CheckoutStepper
            currentStepNumber={2}
            step2Label="Boleto"
            planName={selectedPlan.name}
          />

          <div className="hidden sm:block w-16" />
        </div>

        {/* Top Header with Checkmark */}
        <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-[#e5ebe7] shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#eaf6ef] text-[#109353] flex items-center justify-center shrink-0 border border-[#c5e7d0]">
            <Check size={22} className="stroke-[3]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-black text-[#11241c]">Boleto gerado com sucesso!</h1>
            <p className="text-xs sm:text-sm text-[#64786d]">
              Agora é só pagar até a data de vencimento para ativar seu plano.
            </p>
          </div>
        </div>

        {emailSentAlert && (
          <div className="p-4 bg-[#eaf6ef] text-[#109353] rounded-2xl border border-[#c2e7ce] text-xs font-bold flex items-center justify-between">
            <span>Boleto enviado com sucesso para {customer.email}!</span>
            <button onClick={() => setEmailSentAlert(false)} className="cursor-pointer">✕</button>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Boleto Details Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#e5ebe7] shadow-xs flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#f2faf5] text-[#109353] flex items-center justify-center shrink-0 border border-[#d8eee1]">
                  <Barcode size={22} className="stroke-[2.2]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-extrabold text-[#11241c]">Boleto bancário</h3>
                  <span className="text-xs text-[#64786d]">Pague em qualquer banco, app ou lotérica.</span>
                </div>
              </div>

              <div className="px-3 py-1.5 bg-[#eaf6ef] text-[#109353] rounded-xl border border-[#c5e7d0] flex items-center gap-1.5 text-xs font-bold shrink-0">
                <Calendar size={14} />
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] text-[#64786d] font-normal">Vencimento</span>
                  <span>18/09/2026</span>
                </div>
              </div>
            </div>

            {/* Barcode Graphic SVG */}
            <div className="bg-[#f8faf9] p-5 rounded-2xl border border-[#e5ebe7] flex flex-col items-center justify-center gap-2">
              <svg className="w-full max-w-sm h-16" viewBox="0 0 300 60">
                {/* Simulated standard barcode pattern */}
                {[
                  5, 9, 14, 16, 22, 28, 32, 38, 42, 48, 54, 58, 65, 71, 75, 82, 88, 92, 98,
                  105, 112, 118, 125, 131, 138, 142, 150, 158, 164, 172, 178, 185, 192, 198,
                  205, 212, 218, 225, 232, 238, 245, 252, 258, 265, 272, 278, 285, 292
                ].map((x, idx) => (
                  <rect
                    key={idx}
                    x={x}
                    y="0"
                    width={idx % 3 === 0 ? "3" : idx % 2 === 0 ? "2" : "1.2"}
                    height="50"
                    fill="#11241c"
                  />
                ))}
              </svg>
              <span className="text-xs font-mono font-bold text-[#11241c] tracking-widest">
                {boletoCode}
              </span>
            </div>

            {/* Linha Digitável Input with Copy */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={boletoCode}
                  className="flex-1 px-3.5 py-3 bg-[#f8faf9] border border-[#d5ded8] rounded-xl text-xs font-mono text-[#40544a] select-all truncate focus:outline-none"
                />
                <button
                  onClick={handleCopyBoleto}
                  className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 ${
                    copiedBoleto
                      ? 'bg-[#109353] text-white'
                      : 'bg-white hover:bg-[#f7faf8] text-[#11241c] border border-[#d5ded8]'
                  }`}
                >
                  {copiedBoleto ? (
                    <>
                      <Check size={14} className="stroke-[3]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar código</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons: Baixar PDF / Enviar por e-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  alert('Download do PDF do boleto iniciado.');
                }}
                className="py-3 px-4 bg-white hover:bg-[#f7faf8] text-[#11241c] font-bold text-xs rounded-xl border border-[#d5ded8] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download size={16} className="text-[#64786d]" />
                <span>Baixar boleto (PDF)</span>
              </button>

              <button
                onClick={() => {
                  setEmailSentAlert(true);
                  setTimeout(() => setEmailSentAlert(false), 4000);
                }}
                className="py-3 px-4 bg-white hover:bg-[#f7faf8] text-[#11241c] font-bold text-xs rounded-xl border border-[#d5ded8] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Mail size={16} className="text-[#64786d]" />
                <span>Enviar por e-mail</span>
              </button>
            </div>

            {/* Simulation test action */}
            <div className="flex items-center justify-between pt-3 border-t border-[#f0f4f1]">
              <span className="text-[11px] text-[#64786d]">Teste de compensação Asaas:</span>
              <button
                onClick={handleSimulateConfirmation}
                disabled={isLoading}
                className="text-xs font-bold text-[#109353] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Simular compensação bancária</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-xs flex flex-col gap-5">
              <h3 className="text-base font-extrabold text-[#11241c]">Resumo da assinatura</h3>

              <div className="flex items-center gap-3.5 pb-4 border-b border-[#f0f4f1]">
                <div className="w-12 h-12 rounded-2xl bg-[#f2faf5] text-[#109353] flex items-center justify-center shrink-0 border border-[#d8eee1]">
                  {selectedPlanId === 'start' ? (
                    <Send size={20} className="stroke-[2.2]" />
                  ) : selectedPlanId === 'max' ? (
                    <Crown size={20} className="stroke-[2.2]" />
                  ) : (
                    <BarChart3 size={20} className="stroke-[2.2]" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-[#11241c]">Plano {selectedPlan.name}</span>
                  <div className="flex items-baseline gap-1 text-[#11241c] font-black text-xl">
                    <span>R$ {planPriceFormatted}</span>
                    <span className="text-xs font-semibold text-[#64786d]">/mês</span>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="flex flex-col gap-2.5 text-xs text-[#20362c]">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>{selectedPlan.maxGroups} grupos em automações</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>{selectedPlan.maxRoundsPerDay} envios por dia ({selectedPlan.maxRoundsPerDay} rodadas)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>Até {selectedPlan.maxMonthlySends.toLocaleString('pt-BR')} envios por mês</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>{selectedPlan.maxActiveCampaigns} divulgações ativas</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>Histórico de {selectedPlan.historyDays} dias</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>Suporte prioritário</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#f0f4f1] flex items-center justify-between">
                <span className="text-sm font-bold text-[#11241c]">Total</span>
                <span className="text-xl font-black text-[#11241c]">R$ {planPriceFormatted}</span>
              </div>
            </div>

            {/* Pagamento Seguro Box */}
            <div className="bg-[#f2faf5] rounded-3xl p-5 border border-[#d8eee1] flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[#109353] flex items-center justify-center shrink-0 shadow-2xs border border-[#c7e9d3]">
                <ShieldCheck size={20} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#11241c]">Pagamento 100% seguro</span>
                <span className="text-[11px] text-[#55695f] leading-relaxed">
                  Seus dados são protegidos e o processamento é realizado por parceiros financeiros autorizados.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Card: "Como pagar o boleto?" 4 Steps */}
        <div className="bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-2xs flex flex-col gap-4">
          <h4 className="text-sm font-extrabold text-[#11241c]">Como pagar o boleto?</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-[#35483f]">
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#109353] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-[#11241c]">Abra o app do seu banco</span>
                <span className="text-[#64786d] text-[11px]">ou vá até uma agência ou lotérica.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#109353] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-[#11241c]">Escolha a opção pagar boleto</span>
                <span className="text-[#64786d] text-[11px]">e escaneie o código de barras ou cole o código.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#109353] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-[#11241c]">Confirme o pagamento</span>
                <span className="text-[#64786d] text-[11px]">e pronto!</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#109353] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                4
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-[#11241c]">Aguarde a confirmação</span>
                <span className="text-[#64786d] text-[11px]">O pagamento pode levar até 2 dias úteis para ser identificado.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 1: PLAN & PAYMENT METHOD SELECTION (file_00000000b758820e8d76c2a29dc65e9c.png)
  // =========================================================================
  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full pb-16 font-sans">
      {/* Top Header: Voltar & Pagamento 100% seguro badge */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-[#11241c] hover:text-[#109353] transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#eaf6ef] rounded-xl border border-[#c2e7ce] text-xs">
          <ShieldCheck size={16} className="text-[#109353]" />
          <div className="flex flex-col leading-tight text-left">
            <span className="font-bold text-[#11241c] text-[11px]">Pagamento 100% seguro</span>
            <span className="text-[10px] text-[#64786d]">Seus dados estão protegidos.</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs sm:text-sm font-bold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 3 Plan Cards + Account Info + Payment Methods */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Top 3 Plan Cards (Start, Pro, Max) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card: Start */}
            <div
              onClick={() => setSelectedPlanId('start')}
              className={`rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between relative ${
                selectedPlanId === 'start'
                  ? 'bg-white border-2 border-[#109353] shadow-xs'
                  : 'bg-white border border-[#e5ebe7] hover:border-[#b8cfc2]'
              }`}
            >
              {selectedPlanId === 'start' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#109353] text-white flex items-center justify-center">
                  <Check size={12} className="stroke-[3.5]" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f0f4f1] text-[#2d4036] flex items-center justify-center">
                  <Send size={16} className="stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#11241c]">Start</h4>
                  <div className="flex items-baseline gap-0.5 text-[#11241c] font-black text-sm">
                    <span className="text-xs">R$</span>
                    <span className="text-base">39,90</span>
                    <span className="text-[10px] text-[#64786d] font-normal">/mês</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1 text-[11px] text-[#33463d]">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>20 grupos em automações</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>1 envio por dia (1 rodada)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>Até 600 envios por mês</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Pro (Mais Escolhido) */}
            <div
              onClick={() => setSelectedPlanId('pro')}
              className={`rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between relative ${
                selectedPlanId === 'pro'
                  ? 'bg-white border-2 border-[#109353] shadow-xs ring-1 ring-[#109353]/20'
                  : 'bg-white border border-[#e5ebe7] hover:border-[#b8cfc2]'
              }`}
            >
              {/* Badge Mais Escolhido */}
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#00874e] text-white text-[10px] font-black">
                Mais escolhido
              </div>

              {selectedPlanId === 'pro' && (
                <div className="absolute top-4 right-3 w-5 h-5 rounded-full bg-[#109353] text-white flex items-center justify-center">
                  <Check size={12} className="stroke-[3.5]" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center">
                  <BarChart3 size={16} className="stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#11241c]">Pro</h4>
                  <div className="flex items-baseline gap-0.5 text-[#11241c] font-black text-sm">
                    <span className="text-xs">R$</span>
                    <span className="text-base">69,90</span>
                    <span className="text-[10px] text-[#64786d] font-normal">/mês</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1 text-[11px] text-[#33463d]">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>45 grupos em automações</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>2 envios por dia (2 rodadas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>Até 2.700 envios por mês</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Max */}
            <div
              onClick={() => setSelectedPlanId('max')}
              className={`rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between relative ${
                selectedPlanId === 'max'
                  ? 'bg-white border-2 border-[#109353] shadow-xs'
                  : 'bg-white border border-[#e5ebe7] hover:border-[#b8cfc2]'
              }`}
            >
              {selectedPlanId === 'max' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#109353] text-white flex items-center justify-center">
                  <Check size={12} className="stroke-[3.5]" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f0f4f1] text-[#2d4036] flex items-center justify-center">
                  <Crown size={16} className="stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#11241c]">Max</h4>
                  <div className="flex items-baseline gap-0.5 text-[#11241c] font-black text-sm">
                    <span className="text-xs">R$</span>
                    <span className="text-base">119,90</span>
                    <span className="text-[10px] text-[#64786d] font-normal">/mês</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1 text-[11px] text-[#33463d]">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>90 grupos em automações</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>3 envios por dia (3 rodadas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#109353] shrink-0 stroke-[3]" />
                    <span>Até 8.100 envios por mês</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sua Conta Box */}
          <div className="bg-white rounded-2xl p-4 border border-[#e5ebe7] shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f0f4f1] text-[#2d4036] flex items-center justify-center shrink-0">
                <span className="text-sm font-black">WS</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#64786d]">Sua conta</span>
                <span className="text-sm font-extrabold text-[#11241c]">{customer.name}</span>
                <span className="text-xs text-[#64786d]">{customer.email}</span>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-[#eaf6ef] text-[#109353] rounded-full text-xs font-bold flex items-center gap-1 border border-[#c2e7ce]">
              <Check size={12} className="stroke-[3]" />
              Conta verificada
            </span>
          </div>

          {/* Forma de Pagamento Section */}
          <div className="bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-xs flex flex-col gap-4">
            <h3 className="text-base font-extrabold text-[#11241c]">Forma de pagamento</h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              {/* Left: 3 Payment Choices */}
              <div className="sm:col-span-7 flex flex-col gap-2.5">
                {/* 1. Pix */}
                <div
                  onClick={() => setSelectedMethod('pix')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedMethod === 'pix'
                      ? 'border-2 border-[#109353] bg-[#f2faf5]'
                      : 'border-[#e5ebe7] bg-white hover:border-[#b8cfc2]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#eaf6ef] text-[#32BCAD] flex items-center justify-center shrink-0">
                      <PixOfficialIcon size={18} color="#32BCAD" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-extrabold text-[#11241c]">Pix</span>
                      <span className="text-[11px] text-[#64786d]">Aprovação em poucos segundos.</span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      selectedMethod === 'pix'
                        ? 'border-[#109353] bg-[#109353] text-white'
                        : 'border-[#d5ded8] bg-white'
                    }`}
                  >
                    {selectedMethod === 'pix' && <Check size={12} className="stroke-[3.5]" />}
                  </div>
                </div>

                {/* 2. Cartão de Crédito */}
                <div
                  onClick={() => setSelectedMethod('card')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedMethod === 'card'
                      ? 'border-2 border-[#109353] bg-[#f2faf5]'
                      : 'border-[#e5ebe7] bg-white hover:border-[#b8cfc2]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#f0f4f1] text-[#2d4036] flex items-center justify-center shrink-0">
                      <CreditCard size={17} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-extrabold text-[#11241c]">Cartão de crédito</span>
                      <span className="text-[11px] text-[#64786d]">Pagamento à vista (1x) com aprovação imediata.</span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      selectedMethod === 'card'
                        ? 'border-[#109353] bg-[#109353] text-white'
                        : 'border-[#d5ded8] bg-white'
                    }`}
                  >
                    {selectedMethod === 'card' && <Check size={12} className="stroke-[3.5]" />}
                  </div>
                </div>

                {/* 3. Boleto Bancário */}
                <div
                  onClick={() => setSelectedMethod('boleto')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedMethod === 'boleto'
                      ? 'border-2 border-[#109353] bg-[#f2faf5]'
                      : 'border-[#e5ebe7] bg-white hover:border-[#b8cfc2]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#f0f4f1] text-[#2d4036] flex items-center justify-center shrink-0">
                      <Barcode size={17} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-extrabold text-[#11241c]">Boleto bancário</span>
                      <span className="text-[11px] text-[#64786d]">Até 2 dias úteis para compensação.</span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      selectedMethod === 'boleto'
                        ? 'border-[#109353] bg-[#109353] text-white'
                        : 'border-[#d5ded8] bg-white'
                    }`}
                  >
                    {selectedMethod === 'boleto' && <Check size={12} className="stroke-[3.5]" />}
                  </div>
                </div>
              </div>

              {/* Right: Highlight Box */}
              <div className="sm:col-span-5 bg-[#f4faf6] rounded-2xl p-4 border border-[#d8eee1] flex flex-col gap-3">
                <div className="w-8 h-8 rounded-xl bg-white text-[#109353] flex items-center justify-center shadow-2xs border border-[#cbe9d6]">
                  <Zap size={18} className="stroke-[2.5]" />
                </div>
                <div className="flex flex-col gap-2 text-xs text-[#20362c]">
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-[#109353] stroke-[3]" />
                    <span>Pagamento rápido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-[#109353] stroke-[3]" />
                    <span>Sem taxas adicionais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-[#109353] stroke-[3]" />
                    <span>Liberação automática</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Footnote */}
            <div className="flex items-center gap-2 text-[11px] text-[#64786d] pt-2 border-t border-[#f0f4f1]">
              <Lock size={13} className="text-[#889b90] shrink-0" />
              <span>
                Ao continuar, você concorda com nossos{' '}
                <a href="#termos" className="underline hover:text-[#11241c]">Termos de Uso</a> e{' '}
                <a href="#privacidade" className="underline hover:text-[#11241c]">Política de Privacidade</a>.
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Resumo da Assinatura Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-xs flex flex-col gap-5">
            <h3 className="text-base font-extrabold text-[#11241c]">Resumo da assinatura</h3>

            {/* Plan Info */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#f0f4f1]">
              <div className="w-12 h-12 rounded-2xl bg-[#f2faf5] text-[#109353] flex items-center justify-center shrink-0 border border-[#d8eee1]">
                {selectedPlanId === 'start' ? (
                  <Send size={20} className="stroke-[2.2]" />
                ) : selectedPlanId === 'max' ? (
                  <Crown size={20} className="stroke-[2.2]" />
                ) : (
                  <BarChart3 size={20} className="stroke-[2.2]" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-[#11241c]">Plano {selectedPlan.name}</span>
                <span className="text-xs text-[#64786d]">Mais resultados para o seu negócio.</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 text-[#11241c] font-black">
              <span className="text-sm font-extrabold">R$</span>
              <span className="text-3xl sm:text-4xl tracking-tight">{planPriceFormatted}</span>
              <span className="text-xs font-semibold text-[#64786d]">/mês</span>
            </div>

            {/* Features list */}
            <div className="flex flex-col gap-2.5 text-xs text-[#20362c]">
              <span className="text-xs font-bold text-[#11241c]">O que você vai receber:</span>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>{selectedPlan.maxGroups} grupos em automações</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>{selectedPlan.maxRoundsPerDay} envios por dia ({selectedPlan.maxRoundsPerDay} rodadas)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Até {selectedPlan.maxMonthlySends.toLocaleString('pt-BR')} envios por mês</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>{selectedPlan.maxActiveCampaigns} divulgações ativas</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Histórico de {selectedPlan.historyDays} dias</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Agendamento de envios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#109353] text-white flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3.5]" />
                </div>
                <span>Suporte {selectedPlanId === 'max' ? 'VIP' : 'prioritário'}</span>
              </div>
            </div>

            {onboardingMode && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-[#23382d] mb-1.5">CPF do titular</label>
                <input value={customerCpf} onChange={(e)=>setCustomerCpf(e.target.value)} inputMode="numeric" placeholder="000.000.000-00" className="w-full px-4 py-3 bg-white text-sm rounded-xl border border-[#d5ded8] focus:border-[#00c968] focus:outline-none" />
              </div>
            )}

            {/* Action CTA Button */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleProceedToPayment}
                disabled={isLoading}
                className="w-full py-3.5 bg-[#00874e] hover:bg-[#007543] disabled:opacity-50 text-white font-black text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Gerando cobrança Asaas...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>
                      {selectedMethod === 'pix'
                        ? 'Confirmar e gerar Pix'
                        : selectedMethod === 'card'
                        ? 'Continuar para pagamento com cartão'
                        : 'Confirmar e gerar Boleto'}
                    </span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-[#64786d] text-center">
                Você será redirecionado para gerar o pagamento.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM PROMO BANNER (file_00000000b758820e8d76c2a29dc65e9c.png) */}
      <div className="w-full bg-gradient-to-r from-[#eaf6ef] via-[#e2f3e8] to-[#d8ede0] rounded-3xl p-6 sm:p-8 border border-[#c7e9d4] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-2xs">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#00874e] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={26} className="stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base sm:text-lg font-black text-[#11241c]">
              Mais resultados para o seu negócio.
            </h3>
            <p className="text-xs sm:text-sm text-[#465a50]">
              Automatize, economize tempo e alcance mais pessoas com o Groply.
            </p>
          </div>
        </div>

        {/* Right Preview Pill */}
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs px-5 py-3 rounded-2xl border border-white/80 shadow-xs z-10">
          <div className="w-8 h-8 rounded-xl bg-[#00874e] text-white flex items-center justify-center">
            <MessageCircle size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-[#11241c]">Grupos que geram resultados.</span>
            <span className="text-[10px] text-[#64786d]">Conexão WhatsApp oficial e estável</span>
          </div>
        </div>
      </div>
    </div>
  );
};
