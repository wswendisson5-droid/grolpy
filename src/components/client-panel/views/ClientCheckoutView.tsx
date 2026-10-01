import React, { useEffect, useState } from 'react';
import { ArrowLeft, Barcode, Check, Copy, CreditCard, Loader2 } from 'lucide-react';
import { PlanId, planService } from '../../../services/planService';
import { asaasClientService, AsaasPaymentData } from '../../../services/asaasClientService';
import { sessionService } from '../../../services/sessionService';

export type PaymentMethod = 'pix' | 'card' | 'boleto';
interface Props {
  initialPlanId?: PlanId; initialMethod?: PaymentMethod; onBack: () => void;
  onGoToDashboard: () => void; onGoToPlans: () => void; onGoToNovaDivulgacao: () => void;
  onOpenSupport?: () => void; onboardingMode?: boolean;
}

export const ClientCheckoutView: React.FC<Props> = ({ onBack, onGoToDashboard }) => {
  const user = sessionService.getUser() || {};
  const [method,setMethod]=useState<PaymentMethod>('pix');
  const [payment,setPayment]=useState<AsaasPaymentData|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState(false);
  const [success,setSuccess]=useState(false);
  const [cardNumber,setCardNumber]=useState('');
  const [cardHolder,setCardHolder]=useState('');
  const [cardExpiry,setCardExpiry]=useState('');
  const [cardCvv,setCardCvv]=useState('');

  const customer={name:user.name||'',email:user.email||'',phone:user.phone||''};

  useEffect(()=>{
    if(!payment?.id || success) return;
    const timer=setInterval(async()=>{
      const res=await asaasClientService.checkStatus(payment.id);
      const status=String(res.payment?.status||'').toUpperCase();
      if(status==='CONFIRMED'||status==='RECEIVED'){
        clearInterval(timer); await planService.syncWithBackend(); setSuccess(true);
      }
    },3000);
    return()=>clearInterval(timer);
  },[payment?.id,success]);  const finalize=async()=>{
    setError(''); setLoading(true);
    try{
      if(method==='card'){
        const [month,year]=cardExpiry.split('/');
        if(cardNumber.replace(/\D/g,'').length<13||!cardHolder||!month||!year||cardCvv.length<3)
          throw new Error('Preencha os dados do cartão.');
        const res=await asaasClientService.createPayment({
          planId:'start',billingType:'CREDIT_CARD',customer,
          creditCard:{holderName:cardHolder,number:cardNumber.replace(/\D/g,''),expiryMonth:month,expiryYear:`20${year}`,ccv:cardCvv,installments:1}
        });
        if(!res.success||!res.payment) throw new Error(res.error||'Não foi possível processar o cartão.');
        setPayment(res.payment);
        const st=String(res.payment.status).toUpperCase();
        if(st==='CONFIRMED'||st==='RECEIVED'){await planService.syncWithBackend();setSuccess(true);}
      }else{
        const res=await asaasClientService.createPayment({planId:'start',billingType:method==='pix'?'PIX':'BOLETO',customer});
        if(!res.success||!res.payment) throw new Error(res.error||'Não foi possível gerar o pagamento.');
        setPayment(res.payment);
      }
    }catch(e:any){setError(e.message||'Não foi possível finalizar o pagamento.');}
    finally{setLoading(false);}
  };

  const copyPix=async()=>{
    if(!payment?.pix?.payload)return;
    await navigator.clipboard.writeText(payment.pix.payload); setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  if(success) return <div className="flex-1 max-w-lg mx-auto w-full py-12 px-4 font-sans">
    <div className="bg-white rounded-3xl border border-[#dfe8e2] p-8 text-center shadow-sm">
      <div className="w-16 h-16 rounded-full bg-[#e8f7ee] text-[#109353] mx-auto flex items-center justify-center"><Check size={32} strokeWidth={3}/></div>
      <h1 className="mt-5 text-2xl font-black text-[#11241c]">Pagamento confirmado!</h1>
      <p className="mt-2 text-sm text-[#64786d]">Sua assinatura Groply está ativa.</p>
      <button onClick={onGoToDashboard} className="mt-7 w-full min-h-12 rounded-2xl bg-[#109353] text-white font-extrabold">Ir para o painel</button>
    </div>
  </div>;  if(payment && method==='pix') return <div className="flex-1 max-w-lg mx-auto w-full py-6 px-4 font-sans">
    <button onClick={()=>setPayment(null)} className="mb-4 text-sm font-bold text-[#52675c] flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
    <div className="bg-white rounded-3xl border border-[#dfe8e2] p-6 sm:p-8 text-center shadow-sm">
      <h1 className="text-xl font-black text-[#11241c]">Pague com Pix</h1>
      <p className="text-sm text-[#64786d] mt-1">R$ 14,90</p>
      {payment.pix?.encodedImage && <img src={payment.pix.encodedImage} alt="QR Code Pix" className="w-56 h-56 mx-auto mt-5 rounded-2xl"/>}
      <button onClick={copyPix} className="mt-4 w-full min-h-12 rounded-2xl border border-[#d7e1db] font-bold text-[#11241c] flex items-center justify-center gap-2">
        <Copy size={17}/>{copied?'Código copiado':'Copiar Pix copia e cola'}
      </button>
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#64786d]"><Loader2 size={14} className="animate-spin"/> Aguardando confirmação do pagamento...</div>
    </div>
  </div>;

  if(payment && method==='boleto') return <div className="flex-1 max-w-lg mx-auto w-full py-6 px-4 font-sans">
    <button onClick={()=>setPayment(null)} className="mb-4 text-sm font-bold text-[#52675c] flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
    <div className="bg-white rounded-3xl border border-[#dfe8e2] p-6 sm:p-8 text-center shadow-sm">
      <Barcode size={42} className="mx-auto text-[#109353]"/>
      <h1 className="text-xl font-black text-[#11241c] mt-4">Boleto gerado</h1>
      <p className="text-sm text-[#64786d] mt-1">R$ 14,90</p>
      {payment.boleto?.bankSlipUrl && <a href={payment.boleto.bankSlipUrl} target="_blank" rel="noreferrer" className="mt-6 min-h-12 rounded-2xl bg-[#109353] text-white font-extrabold flex items-center justify-center">Abrir boleto</a>}
      <p className="mt-4 text-xs text-[#64786d]">O acesso será liberado automaticamente após a confirmação.</p>
    </div>
  </div>;  return <div className="flex-1 max-w-xl mx-auto w-full py-6 px-4 font-sans">
    <button onClick={onBack} className="mb-4 text-sm font-bold text-[#52675c] flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
    <div className="bg-white rounded-3xl border border-[#dfe8e2] p-5 sm:p-7 shadow-sm">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div><h1 className="text-xl font-black text-[#11241c]">Formas de pagamento</h1><p className="text-xs text-[#64786d] mt-1">Escolha como deseja pagar.</p></div>
        <div className="text-right"><strong className="text-xl text-[#11241c]">R$ 14,90</strong><div className="text-[11px] text-[#64786d]">por mês</div></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([['pix','Pix'],['card','Cartão'],['boleto','Boleto']] as const).map(([id,label])=><button key={id} onClick={()=>{setMethod(id);setError('');}} className={`min-h-12 rounded-xl border text-sm font-bold ${method===id?'border-[#109353] bg-[#edf8f1] text-[#0d7d47]':'border-[#dfe8e2] text-[#52675c]'}`}>{label}</button>)}
      </div>
      {method==='card' && <div className="mt-5 space-y-3">
        <input value={cardHolder} onChange={e=>setCardHolder(e.target.value)} placeholder="Nome no cartão" className="w-full h-12 rounded-xl border border-[#dfe8e2] px-4 outline-none focus:border-[#109353]"/>
        <div className="relative"><CreditCard size={17} className="absolute left-4 top-4 text-[#7b8e83]"/><input value={cardNumber} onChange={e=>setCardNumber(e.target.value.replace(/[^\d ]/g,'').slice(0,19))} placeholder="Número do cartão" className="w-full h-12 rounded-xl border border-[#dfe8e2] pl-11 pr-4 outline-none focus:border-[#109353]"/></div>
        <div className="grid grid-cols-2 gap-3"><input value={cardExpiry} onChange={e=>setCardExpiry(e.target.value.replace(/[^\d/]/g,'').slice(0,5))} placeholder="MM/AA" className="h-12 rounded-xl border border-[#dfe8e2] px-4 outline-none focus:border-[#109353]"/><input value={cardCvv} onChange={e=>setCardCvv(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="CVV" className="h-12 rounded-xl border border-[#dfe8e2] px-4 outline-none focus:border-[#109353]"/></div>
      </div>}      <div className="mt-5 rounded-2xl bg-[#f7faf8] border border-[#e3ebe6] p-4">
        <div className="flex items-center justify-between text-xs text-[#52675c]"><span>Pagamento rápido</span><span>Sem taxa adicional</span></div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#7a8c82]">Sua assinatura é liberada automaticamente após a confirmação do pagamento.</p>
      </div>
      {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
      <button onClick={finalize} disabled={loading} className="mt-5 w-full min-h-12 rounded-2xl bg-[#109353] hover:bg-[#0c7a44] disabled:opacity-60 text-white font-extrabold flex items-center justify-center gap-2">
        {loading&&<Loader2 size={17} className="animate-spin"/>}{loading?'Processando...':'Finalizar'}
      </button>
    </div>
  </div>;
};
