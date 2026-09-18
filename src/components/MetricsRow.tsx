import React from 'react';
import { MetricCardData } from '../types/nexus';
import { Sparkles, MessageSquare, ShieldCheck, Clock } from 'lucide-react';

interface MetricsRowProps {
  metrics: MetricCardData[];
}

export const MetricsRow: React.FC<MetricsRowProps> = ({ metrics }) => {
  const getIcon = (type: MetricCardData['iconType']) => {
    switch (type) {
      case 'sparkle':
        return <Sparkles size={15} className="text-[#3c4a42]" />;
      case 'chat':
        return <MessageSquare size={15} className="text-[#3c4a42]" />;
      case 'analysis':
        return <ShieldCheck size={15} className="text-[#3c4a42]" />;
      case 'timer':
        return <Clock size={15} className="text-[#3c4a42]" />;
      default:
        return <Sparkles size={15} className="text-[#3c4a42]" />;
    }
  };

  return (
    <div
      id="nexus-metrics-row"
      className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 select-none"
    >
      {metrics.map((metric) => {
        const isPositive = metric.changeType === 'positive';

        return (
          <div
            key={metric.id}
            id={`metric-card-${metric.id}`}
            className="bg-white rounded-2xl p-3 sm:p-4 border border-[#e8eee9] shadow-[0_1px_3px_rgba(18,56,44,0.02)] flex flex-col justify-between gap-1 transition-all hover:border-[#d7e2dc]"
          >
            {/* Top row: Icon + Number + Percentage badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#f5f8f6] border border-[#e6ede8] flex items-center justify-center shrink-0">
                  {getIcon(metric.iconType)}
                </div>
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#162921]">
                  {metric.value}
                </span>
              </div>

              <div
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-0.5 ${
                  isPositive
                    ? 'bg-[#ecf7f1] text-[#059669]'
                    : 'bg-[#f2f5f3] text-[#6b7b73]'
                }`}
              >
                <span>{metric.change}</span>
              </div>
            </div>

            {/* Bottom row: label */}
            <span className="text-[11px] sm:text-xs font-medium text-[#65766e] mt-1 truncate">
              {metric.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
