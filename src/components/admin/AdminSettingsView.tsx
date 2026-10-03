import React, { useEffect, useState } from 'react';

const authHeaders = () => {
  const token = localStorage.getItem('groply_auth_token') || localStorage.getItem('auth_token') || '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export const AdminSettingsView: React.FC = () => {
  const [apiKey,setApiKey]=useState('');
  const [configured,setConfigured]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{ fetch('/api/admin/asaas-config',{headers:authHeaders()}).then(r=>r.json()).then(d=>setConfigured(Boolean(d.configured))).catch(()=>{}); },[]);

  const save=async()=>{
    setSaving(true); setMessage('');
    try {
      const r=await fetch('/api/admin/asaas-config',{method:'POST',headers:authHeaders(),body:JSON.stringify({apiKey,environment:'production'})});
      const d=await r.json();
      if(!r.ok || !d.success) throw new Error(d.error || 'Falha ao salvar');
      setConfigured(true); setApiKey(''); setMessage('API do Asaas salva no banco e ativada.');
    } catch(e:any){ setMessage(e.message || 'Falha ao salvar a API.'); }
    finally { setSaving(false); }
  };

  return <main className="flex-1 overflow-y-auto p-4 sm:p-7 bg-[#f8faf9]">
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-extrabold text-[#142d23]">Configurações</h1>
      <p className="text-sm text-[#66786f] mt-1 mb-6">Credenciais e integrações da plataforma.</p>
      <section className="bg-white border border-[#e1e9e4] rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div><h2 className="font-extrabold text-[#142d23]">Asaas</h2><p className="text-xs text-[#718178] mt-1">API usada para cobranças e confirmação dos pagamentos.</p></div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${configured?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{configured?'Configurado':'Não configurado'}</span>
        </div>
        <label className="text-xs font-bold text-[#344a3f]">API Key do Asaas</label>
        <input type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={configured?'••••••••••••••••••••  (digite somente para substituir)':'Cole sua API Key aqui'} className="mt-2 w-full border border-[#d7e1db] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#109353]" />
        <p className="text-[11px] text-[#7a8b82] mt-2">A chave fica salva no banco. A chave atual nunca é exibida novamente no painel.</p>
        {message && <div className="mt-4 text-sm font-semibold text-[#315345]">{message}</div>}
        <button disabled={saving||apiKey.trim().length<20} onClick={save} className="mt-5 px-5 py-3 rounded-2xl bg-[#109353] text-white text-sm font-bold disabled:opacity-40">{saving?'Salvando...':'Salvar API do Asaas'}</button>
      </section>
    </div>
  </main>;
};
