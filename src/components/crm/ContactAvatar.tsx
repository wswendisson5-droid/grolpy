import React, { useState } from 'react';
import { HugeIcon, UserGroupIcon, UserIcon } from '../icons/HugeIcon';

interface ContactAvatarProps {
  avatar?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isGroup?: boolean;
  isOnline?: boolean;
  className?: string;
}

// Deterministic pastel color palette for initials
const BG_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
];

export const ContactAvatar: React.FC<ContactAvatarProps> = ({
  avatar,
  name,
  size = 'md',
  isGroup = false,
  isOnline = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Compute initials (up to 2 letters)
  const cleanName = (name || '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = '';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 1) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else {
    initials = isGroup ? 'GP' : 'WA';
  }

  // Pick deterministic color based on name
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = BG_COLORS[Math.abs(hash) % BG_COLORS.length];

  const sizeClasses = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-11 h-11 text-xs',
    lg: 'w-14 h-14 text-sm',
  }[size];

  const hasValidPhoto = Boolean(avatar && avatar.trim() && !imgError);

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      {hasValidPhoto ? (
        <img
          src={avatar}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${sizeClasses} rounded-full object-cover border border-[#d6e3dc] shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full flex items-center justify-center font-bold tracking-tight border ${
            isGroup ? 'bg-[#e7f3ee] text-[#12382c] border-[#cbe1d6]' : colorClass
          } shadow-2xs`}
        >
          {isGroup ? (
            <HugeIcon icon={UserGroupIcon} size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      )}

      {/* Online indicator dot */}
      {isOnline && !isGroup && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
      )}
    </div>
  );
};
