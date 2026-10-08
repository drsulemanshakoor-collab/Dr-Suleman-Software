import React from 'react';

interface SahilLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SahilLogo: React.FC<SahilLogoProps> = ({
  size = 'lg',
  showSubtitle = true,
  className = '',
  onClick,
}) => {
  const sizeClasses = {
    sm: 'text-2xl tracking-tight',
    md: 'text-4xl tracking-tight',
    lg: 'text-6xl sm:text-7xl font-bold tracking-tight',
  };

  const subtitleSizeClasses = {
    sm: 'text-[10px] tracking-[0.2em] mt-0.5',
    md: 'text-xs tracking-[0.25em] mt-1',
    lg: 'text-xs sm:text-sm tracking-[0.3em] mt-2',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className={`font-black ${sizeClasses[size]} flex items-center justify-center font-sans tracking-tight`}>
        <span className="text-[#1a73e8]">S</span>
        <span className="text-[#ea4335]">A</span>
        <span className="text-[#f59e0b]">A</span>
        <span className="text-[#0284c7]">H</span>
        <span className="text-[#10b981]">I</span>
        <span className="text-[#ea4335]">L</span>
      </div>
      {showSubtitle && (
        <div
          className={`font-semibold text-slate-500 uppercase font-mono ${subtitleSizeClasses[size]}`}
        >
          QC NUMBER SEARCH ENGINE
        </div>
      )}
    </div>
  );
};
