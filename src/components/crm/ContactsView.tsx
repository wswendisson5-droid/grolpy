import React, { useEffect, useMemo, useState } from 'react';
import { HugeIcon, Search01Icon, UserGroupIcon } from '../icons/HugeIcon';

type SalesContact = {
  id: number; phone: string; remoteJid?: string; displayName?: string; confirmedName?: string;
  source?: string; sourceGroupName?: string; pipelineStage?: string; conversationStatus?: string;
  replied?: boolean; outcome?: string; doNotContact?: boolean; lastInteractionAt?: string; createdAt?: string;
};
interface ContactsViewProps { onOpenMobileMenu?: () => void; onNavigateToCrm?: () => void; }
const pipelineLabels: Record<string, string> = {
  oportunidade:'Oportunidade',abordado:'Abordado',em_atendimento:'Em atendimento',qualificacao:'Qualificação',
  apresentacao:'Apresentação',interessado:'Interessado',objecao:'Objeção',proposta_enviada:'Proposta',
  conversao:'Conversão',convertido:'Convertido',follow_up:'Follow-up',descartado:'Descartado',
};
const normalizePhone=(value:string)=>String(value||'').replace(/\D/g,'');

export const ContactsView: React.FC<ContactsViewProps> = ({ onOpenMobileMenu, onNavigateToCrm }) => {
  const [contacts,setContacts]=useState<SalesContact[]>([]),[query,setQuery]=useState(''),[name,setName]=useState(''),[phone,setPhone]=useState('');
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[deletingPhone,setDeletingPhone]=useState(''),[error,setError]=useState('');
  const loadContacts=async()=>{setLoading(true);setError('');try{const res=await fetch('/api/admin/sales-contacts');const data=await res.json();if(!res.ok||!data.success)throw new Error(data.error||'Falha ao carregar contatos');setContacts(Array.isArray(data.contacts)?data.contacts:[]);}catch(err:any){setError(err.message||'Falha ao carregar contatos');}finally{setLoading(false);}};
  useEffect(()=>{void loadContacts();},[]);
  const deleteContact=async(contact:SalesContact)=>{
    const shownName=contact.confirmedName||contact.displayName||contact.phone;
    if(!window.confirm(`Apagar ${shownName} da base de contatos? Se esse número divulgar novamente, o Radar poderá detectá-lo como nova oportunidade.`))return;
    setDeletingPhone(contact.phone);setError('');
    try{const res=await fetch(`/api/admin/sales-contacts/${encodeURIComponent(contact.phone)}`,{method:'DELETE'});const data=await res.json();if(!res.ok||!data.success)throw new Error(data.error||'Falha ao apagar contato');setContacts(prev=>prev.filter(item=>item.phone!==contact.phone));}
    catch(err:any){setError(err.message||'Falha ao apagar contato');}finally{setDeletingPhone('');}
  };
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return contacts;return contacts.filter(c=>[c.confirmedName,c.displayName,c.phone,c.sourceGroupName,c.pipelineStage,c.outcome].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));},[contacts,query]);
  const saveContact=async(event:React.FormEvent)=>{event.preventDefault();const digits=normalizePhone(phone);if(digits.length<8){setError('Informe um WhatsApp válido com DDD.');return;}setSaving(true);setError('');try{const res=await fetch('/api/admin/sales-contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:digits,displayName:name.trim()||digits,source:'manual'})});const data=await res.json();if(!res.ok||!data.success)throw new Error(data.error||'Falha ao salvar contato');setName('');setPhone('');await loadContacts();}catch(err:any){setError(err.message||'Falha ao salvar contato');}finally{setSaving(false);}};

  return <div className="flex-1 min-h-0 overflow-y-auto bg-[#f7faf8] pb-24 lg:pb-6"><div className="max-w-6xl mx-auto p-4 sm:p-6">
    <div className="flex items-center gap-3 mb-5">
      <button onClick={onOpenMobileMenu} className="lg:hidden w-10 h-10 rounded-xl bg-white border border-[#e1e9e4] text-[#12382c]">☰</button>
      <div className="flex-1"><h1 className="text-xl sm:text-2xl font-bold text-[#142d23]">Contatos</h1><p className="text-sm text-[#6a7d73]">Base comercial interna. Todo número identificado pelo Radar fica registrado aqui e não volta a ser prospectado.</p></div>
      <button onClick={onNavigateToCrm} className="hidden sm:block px-4 py-2 rounded-xl border border-[#d8e4dd] bg-white text-sm font-semibold text-[#12382c]">Abrir CRM</button>
    </div>
    <form onSubmit={saveContact} className="bg-white border border-[#e1e9e4] rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
      <div className="flex items-center gap-2 mb-4 text-[#12382c]"><span className="text-xl font-bold">+</span><h2 className="font-bold">Salvar contato manualmente</h2></div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome / identificação" className="rounded-xl border border-[#dce6e0] bg-[#fbfdfc] px-3.5 py-3 text-sm outline-none focus:border-[#0f8b61]"/>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" className="rounded-xl border border-[#dce6e0] bg-[#fbfdfc] px-3.5 py-3 text-sm outline-none focus:border-[#0f8b61]"/>
        <button disabled={saving} className="px-5 py-3 rounded-xl bg-[#12382c] text-white text-sm font-bold disabled:opacity-60">{saving?'Salvando...':'Salvar contato'}</button>
      </div>{error&&<p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
    <div className="bg-white border border-[#e1e9e4] rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#edf1ee] flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1"><HugeIcon icon={UserGroupIcon} size={20}/><h2 className="font-bold text-[#142d23]">Base de contatos</h2><span className="text-xs font-bold bg-[#eaf4ef] text-[#12382c] px-2 py-1 rounded-full">{contacts.length}</span></div>
        <div className="relative sm:w-72"><HugeIcon icon={Search01Icon} size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73847b]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome, número, etapa..." className="w-full rounded-xl border border-[#dce6e0] pl-9 pr-3 py-2.5 text-sm outline-none"/></div>
      </div>
      {loading?<div className="p-8 text-center text-sm text-[#6a7d73]">Carregando contatos...</div>:filtered.length===0?<div className="p-8 text-center text-sm text-[#6a7d73]">Nenhum contato registrado ainda.</div>:<div className="divide-y divide-[#edf1ee]">{filtered.map(contact=>{const shownName=contact.confirmedName||contact.displayName||'Sem nome';return <div key={contact.id||contact.phone} className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-full bg-[#e1f5ea] text-[#087a4d] flex items-center justify-center font-black">{shownName.charAt(0).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-sm text-[#142d23]">{shownName}</span>{contact.confirmedName&&contact.displayName&&contact.confirmedName!==contact.displayName&&<span className="text-[10px] text-[#87958e]">WhatsApp: {contact.displayName}</span>}</div>
        <div className="text-xs text-[#6a7d73] mt-0.5">{contact.phone}</div><div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#edf5f1] text-[#476458]">{pipelineLabels[contact.pipelineStage||'']||contact.pipelineStage||'Oportunidade'}</span>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${contact.replied?'bg-[#e4f7ec] text-[#087a4d]':'bg-[#f3f4f3] text-[#738078]'}`}>{contact.replied?'Respondeu':'Não respondeu'}</span>
          {contact.outcome&&<span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#f5f0e8] text-[#765f39]">{contact.outcome}</span>}{contact.doNotContact&&<span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-700">Não contatar</span>}
        </div>{contact.sourceGroupName&&<div className="text-[11px] text-[#87958e] mt-2">Origem: {contact.sourceGroupName}</div>}</div>
        <button onClick={()=>void deleteContact(contact)} disabled={deletingPhone===contact.phone} title="Apagar contato" className="shrink-0 px-3 py-2 rounded-xl border border-red-100 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 disabled:opacity-50">{deletingPhone===contact.phone?'Apagando...':'Apagar'}</button>
      </div>;})}</div>}
    </div>
  </div></div>;
};
