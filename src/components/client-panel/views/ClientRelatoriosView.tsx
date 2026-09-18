import React from 'react';
import { BarChart3, TrendingUp, Users, Send, CheckCircle2, Award } from 'lucide-react';

export const ClientRelatoriosView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs flex flex-col gap-1">
        <h1 className="text-xl font-extrabold text-[#11241c]">Relatórios & Desempenho</h1>
        <p className="text-xs text-[#5f7368]">Métricas de alcance e engajamento das suas divulgações</p>
      </div>

      {/* Top 3 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#e5ebe7] shadow-xs flex flex-col gap-1">
          <span className="text-xs text-[#63756b] font-medium">Total de Pessoas Alcançadas</span>
          <span className="text-2xl font-black text-[#11241c]">~18.450</span>
          <span className="text-xs font-bold text-[#109353] mt-1">↑ 14% este mês</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#e5ebe7] shadow-xs flex flex-col gap-1">
          <span className="text-xs text-[#63756b] font-medium">Cliques & Contatos Gerados</span>
          <span className="text-2xl font-black text-[#11241c]">342</span>
          <span className="text-xs font-bold text-[#109353] mt-1">Média de 11 novos/dia</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#e5ebe7] shadow-xs flex flex-col gap-1">
          <span className="text-xs text-[#63756b] font-medium">Taxa de Eficiência</span>
          <span className="text-2xl font-black text-[#11241c]">96.8%</span>
          <span className="text-xs font-bold text-[#109353] mt-1">Zero bloqueios registrados</span>
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-3xl p-6 border border-[#e5ebe7] shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-[#11241c]">Campanhas Mais Eficientes</h3>
        <div className="flex flex-col gap-3">
          <div className="p-3.5 rounded-2xl bg-[#fafcfb] border border-[#e6eee8] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold text-xs">1</span>
              <span className="font-bold text-xs sm:text-sm text-[#11241c]">Promoção da semana (Moda & Acessórios)</span>
            </div>
            <span className="text-xs font-bold text-[#109353]">1.230 envios • 98% entrega</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#fafcfb] border border-[#e6eee8] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-[#eaf6ef] text-[#109353] flex items-center justify-center font-bold text-xs">2</span>
              <span className="font-bold text-xs sm:text-sm text-[#11241c]">Divulgação geral (Camisetas & Roupas)</span>
            </div>
            <span className="text-xs font-bold text-[#109353]">1.104 envios • 97% entrega</span>
          </div>
        </div>
      </div>
    </div>
  );
};
