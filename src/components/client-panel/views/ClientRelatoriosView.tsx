import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Send, Users, Layers3, CheckCircle2, XCircle } from 'lucide-react';
import { clientService, ClientHistoryItem } from '../../../services/clientService';

const fmt = new Intl.NumberFormat('pt-BR');

export const ClientRelatoriosView: React.FC = () => {
  const [history, setHistory] = useState<ClientHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    clientService.getHistory().then((items) => active && setHistory(items || [])).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const report = useMemo(() => {
    const success = history.filter((item) => item.status === 'delivered' || item.status === 'sent');
    const failed = history.filter((item) => item.status === 'failed');
    const reached = success.reduce((total, item) => total + Math.max(0, Number(item.groupMembersCount || 0)), 0);
    const uniqueGroups = new Set(success.map((item) => item.groupJid || item.groupName).filter(Boolean)).size;
    const campaigns = new Map<string, { title: string; sends: number; groups: Set<string>; reached: number }>();
    for (const item of success) {
      const key = item.campaignId || item.campaignTitle || 'manual';
      const current = campaigns.get(key) || { title: item.campaignTitle || 'Divulgação', sends: 0, groups: new Set<string>(), reached: 0 };
      current.sends += 1;
      current.groups.add(item.groupJid || item.groupName);
      current.reached += Math.max(0, Number(item.groupMembersCount || 0));
      campaigns.set(key, current);
    }
    return { success, failed, reached, uniqueGroups, campaigns: Array.from(campaigns.values()).sort((a,b) => b.sends-a.sends).slice(0,6) };
  }, [history]);

  const cards = [
    { label: 'Envios realizados', value: report.success.length, icon: Send },
    { label: 'Pessoas nos grupos', value: report.reached, icon: Users },
    { label: 'Grupos alcançados', value: report.uniqueGroups, icon: Layers3 },
    { label: 'Falhas de envio', value: report.failed.length, icon: XCircle },
  ];

  return (
    <div className="flex-1 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {cards.map(({label,value,icon:Icon}) => (
          <div key={label} className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm min-h-[118px] flex flex-col justify-between">
            <div className="w-9 h-9 rounded-2xl bg-[#edf8f2] text-[#109353] flex items-center justify-center"><Icon size={18}/></div>
            <div><div className="text-2xl font-black text-[#11241c]">{loading ? '—' : fmt.format(value)}</div><div className="text-[11px] sm:text-xs font-semibold text-[#718178] mt-0.5">{label}</div></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5"><BarChart3 size={19} className="text-[#109353]"/><span className="font-extrabold text-[#11241c]">Desempenho por divulgação</span></div>
        {loading ? <div className="text-sm text-[#718178]">Carregando...</div> : report.campaigns.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#718178]">Os resultados aparecem aqui depois dos primeiros envios.</div>
        ) : <div className="flex flex-col gap-3">{report.campaigns.map((campaign,index) => (
          <div key={index} className="rounded-2xl bg-[#f7faf8] p-4 flex items-center justify-between gap-4">
            <div className="min-w-0"><div className="font-bold text-sm text-[#11241c] truncate">{campaign.title}</div><div className="text-[11px] text-[#718178] mt-1">{campaign.groups.size} {campaign.groups.size===1?'grupo':'grupos'} • {campaign.sends} {campaign.sends===1?'envio':'envios'}</div></div>
            <div className="text-right shrink-0"><div className="font-black text-sm text-[#109353]">{fmt.format(campaign.reached)}</div><div className="text-[10px] text-[#718178]">pessoas nos grupos</div></div>
          </div>
        ))}</div>}
      </div>

      <div className="bg-[#edf8f2] rounded-3xl p-4 flex gap-3 items-start">
        <CheckCircle2 size={18} className="text-[#109353] shrink-0 mt-0.5"/>
        <p className="text-[11px] sm:text-xs leading-relaxed text-[#53685d]">O alcance considera a quantidade de participantes registrada no grupo no momento do envio. Não representa leitura ou entrega individual para cada participante.</p>
      </div>
    </div>
  );
};
