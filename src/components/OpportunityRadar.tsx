import React, { useState } from 'react';
import { Opportunity, RadarStatus, MonitoredGroup, CurrentScanState } from '../types/nexus';
import { NexusLogo } from './NexusLogo';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Radio, Sparkles } from 'lucide-react';

interface OpportunityRadarProps {
  opportunities: Opportunity[];
  radarStatus: RadarStatus;
  selectedOpportunityId?: string | null;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onToggleStatus: () => void;
  groups?: MonitoredGroup[];
  currentScan?: CurrentScanState;
  onAddGroup?: () => void;
}

export const OpportunityRadar: React.FC<OpportunityRadarProps> = ({
  opportunities,
  radarStatus,
  selectedOpportunityId,
  onSelectOpportunity,
  groups = [],
  currentScan,
  onAddGroup,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  const isRunning = radarStatus === 'active';

  return (
    <div
      id="opportunity-radar-container"
      className="relative w-full h-[360px] xs:h-[390px] sm:h-[450px] md:h-[490px] lg:h-[530px] rounded-2xl sm:rounded-3xl bg-[#eff6f2] border border-[#e2ece6] overflow-hidden select-none shadow-[0_2px_12px_rgba(20,60,45,0.03)]"
    >
      {/* 1. Subtle Cartographic / Urban Grid Vector Background (decorative, very soft) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25 sm:opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 600"
        preserveAspectRatio="none"
      >
        <path
          d="M-50,220 C120,240 280,180 430,260 C580,340 680,260 850,290"
          stroke="#9fcbb6"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M-50,380 C180,350 320,440 500,410 C650,380 750,470 850,430"
          stroke="#9fcbb6"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M150,-50 C190,140 260,300 240,480 C230,550 250,620 260,650"
          stroke="#9fcbb6"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M620,-50 C600,160 560,320 630,480 C660,540 650,610 670,650"
          stroke="#9fcbb6"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M50,100 C200,90 400,120 520,70 C640,20 720,60 850,50"
          stroke="#b4d7c6"
          strokeWidth="0.8"
          strokeDasharray="4 6"
          fill="none"
        />
        <path
          d="M-30,520 C180,510 360,560 540,510 C690,470 780,520 850,500"
          stroke="#b4d7c6"
          strokeWidth="0.8"
          strokeDasharray="5 7"
          fill="none"
        />
      </svg>

      {/* 2. Concentric Radar Rings & Crosshairs (SVG) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center ambient glow */}
        <circle cx="500" cy="500" r="140" fill="url(#centerGlow)" />

        {/* Concentric rings */}
        <circle
          cx="500"
          cy="500"
          r="80"
          stroke="#b8dacf"
          strokeWidth="1.2"
          fill="none"
        />
        <circle
          cx="500"
          cy="500"
          r="160"
          stroke="#b8dacf"
          strokeWidth="1.2"
          fill="none"
        />
        <circle
          cx="500"
          cy="500"
          r="250"
          stroke="#b8dacf"
          strokeWidth="1.2"
          fill="none"
        />
        <circle
          cx="500"
          cy="500"
          r="340"
          stroke="#b8dacf"
          strokeWidth="1"
          strokeDasharray="3 4"
          fill="none"
        />
        <circle
          cx="500"
          cy="500"
          r="430"
          stroke="#c5e2d8"
          strokeWidth="1.2"
          fill="none"
        />
        <circle
          cx="500"
          cy="500"
          r="520"
          stroke="#d2eae1"
          strokeWidth="1"
          fill="none"
        />

        {/* Radial crosshair axes */}
        <line
          x1="0"
          y1="500"
          x2="1000"
          y2="500"
          stroke="#c5e0d6"
          strokeWidth="0.8"
          strokeDasharray="4 4"
        />
        <line
          x1="500"
          y1="0"
          x2="500"
          y2="1000"
          stroke="#c5e0d6"
          strokeWidth="0.8"
          strokeDasharray="4 4"
        />
        <line
          x1="150"
          y1="150"
          x2="850"
          y2="850"
          stroke="#d0e5dc"
          strokeWidth="0.6"
          strokeDasharray="2 6"
        />
        <line
          x1="850"
          y1="150"
          x2="150"
          y2="850"
          stroke="#d0e5dc"
          strokeWidth="0.6"
          strokeDasharray="2 6"
        />
      </svg>

      {/* 3. Rotating Sweep Beam */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{
          transformOrigin: '50% 50%',
          animation: 'radarSweep 16s linear infinite',
          animationPlayState: isRunning ? 'running' : 'paused',
        }}
      >
        <div
          className="relative w-[1200px] h-[1200px] rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(16, 185, 129, 0.16) 0deg, rgba(16, 185, 129, 0.05) 35deg, rgba(16, 185, 129, 0) 65deg, transparent 65deg)',
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 w-[600px] h-[1.5px] origin-left bg-gradient-to-r from-[#10b981] via-[#34d399] to-transparent shadow-[0_0_8px_#10b981]"
            style={{ transform: 'rotate(0deg)' }}
          />
        </div>
      </div>

      {/* 4. Center Core: NEXUS Emblem Badge */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center pointer-events-none">
        {isRunning && (
          <div className="absolute w-14 h-14 sm:w-20 sm:h-20 rounded-full border border-emerald-400/40 animate-ping opacity-60 pointer-events-none" />
        )}
        <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#12382c] border-2 border-[#1c4d3d] shadow-[0_4px_18px_rgba(18,56,44,0.35)] flex items-center justify-center">
          <NexusLogo size={22} white className="sm:scale-125" />
        </div>
      </div>

      {/* Top Header Controls / Groups Badge */}
      <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-30 flex items-center gap-2 max-w-[calc(100%-20px)]">
        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 backdrop-blur-xs border border-[#cfe2d7] shadow-sm text-[11px] sm:text-xs font-semibold text-[#143d2f]">
          <Users size={13} className="text-emerald-600 shrink-0" />
          <span className="truncate">{groups.length} Grupos Monitorados</span>
          {onAddGroup && (
            <button
              onClick={onAddGroup}
              className="ml-1 text-[10px] sm:text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold transition-colors cursor-pointer shrink-0"
              title="Gerenciar grupos"
            >
              + Adicionar
            </button>
          )}
        </div>
      </div>

      {/* 5. Monitored Groups Orbiting inside the Radar Rings */}
      {groups.map((grp, idx) => {
        const total = groups.length || 1;
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        // Radial placement at ~37% from center
        const x = 50 + 37 * Math.cos(angle);
        const y = 50 + 37 * Math.sin(angle);
        const isScanningThis =
          currentScan?.groupJid === grp.id ||
          (currentScan?.groupIndex === idx + 1 && isRunning);
        const isHovered = hoveredGroupId === grp.id;

        return (
          <div
            key={grp.id || `grp-${idx}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-25 group"
            onMouseEnter={() => setHoveredGroupId(grp.id)}
            onMouseLeave={() => setHoveredGroupId(null)}
          >
            <div className="relative cursor-pointer" onClick={onAddGroup}>
              {/* Scanning Beacon Ripple */}
              {isScanningThis && isRunning && (
                <div className="absolute -inset-2 rounded-full bg-emerald-400/40 animate-ping pointer-events-none" />
              )}

              {/* Group Avatar Circle */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center bg-white shadow-md ${
                  isScanningThis
                    ? 'ring-3 ring-emerald-400 border-2 border-white scale-125 z-30 shadow-[0_0_16px_rgba(16,185,129,0.8)]'
                    : 'border-2 border-[#b0d5c4] hover:border-emerald-500 hover:scale-115 opacity-90 hover:opacity-100'
                }`}
              >
                <img
                  src={grp.avatar}
                  alt={grp.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Status indicator dot */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                  isScanningThis ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'
                }`}
              />

              {/* Scanning status tag if actively being queried */}
              {isScanningThis && isRunning && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-[#12382c] text-emerald-300 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-emerald-500/40 pointer-events-none animate-bounce">
                  Varrendo #{idx + 1}
                </div>
              )}

              {/* Tooltip on Hover / Touch */}
              {isHovered && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-11 z-50 bg-[#12382c] text-white px-2.5 py-1 rounded-xl text-xs font-semibold shadow-xl border border-emerald-800 whitespace-nowrap pointer-events-none flex flex-col items-center">
                  <span className="text-emerald-100 max-w-[180px] truncate">{grp.name}</span>
                  <span className="text-[9.5px] text-emerald-300 font-normal">
                    {grp.messageCount ? `${grp.messageCount} msgs` : 'Monitorado'} • Grupo {idx + 1} de {total}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 6. Detected Opportunity Dots & Highlight Tags */}
      {opportunities.map((opp) => {
        const isSelected = selectedOpportunityId === opp.id;
        const isHovered = hoveredId === opp.id;
        const isHighlight = opp.radarCoords.isMainHighlight;

        return (
          <div
            key={opp.id}
            id={`radar-point-${opp.id}`}
            style={{
              left: `${opp.radarCoords.x}%`,
              top: `${opp.radarCoords.y}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group cursor-pointer"
            onClick={() => onSelectOpportunity(opp)}
            onMouseEnter={() => setHoveredId(opp.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Generous touch hit area (44px min for mobile touch ergonomics) */}
            <div className="relative w-11 h-11 flex items-center justify-center -m-4">
              {/* Outer pulsing ring */}
              {(isSelected || (opp.score >= 80 && isRunning)) && (
                <div
                  className={`absolute rounded-full border pointer-events-none ${
                    isSelected
                      ? 'w-8 h-8 sm:w-9 sm:h-9 border-emerald-600 bg-emerald-500/20 animate-pulse'
                      : 'w-5 h-5 sm:w-6 sm:h-6 border-emerald-500/40 animate-ping'
                  }`}
                />
              )}

              {/* Dot Center */}
              <div
                className={`transition-all duration-200 rounded-full flex items-center justify-center shadow-xs ${
                  isSelected
                    ? 'w-4.5 h-4.5 sm:w-5 sm:h-5 bg-[#12382c] ring-3 ring-emerald-400'
                    : isHovered
                    ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#12382c] ring-2 ring-emerald-500'
                    : opp.score >= 80
                    ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#059669] border border-white'
                    : opp.score >= 65
                    ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#0d9488] border border-white'
                    : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#2d3748] border border-white/80'
                }`}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                )}
              </div>
            </div>

            {/* Main Identification Tag / Chip */}
            {isHighlight && (
              <div
                className={`absolute left-3.5 -top-3 sm:left-4 sm:-top-3.5 flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-xs pl-0.5 sm:pl-1 pr-1.5 sm:pr-2 py-0.5 rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 hover:scale-105 pointer-events-auto ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-200 shadow-md'
                    : 'border-[#e0ebe4] hover:border-emerald-400'
                }`}
              >
                <img
                  src={opp.avatar}
                  alt={opp.title}
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0"
                />
                <div className="flex items-baseline gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] leading-none whitespace-nowrap">
                  <span className="text-[#5b6a63] font-medium">
                    {opp.category}
                  </span>
                  <span className="font-bold text-[#143d2f] text-[11px] sm:text-xs">
                    {opp.score}
                  </span>
                </div>
              </div>
            )}

            {/* Tooltip for non-highlight dots */}
            {!isHighlight && isHovered && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-1/2 -translate-x-1/2 -top-10 z-50 bg-[#12382c] text-white px-2.5 py-1 rounded-lg text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none flex items-center gap-1.5"
                >
                  <img
                    src={opp.avatar}
                    alt={opp.title}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span>{opp.title}</span>
                  <span className="bg-emerald-500/25 text-emerald-200 font-bold px-1 rounded text-[10px]">
                    {opp.score}
                  </span>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        );
      })}

      {/* 7. Floating Telemetry / Sequential Status Pill (Bottom Left) */}
      <div className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 z-30 max-w-[calc(100%-20px)] sm:max-w-[440px]">
        <div className="flex items-center gap-2 sm:gap-2.5 bg-[#142e24] text-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-[#214a3b] shadow-[0_4px_16px_rgba(10,30,22,0.25)]">
          {/* Group Avatar if currently scanning or Audio Wave */}
          {currentScan?.groupAvatar ? (
            <div className="relative shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-emerald-400">
              <img
                src={currentScan.groupAvatar}
                alt={currentScan.groupName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {isRunning && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-[2px] sm:gap-[2.5px] h-3 sm:h-3.5 px-0.5 shrink-0">
              <span
                className={`w-[2px] sm:w-[2.5px] bg-[#34d399] rounded-full transition-all duration-300 ${
                  isRunning ? 'animate-[wave_1s_ease-in-out_infinite]' : 'h-2'
                }`}
                style={{ height: isRunning ? '60%' : '30%' }}
              />
              <span
                className={`w-[2px] sm:w-[2.5px] bg-[#34d399] rounded-full transition-all duration-300 ${
                  isRunning ? 'animate-[wave_1.2s_ease-in-out_0.2s_infinite]' : 'h-3'
                }`}
                style={{ height: isRunning ? '100%' : '60%' }}
              />
              <span
                className={`w-[2px] sm:w-[2.5px] bg-[#34d399] rounded-full transition-all duration-300 ${
                  isRunning ? 'animate-[wave_0.8s_ease-in-out_0.4s_infinite]' : 'h-1.5'
                }`}
                style={{ height: isRunning ? '40%' : '20%' }}
              />
              <span
                className={`w-[2px] sm:w-[2.5px] bg-[#34d399] rounded-full transition-all duration-300 ${
                  isRunning ? 'animate-[wave_1.1s_ease-in-out_0.1s_infinite]' : 'h-2.5'
                }`}
                style={{ height: isRunning ? '80%' : '40%' }}
              />
            </div>
          )}

          <div className="flex flex-col min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                {currentScan?.totalGroups
                  ? `Grupo ${currentScan.groupIndex || 1} de ${currentScan.totalGroups}`
                  : 'Radar Ativo'}
              </span>
              {currentScan?.status === 'opportunity_found' && (
                <span className="bg-emerald-500 text-black text-[9px] font-extrabold px-1 rounded">
                  LEAD ENCONTRADO
                </span>
              )}
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-emerald-100 font-medium leading-snug truncate max-w-[280px] sm:max-w-[360px]">
              {currentScan?.statusMessage || 'Varrendo mensagens dos grupos em tempo real...'}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded CSS for smooth radar sweep rotation and pulse wave */}
      <style>{`
        @keyframes radarSweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes wave {
          0%, 100% {
            height: 25%;
          }
          50% {
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
};
