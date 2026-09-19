import React, { useState, useEffect } from 'react';

interface SafeAvatarProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
  sizeClassName?: string;
  shape?: 'circle' | 'rounded-2xl';
  style?: React.CSSProperties;
}

export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  src,
  alt,
  fallbackText,
  fallbackIcon,
  className = '',
  sizeClassName = 'w-10 h-10',
  shape = 'circle',
  style,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  const initial = (fallbackText || alt || 'W').trim().charAt(0).toUpperCase() || 'W';

  if (!src || hasError) {
    return (
      <div
        className={`${sizeClassName} ${shapeClass} flex items-center justify-center text-white bg-[#109353] font-bold shadow-xs shrink-0 select-none ${className}`}
        style={style}
        title={alt}
        aria-label={alt}
      >
        {fallbackIcon || <span>{initial}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${sizeClassName} ${shapeClass} object-cover shrink-0 ${className}`}
      style={style}
    />
  );
};
