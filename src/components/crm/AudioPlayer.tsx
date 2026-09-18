import React, { useState, useRef, useEffect } from 'react';
import { HugeIcon, PlayIcon, PauseIcon, LoaderIcon, VolumeIcon, VolumeMuteIcon } from '../icons/HugeIcon';

interface AudioPlayerProps {
  src: string;
  duration?: number | string;
  isOutbound?: boolean;
  senderName?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  duration: initialDuration,
  isOutbound = false,
  senderName,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    if (typeof initialDuration === 'number' && initialDuration > 0) return initialDuration;
    if (typeof initialDuration === 'string') {
      const parts = initialDuration.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
    }
    return 0;
  });
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Deterministic bar heights for WhatsApp-like waveform
  const waveformBars = [
    30, 45, 75, 90, 60, 40, 65, 80, 100, 70, 50, 85, 95, 60, 45, 75, 90, 100,
    65, 50, 70, 85, 60, 40, 55, 70, 45, 30,
  ];

  const progress = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;
  const activeBarIndex = Math.floor(progress * waveformBars.length);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (hasError) {
      // Retry loading
      setHasError(false);
      setIsLoading(true);
      audioRef.current.load();
      audioRef.current.play().catch(() => setHasError(true));
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsLoading(false);
          setHasError(true);
        });
    }
  };

  const cycleSpeed = () => {
    const nextSpeed: Record<number, 1 | 1.5 | 2> = {
      1: 1.5,
      1.5: 2,
      2: 1,
    };
    const newSpeed = nextSpeed[playbackSpeed] || 1;
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioRef.current.muted = newMute;
  };

  // Handle clicking anywhere on the waveform progress bar to seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || totalDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = ratio * totalDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  return (
    <div
      className={`flex items-center gap-3 py-1.5 px-1 min-w-[240px] max-w-[320px] select-none ${
        isOutbound ? 'text-[#12382c]' : 'text-[#1d3528]'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setTotalDuration(audioRef.current.duration);
          }
          setIsLoading(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Play / Pause / Loading Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer ${
          isOutbound
            ? 'bg-[#12382c] text-white hover:bg-[#0c261e]'
            : 'bg-[#12382c] text-white hover:bg-[#0c261e]'
        }`}
        title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
      >
        {isLoading ? (
          <div className="animate-spin text-white">
            <HugeIcon icon={LoaderIcon} size={18} />
          </div>
        ) : isPlaying ? (
          <HugeIcon icon={PauseIcon} size={18} className="fill-white" />
        ) : (
          <HugeIcon icon={PlayIcon} size={18} className="fill-white translate-x-0.5" />
        )}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="h-7 flex items-center gap-[2.5px] cursor-pointer group/wave py-1"
          title="Clique para avançar/retroceder"
        >
          {waveformBars.map((barHeight, idx) => {
            const isActive = idx <= activeBarIndex;
            return (
              <span
                key={idx}
                style={{ height: `${barHeight}%` }}
                className={`w-[3px] rounded-full transition-colors duration-150 ${
                  isActive
                    ? isOutbound
                      ? 'bg-[#12382c]'
                      : 'bg-[#12382c]'
                    : isOutbound
                    ? 'bg-[#89bca1] group-hover/wave:bg-[#72a98c]'
                    : 'bg-[#c5d6cc] group-hover/wave:bg-[#a9c2b3]'
                }`}
              />
            );
          })}
        </div>

        {/* Time display & Status */}
        <div className="flex items-center justify-between text-[11px] font-medium leading-none">
          <span className={isOutbound ? 'text-[#2b5741]' : 'text-[#567262]'}>
            {isPlaying || currentTime > 0
              ? `${formatTime(currentTime)} / ${formatTime(totalDuration || 0)}`
              : formatTime(totalDuration || 0)}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Speed Pill */}
            <button
              type="button"
              onClick={cycleSpeed}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-colors cursor-pointer ${
                isOutbound
                  ? 'bg-[#bfe0cd] text-[#12382c] hover:bg-[#a7d3b8]'
                  : 'bg-[#e4ede7] text-[#12382c] hover:bg-[#d5e3da]'
              }`}
              title="Velocidade de reprodução"
            >
              {playbackSpeed}x
            </button>

            {/* Mute toggle button */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                isOutbound ? 'text-[#2b5741] hover:text-[#12382c]' : 'text-[#567262] hover:text-[#12382c]'
              }`}
              title={isMuted ? 'Ativar som' : 'Silenciar'}
            >
              <HugeIcon icon={isMuted ? VolumeMuteIcon : VolumeIcon} size={13} />
            </button>
          </div>
        </div>

        {hasError && (
          <span className="text-[10px] text-amber-700 font-medium">
            Falha ao carregar áudio. Clique para tentar novamente.
          </span>
        )}
      </div>
    </div>
  );
};
