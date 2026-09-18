import React from 'react';

interface NexusLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  white?: boolean;
}

export const NexusLogo: React.FC<NexusLogoProps> = ({
  className = '',
  size = 36,
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="https://i.imgur.com/HqvEmQF.png"
        alt="Grouply"
        referrerPolicy="no-referrer"
        style={{ height: size, maxWidth: '100%' }}
        className="object-contain"
      />
    </div>
  );
};

export const GrouplyLogo = NexusLogo;

