import React, { useState } from 'react';
import {
  HugeIcon,
  PlayIcon,
  ZoomInIcon,
  DownloadIcon,
  Cancel01Icon,
  DocumentIcon,
  LoaderIcon,
  StickerIcon,
} from '../icons/HugeIcon';
import { AudioPlayer } from './AudioPlayer';

interface MediaMessageProps {
  type: 'image' | 'video' | 'sticker' | 'document' | 'audio';
  mediaUrl: string;
  caption?: string;
  fileName?: string;
  fileSize?: string;
  duration?: number;
  isOutbound?: boolean;
  senderName?: string;
}

export const MediaMessage: React.FC<MediaMessageProps> = ({
  type,
  mediaUrl,
  caption,
  fileName,
  fileSize,
  duration,
  isOutbound = false,
  senderName,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 1. Audio Message
  if (type === 'audio') {
    return (
      <AudioPlayer
        src={mediaUrl}
        duration={duration}
        isOutbound={isOutbound}
        senderName={senderName}
      />
    );
  }

  // 2. Sticker Message (WhatsApp stickers are transparent webp, rendered clean without bubble frame)
  if (type === 'sticker') {
    return (
      <div className="relative inline-block select-none my-1">
        <div className="w-32 h-32 sm:w-36 sm:h-36 relative flex items-center justify-center">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-[#0000000d] rounded-2xl animate-pulse flex items-center justify-center text-[#5c7a6b]">
              <HugeIcon icon={StickerIcon} size={28} />
            </div>
          )}
          <img
            src={mediaUrl}
            alt="Figurinha do WhatsApp"
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-contain filter drop-shadow-sm transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {imageError && (
            <div className="flex flex-col items-center justify-center p-3 text-center bg-white/70 rounded-xl border border-dashed border-gray-300">
              <HugeIcon icon={StickerIcon} size={24} className="text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500 font-medium">Figurinha</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Image Message
  if (type === 'image') {
    return (
      <div className="flex flex-col gap-1.5 w-full select-none">
        <div className="relative rounded-xl overflow-hidden group cursor-pointer max-h-80 bg-black/5">
          {!imageLoaded && !imageError && (
            <div className="w-64 h-48 bg-[#e8f0eb] animate-pulse flex items-center justify-center text-[#6e8a7c]">
              <HugeIcon icon={LoaderIcon} size={24} className="animate-spin" />
            </div>
          )}

          <img
            src={mediaUrl}
            alt={caption || 'Imagem recebida no WhatsApp'}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            onClick={() => setIsLightboxOpen(true)}
            className={`w-full max-h-80 object-cover rounded-xl transition-all duration-300 group-hover:scale-[1.01] ${
              imageLoaded ? 'block' : 'hidden'
            }`}
          />

          {imageError && (
            <div className="w-64 h-36 flex flex-col items-center justify-center p-4 text-center bg-gray-100 rounded-xl">
              <span className="text-xs font-semibold text-gray-600 mb-1">Imagem indisponível</span>
              <span className="text-[11px] text-gray-400">Falha ao baixar mídia</span>
            </div>
          )}

          {imageLoaded && (
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <div className="p-2 bg-black/60 rounded-full backdrop-blur-xs flex items-center gap-1.5 text-xs font-medium">
                <HugeIcon icon={ZoomInIcon} size={16} />
                <span>Ampliar</span>
              </div>
            </div>
          )}
        </div>

        {caption && (
          <p className="text-xs sm:text-[13px] leading-relaxed select-text mt-1 whitespace-pre-wrap">
            {caption}
          </p>
        )}

        {/* Image Fullscreen Lightbox Modal */}
        {isLightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Header / Actions */}
            <div
              className="w-full max-w-5xl flex items-center justify-between text-white pb-3 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm font-semibold truncate">
                {caption ? caption.slice(0, 50) : 'Visualizador de Imagem'}
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={mediaUrl}
                  download="whatsapp-imagem.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                  title="Baixar imagem"
                >
                  <HugeIcon icon={DownloadIcon} size={18} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="Fechar"
                >
                  <HugeIcon icon={Cancel01Icon} size={20} />
                </button>
              </div>
            </div>

            {/* Main Fullscreen Image */}
            <div
              className="relative max-w-5xl max-h-[85vh] flex items-center justify-center overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={mediaUrl}
                alt="Visualização completa"
                referrerPolicy="no-referrer"
                className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {caption && (
              <div
                className="mt-3 max-w-2xl bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm p-3 rounded-xl text-center select-text"
                onClick={(e) => e.stopPropagation()}
              >
                {caption}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 4. Video Message
  if (type === 'video') {
    return (
      <div className="flex flex-col gap-1.5 w-full select-none">
        <div className="relative rounded-xl overflow-hidden max-h-80 bg-black/10 border border-black/5">
          <video
            src={mediaUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-80 object-cover rounded-xl bg-black"
          >
            Seu navegador não suporta reprodução de vídeo.
          </video>
        </div>

        {caption && (
          <p className="text-xs sm:text-[13px] leading-relaxed select-text mt-1 whitespace-pre-wrap">
            {caption}
          </p>
        )}
      </div>
    );
  }

  // 5. Document Message
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/90 border border-[#d2e2d7] select-none hover:bg-white transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#e3efe8] flex items-center justify-center text-[#12382c] shrink-0">
          <HugeIcon icon={DocumentIcon} size={20} />
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="font-semibold text-xs text-[#12382c] truncate">
            {fileName || 'documento.pdf'}
          </span>
          <span className="text-[10px] text-[#6d8276]">
            {fileSize || 'Arquivo WhatsApp'}
          </span>
        </div>
      </div>

      <a
        href={mediaUrl}
        download={fileName || 'documento'}
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-lg bg-[#edf6f1] text-[#12382c] hover:bg-[#d5ebd9] transition-colors shrink-0"
        title="Baixar arquivo"
      >
        <HugeIcon icon={DownloadIcon} size={16} />
      </a>
    </div>
  );
};
