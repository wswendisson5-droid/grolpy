import React, { useState } from 'react';
import { Settings, Shield, Clock, Bell, Check } from 'lucide-react';

export const ClientConfiguracoesView: React.FC = () => {
  const [minInterval, setMinInterval] = useState('45');
  const [maxInterval, setMaxInterval] = useState('90');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs flex flex-col gap-1">
        <h1 className="text-xl font-extrabold text-[#11241c]">Configurações da Conta</h1>
        <p className="text-xs text-[#5f7368]">Ajuste intervalos de segurança, horários e preferências da sua conta</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e5ebe7] shadow-xs flex flex-col gap-5 max-w-2xl">
        {/* Anti-block Interval */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#109353]" />
            <h3 className="font-bold text-sm text-[#11241c]">Intervalo Inteligente Anti-Bloqueio</h3>
          </div>
          <p className="text-xs text-[#63756b]">Define uma pausa aleatória entre os envios em cada grupo para máxima segurança.</p>
          
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#485c51]">Tempo mínimo (segundos)</label>
              <input
                type="number"
                value={minInterval}
                onChange={(e) => setMinInterval(e.target.value)}
                className="p-2.5 bg-[#f8faf9] border border-[#d8e2dc] rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-[#109353]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#485c51]">Tempo máximo (segundos)</label>
              <input
                type="number"
                value={maxInterval}
                onChange={(e) => setMaxInterval(e.target.value)}
                className="p-2.5 bg-[#f8faf9] border border-[#d8e2dc] rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-[#109353]"
              />
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="flex flex-col gap-2 pt-4 border-t border-[#f0f4f1]">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#109353]" />
            <h3 className="font-bold text-sm text-[#11241c]">Janela de Horário Permitido</h3>
          </div>
          <p className="text-xs text-[#63756b]">Apenas realize disparos automáticos durante este período do dia.</p>
          
          <div className="flex items-center gap-3 mt-1">
            <input
              type="time"
              defaultValue="08:00"
              className="p-2.5 bg-[#f8faf9] border border-[#d8e2dc] rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-[#109353]"
            />
            <span className="text-xs font-bold text-[#63756b]">até</span>
            <input
              type="time"
              defaultValue="21:30"
              className="p-2.5 bg-[#f8faf9] border border-[#d8e2dc] rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:border-[#109353]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-[#f0f4f1]">
          {savedSuccess ? (
            <span className="text-xs font-bold text-[#109353] flex items-center gap-1">
              <Check size={14} /> Configurações salvas com sucesso!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#109353] hover:bg-[#0e8048] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
};
