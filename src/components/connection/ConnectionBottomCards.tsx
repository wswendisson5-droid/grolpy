import React from 'react';
import {
  HugeIcon,
  Message01Icon,
  UserMultipleIcon,
  ChartBarLineIcon,
  SmartPhoneIcon,
  ShieldCheckIcon,
} from '../icons/HugeIcon';

export const ConnectionBottomCards: React.FC = () => {
  const features = [
    {
      title: 'Enviar e receber mensagens',
      description: 'Atendimento direto pelo CRM',
      icon: Message01Icon,
    },
    {
      title: 'Gerenciar conversas',
      description: 'Organize seus contatos e atendimentos',
      icon: UserMultipleIcon,
    },
    {
      title: 'Acompanhar sua equipe',
      description: 'Veja o desempenho e métricas',
      icon: ChartBarLineIcon,
    },
    {
      title: 'Usar múltiplos números',
      description: 'Conecte quantos números precisar',
      icon: SmartPhoneIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-4 mt-8">
      {/* Header */}
      <div>
        <h3 className="text-base font-extrabold text-[#142d23]">
          Após conectar
        </h3>
        <p className="text-xs text-[#62746b] mt-0.5">
          Quando a conexão for estabelecida, você poderá:
        </p>
      </div>

      {/* 4 Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {features.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-[#e3ebe6] p-4.5 shadow-2xs flex items-start gap-3.5 hover:border-[#cfddd4] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f0f6f3] flex items-center justify-center text-[#12382c] shrink-0">
              <HugeIcon icon={item.icon} size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#142d23] leading-snug">
                {item.title}
              </span>
              <span className="text-[11px] text-[#63756b] mt-1 leading-snug">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-2xl bg-[#eef8f3] border border-[#cfead9] flex items-start sm:items-center gap-3.5 text-xs text-[#134937]">
        <div className="w-8 h-8 rounded-xl bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <HugeIcon icon={ShieldCheckIcon} size={18} />
        </div>
        <div className="flex flex-col">
          <strong className="font-bold text-[#12382c] text-[13px]">
            Seus dados estão seguros
          </strong>
          <span className="text-[#416254] mt-0.5 leading-relaxed">
            A conexão é feita diretamente com a Evolution API. Suas mensagens e dados são protegidos e nunca são compartilhados.
          </span>
        </div>
      </div>
    </div>
  );
};
