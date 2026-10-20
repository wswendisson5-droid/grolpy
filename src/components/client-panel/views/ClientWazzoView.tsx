import React, { useEffect, useState } from 'react';
import { BadgeCheck, ExternalLink, Users, ShieldCheck, Sparkles, RefreshCw, Clock, Pause, Play } from 'lucide-react';

const statusLabels: Record<string, string> = {
  preparando: 'Preparando automação', verificando: 'Verificando grupos',
  completando_grupos: 'Completando os grupos', meta_atingida: 'Meta atingida',
  buscando_candidatos: 'Buscando grupos na WAZZO', aguardando_confirmacoes: 'Aguardando confirmação de entrada',
  aguardando_nova_tentativa: 'Aguardando nova tentativa', pausada: 'Automação pausada',
  aguardando_verificacao: 'Aguardando verificação', numero_divergente: 'Verifique o número conectado',
  plano_inativo: 'Assinatura inativa', desconectada: 'Aguardando conexão do WhatsApp',
};

export const ClientWazzoView: React.FC = () => {
  const [automation, setAutomation] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/client/group-automation', { signal, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a automação.');
      setAutomation(data); setError('');
    } catch (e: any) { if (e.name !== 'AbortError') setError(e.message); }
  };
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => { void load(controller.signal); }, 30_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  const toggle = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/client/group-automation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !automation.enabled }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível alterar a automação.');
      setAutomation(data); setError('');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };
  const requestTwenty = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/client/group-automation/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: 20 }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível solicitar novos grupos.');
      setAutomation(data); setError('');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };
  const time = (at: number) => new Date(at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return <main className="flex-1 overflow-y-auto bg-[#f7faf8] px-4 py-6 pb-24 sm:px-7 sm:py-8"><div className="mx-auto max-w-5xl">
    <section className="overflow-hidden rounded-[28px] bg-[#123f31] p-6 text-white shadow-[0_18px_55px_rgba(18,63,49,.18)] sm:p-9">
      <BadgeCheck size={30}/><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-emerald-200">Benefício Groply</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Grupos WAZZO</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">Encontre grupos por interesse e acompanhe suas comunidades.</p>
      <a href="https://wazzo.minhabagg.com.br" target="_blank" rel="noreferrer" className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#123f31]">Acessar WAZZO <ExternalLink size={17}/></a>
    </section>
    {error && <p role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    {automation?.available && <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Exclusivo desta conta</p>
        <h2 className="mt-1 text-xl font-black text-[#203b30]">{automation.target || 100} grupos para divulgação</h2>
        <p className="mt-2 text-sm text-[#74857c]">{statusLabels[automation.status] || 'Acompanhando grupos'}</p>
      </div><button onClick={() => { void load(); }} aria-label="Atualizar status da automação" className="rounded-xl border border-emerald-100 p-3 text-emerald-800"><RefreshCw size={18}/></button></div>
      <div className="mt-6 flex items-end gap-2"><strong className="text-5xl font-black tracking-tight text-[#123f31]">{automation.count || 0}</strong><span className="pb-1 text-sm text-[#74857c]">/ {automation.target || 100} grupos validados</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${Math.min(100, 100 * (automation.count || 0) / (automation.target || 100))}%` }}/></div>
      <div className="mt-5 flex flex-wrap gap-2">{(automation.times || ['07:00', '15:00', '21:00']).map((slot: string) => <span key={slot} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800"><Clock size={14}/>{slot}</span>)}<span className="self-center text-xs text-[#74857c]">Todos os dias · Horário de Brasília</span></div>
      <p className="mt-4 text-sm leading-6 text-[#74857c]">Grupos com pelo menos 100 participantes, conversa aberta e divulgação permitida. O primeiro envio aguarda completar a meta. A busca roda no servidor, com no máximo uma nova entrada por rodada e intervalo mínimo de dois minutos. A cada disparo, a participação e a permissão de fala são conferidas. Quando um grupo fica indisponível, a automação procura outro na WAZZO e atualiza os destinos da campanha Oferta Grolpy (Cópia).</p>
      {automation.lastError && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{automation.lastError}</p>}
      {automation.requestedBatch && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Solicitação de mais {automation.requestedBatch.requested} grupos independentes: {automation.requestedBatch.confirmedJids.length}/{automation.requestedBatch.requested} entradas confirmadas. Comunidades e grupos vinculados a comunidades são excluídos.</p>}
      {automation.diagnostics && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><p className="font-semibold">{automation.diagnostics.attempts} convites verificados</p>{Object.entries(automation.diagnostics.reasons || {}).map(([reason, count]) => <p key={reason} className="mt-1 text-xs">{String(count)} · {reason}</p>)}</div>}
      {automation.lastOperation && <p className="mt-3 text-xs text-[#74857c]">Última etapa: {automation.lastOperation}</p>}
      {automation.syncAt > 0 && <p className="mt-2 text-xs text-[#74857c]">Participações consultadas com sucesso: {time(automation.syncAt)}</p>}
      {automation.updatedAt && <p className="mt-3 text-xs text-[#74857c]">Última tentativa: {time(automation.updatedAt)}{automation.nextRunAt > Date.now() ? ` · Próxima tentativa: ${time(automation.nextRunAt)}` : ''}</p>}
      {automation.version && <button disabled={saving} onClick={toggle} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#123f31] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{automation.enabled ? <Pause size={16}/> : <Play size={16}/>}{saving ? 'Salvando…' : automation.enabled ? 'Pausar automação e envios' : 'Retomar automação'}</button>}
      {automation.version && <button disabled={saving || !automation.enabled || (automation.requestedBatch && automation.requestedBatch.confirmedJids.length < automation.requestedBatch.requested)} onClick={requestTwenty} className="ml-2 mt-5 rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-900 disabled:opacity-50">Solicitar mais 20 grupos</button>}
      {!!automation.events?.length && <div className="mt-6 border-t border-emerald-50 pt-4"><h3 className="text-sm font-bold text-[#203b30]">Atividade recente</h3><ul className="mt-3 space-y-3">{automation.events.slice(0, 5).map((event: any, i: number) => <li key={`${event.at}-${i}`} className="text-xs leading-5 text-[#74857c]"><span className="font-semibold">{time(event.at)}</span> · {event.text}</li>)}</ul></div>}
    </section>}
    <div className="mt-5 grid gap-3 sm:grid-cols-3">{[[Users, 'Explore grupos', 'Descubra grupos por interesse e categoria.'], [ShieldCheck, 'Selo de verificação', 'Sua conta WAZZO recebe o benefício de verificação Groply.'], [Sparkles, 'Benefícios incluídos', 'Com sua assinatura Groply ativa, o benefício WAZZO também fica disponível.']].map(([Icon, title, desc]: any) => <article key={title} className="rounded-3xl bg-white p-5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={20}/></span><h2 className="mt-4 font-black text-[#203b30]">{title}</h2><p className="mt-1.5 text-sm leading-5 text-[#74857c]">{desc}</p></article>)}</div>
  </div></main>;
};
