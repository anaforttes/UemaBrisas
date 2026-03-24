import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, light = false }) => {
  const scales = { sm: 0.6, md: 0.75, lg: 1, xl: 1.4 };
  const s = scales[size];

  return (
    <div className="flex items-center group">
      <svg
        viewBox="0 0 340 100"
        xmlns="http://www.w3.org/2000/svg"
        width={340 * s}
        height={100 * s}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>
        </defs>

        {/* Ícone */}
        <rect x="8" y="10" width="76" height="76" rx="20" fill="url(#logoGrad)"/>

        {/* Casa */}
        <path d="M46 22 L24 40 L30 40 L30 64 L62 64 L62 40 L68 40 Z"
              fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round"/>

        {/* Porta */}
        <rect x="40" y="50" width="12" height="14" rx="3" fill="white" fillOpacity="0.9"/>

        {/* Círculo checkmark */}
        <circle cx="60" cy="34" r="10" fill="#2563eb" stroke="white" strokeWidth="2"/>
        <path d="M55 34 L58.5 37.5 L65 30"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

        {/* Texto */}
        <text x="98" y="52"
              fontFamily="system-ui,-apple-system,sans-serif"
              fontSize="30" fontWeight="900" letterSpacing="-0.5"
              fill={light ? '#ffffff' : '#0f172a'}>
          Reguliza
        </text>
        <text x="240" y="52"
              fontFamily="system-ui,-apple-system,sans-serif"
              fontSize="30" fontWeight="900" letterSpacing="-0.5"
              fill="#2563eb">
          AI
        </text>

        {/* Linha decorativa */}
        <rect x="98" y="58" width="155" height="2.5" rx="2" fill="#2563eb" fillOpacity="0.3"/>

        {/* Subtítulo */}
        {size !== 'sm' && (
          <text x="98" y="76"
                fontFamily="system-ui,-apple-system,sans-serif"
                fontSize="10" fontWeight="700" letterSpacing="2.5"
                fill={light ? '#93c5fd' : '#64748b'}>
            REGULARIZAÇÃO FUNDIÁRIA
          </text>
        )}
      </svg>
    </div>
  );
};