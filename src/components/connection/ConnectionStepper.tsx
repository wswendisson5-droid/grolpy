import React from 'react';
import { ConnectionStatus } from '../../types/connection';
import { HugeIcon, CheckIcon } from '../icons/HugeIcon';

interface ConnectionStepperProps {
  status: ConnectionStatus;
}

export const ConnectionStepper: React.FC<ConnectionStepperProps> = ({ status }) => {
  // Step 1: Completed if 'connecting' or 'connected'
  const isStep1Done = status === 'connecting' || status === 'connected';
  const isStep1Active = status === 'waiting_qr' || status === 'disconnected' || status === 'reconnecting';

  // Step 2: Completed if 'connected'
  const isStep2Done = status === 'connected';
  const isStep2Active = status === 'connecting';

  // Step 3: Active/Completed if 'connected'
  const isStep3Done = status === 'connected';

  return (
    <div className="w-full max-w-2xl mx-auto py-2 px-2 sm:px-4">
      <div className="flex items-start justify-between relative w-full">
        {/* Step 1 */}
        <div className="flex flex-col items-center text-center z-10 flex-1 min-w-0 max-w-[120px] sm:max-w-[170px]">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
              isStep1Done
                ? 'bg-[#10b981] text-white shadow-xs'
                : isStep1Active
                ? 'bg-[#12382c] text-white ring-4 ring-[#e5f2ec]'
                : 'bg-[#e5ebe7] text-[#63756b]'
            }`}
          >
            {isStep1Done ? <HugeIcon icon={CheckIcon} size={14} strokeWidth={3} /> : '1'}
          </div>
          <span className="text-[11px] sm:text-[13px] font-bold text-[#142d23] mt-1.5 leading-tight truncate max-w-full px-1">
            Escanear QR
          </span>
          <span className="hidden sm:block text-[11px] text-[#6b7b72] mt-0.5 leading-tight">
            No seu WhatsApp
          </span>
        </div>

        {/* Connecting line 1-2 */}
        <div className="flex-1 h-[2px] mx-1 sm:mx-2 self-start mt-3.5 sm:mt-4 bg-[#e5ebe7] overflow-hidden min-w-[12px] max-w-[80px]">
          <div
            className={`h-full transition-all duration-500 ${
              isStep1Done ? 'w-full bg-[#10b981]' : 'w-0'
            }`}
          />
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center text-center z-10 flex-1 min-w-0 max-w-[120px] sm:max-w-[170px]">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
              isStep2Done
                ? 'bg-[#10b981] text-white shadow-xs'
                : isStep2Active
                ? 'bg-[#12382c] text-white ring-4 ring-[#e5f2ec]'
                : 'bg-[#e5ebe7] text-[#63756b]'
            }`}
          >
            {isStep2Done ? <HugeIcon icon={CheckIcon} size={14} strokeWidth={3} /> : '2'}
          </div>
          <span className="text-[11px] sm:text-[13px] font-bold text-[#142d23] mt-1.5 leading-tight truncate max-w-full px-1">
            Conectando
          </span>
          <span className="hidden sm:block text-[11px] text-[#6b7b72] mt-0.5 leading-tight">
            Aguarde segundos
          </span>
        </div>

        {/* Connecting line 2-3 */}
        <div className="flex-1 h-[2px] mx-1 sm:mx-2 self-start mt-3.5 sm:mt-4 bg-[#e5ebe7] overflow-hidden min-w-[12px] max-w-[80px]">
          <div
            className={`h-full transition-all duration-500 ${
              isStep2Done ? 'w-full bg-[#10b981]' : 'w-0'
            }`}
          />
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center text-center z-10 flex-1 min-w-0 max-w-[120px] sm:max-w-[170px]">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
              isStep3Done
                ? 'bg-[#10b981] text-white shadow-xs'
                : 'bg-[#e5ebe7] text-[#63756b]'
            }`}
          >
            {isStep3Done ? <HugeIcon icon={CheckIcon} size={14} strokeWidth={3} /> : '3'}
          </div>
          <span className="text-[11px] sm:text-[13px] font-bold text-[#142d23] mt-1.5 leading-tight truncate max-w-full px-1">
            Pronto!
          </span>
          <span className="hidden sm:block text-[11px] text-[#6b7b72] mt-0.5 leading-tight">
            Número ativo
          </span>
        </div>
      </div>
    </div>
  );
};
