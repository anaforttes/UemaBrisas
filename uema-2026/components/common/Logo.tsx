import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  light = false,
}) => {
  const scales = {
    sm: 0.6,
    md: 0.75,
    lg: 1,
    xl: 1.4,
  };

  const s = scales[size];

  return (
    <div className="flex items-center group">
      <svg
        viewBox="0 0 320 110"
        xmlns="http://www.w3.org/2000/svg"
        width={320 * s}
        height={110 * s}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Ícone */}
        <rect x="4" y="12" width="76" height="76" rx="20" fill="url(#logoGrad)" />

        {/* Casa */}
        <path
          d="M42 24 L20 42 L26 42 L26 66 L58 66 L58 42 L64 42 Z"
          fill="white"
          fillOpacity="0.15"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Porta */}
        <rect
          x="36"
          y="52"
          width="12"
          height="14"
          rx="3"
          fill="white"
          fillOpacity="0.9"
        />

        {/* Círculo checkmark */}
        <circle cx="56" cy="36" r="10" fill="#2563eb" stroke="white" strokeWidth="2" />
        <path
          d="M51 36 L54.5 39.5 L61 32"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {showText && (
          <>
            {/* Texto principal */}
            <text
              x="80"
              y="54"
              fontFamily="system-ui,-apple-system,sans-serif"
              fontSize="28"
              fontWeight="900"
              letterSpacing="-0.5"
            >
              <tspan fill={light ? '#ffffff' : '#0f172a'}>Reguliza</tspan>
              <tspan fill="#2563eb"> AI</tspan>
            </text>

            {/* Linha decorativa */}
            <rect
              x="80"
              y="62"
              width="160"
              height="2"
              rx="2"
              fill="#2563eb"
              fillOpacity="0.3"
            />

            {/* Subtítulo */}
            {size !== 'sm' && (
              <text
                x="80"
                y="88"
                fontFamily="system-ui,-apple-system,sans-serif"
                fontSize="10"
                fontWeight="700"
                letterSpacing="2.5"
                fill={light ? '#93c5fd' : '#64748b'}
              >
                REGULARIZAÇÃO FUNDIÁRIA
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
};