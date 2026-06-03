import React, { useRef, useState, useEffect, useCallback } from 'react';

const PAGE_W = 816;
const CM_TOTAL = 21.59;
const PX_PER_CM = PAGE_W / CM_TOTAL;

interface EditorRulerProps {
  zoom?: number;
  marginLeft?: number;
  marginRight?: number;
  onMarginChange?: (left: number, right: number) => void;
}

const EditorRuler: React.FC<EditorRulerProps> = ({
  zoom = 1,
  marginLeft = 96,
  marginRight = 96,
  onMarginChange,
}) => {
  const W = PAGE_W * zoom;
  const ppc = PX_PER_CM * zoom;
  const mL = marginLeft * zoom;
  const mR = marginRight * zoom;

  const rulerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<'left' | 'right' | null>(null);

  /* ── drag handlers ─────────────────────────────────────── */
  const startDrag = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent) => {
      e.preventDefault();
      setDrag(side);
    },
    []
  );

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      // x relativo ao início do ruler-inner (centrado no container)
      const containerW = rect.width;
      const offset = (containerW - W) / 2; // espaço antes do ruler-inner
      const x = (e.clientX - rect.left - offset) / zoom;

      if (drag === 'left') {
        const newL = Math.round(Math.max(20, Math.min(x, PAGE_W - marginRight - 80)));
        onMarginChange?.(newL, marginRight);
      } else {
        const newR = Math.round(Math.max(20, Math.min(PAGE_W - x, PAGE_W - marginLeft - 80)));
        onMarginChange?.(marginLeft, newR);
      }
    };

    const onUp = () => setDrag(null);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [drag, zoom, marginLeft, marginRight, onMarginChange, W]);

  /* ── ticks ─────────────────────────────────────────────── */
  const ticks: React.ReactNode[] = [];
  for (let cm = 0; cm <= Math.ceil(CM_TOTAL); cm++) {
    const x = cm * ppc;
    if (x > W + 1) break;
    ticks.push(
      <div
        key={`cm${cm}`}
        style={{
          position: 'absolute',
          left: x,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {cm > 0 && (
          <span
            style={{
              fontSize: 8,
              color: '#6b7280',
              lineHeight: 1,
              marginBottom: 1,
              userSelect: 'none',
            }}
          >
            {cm}
          </span>
        )}
        <div style={{ width: 1, height: 7, background: '#9ca3af' }} />
      </div>
    );
    if (cm < Math.ceil(CM_TOTAL)) {
      const xh = x + ppc / 2;
      if (xh < W)
        ticks.push(
          <div key={`h${cm}`} style={{ position: 'absolute', left: xh, bottom: 0 }}>
            <div style={{ width: 1, height: 4, background: '#d1d5db' }} />
          </div>
        );
    }
  }

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div
      ref={rulerRef}
      style={{
        width: '100%',
        height: 24,
        background: '#f3f4f6',
        borderBottom: '1px solid #dde1e5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        cursor: drag ? (drag === 'left' ? 'w-resize' : 'e-resize') : 'default',
      }}
    >
      <div style={{ position: 'relative', width: W, height: '100%', flexShrink: 0 }}>
        {/* Zona de margem esquerda */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: mL,
            height: '100%',
            background: '#dde0e5',
          }}
        />
        {/* Zona de margem direita */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: mR,
            height: '100%',
            background: '#dde0e5',
          }}
        />

        {/* Ticks */}
        {ticks}

        {/* Handle margem esquerda */}
        <div
          onMouseDown={startDrag('left')}
          title={`Margem esquerda: ${Math.round((marginLeft / PX_PER_CM) * 10) / 10} cm`}
          style={{
            position: 'absolute',
            left: mL - 6,
            top: 0,
            width: 12,
            height: '100%',
            cursor: 'w-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 2,
              height: 16,
              borderRadius: 2,
              background: drag === 'left' ? '#2563eb' : '#6b7280',
              transition: 'background 0.1s',
            }}
          />
        </div>

        {/* Handle margem direita */}
        <div
          onMouseDown={startDrag('right')}
          title={`Margem direita: ${Math.round((marginRight / PX_PER_CM) * 10) / 10} cm`}
          style={{
            position: 'absolute',
            right: mR - 6,
            top: 0,
            width: 12,
            height: '100%',
            cursor: 'e-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 2,
              height: 16,
              borderRadius: 2,
              background: drag === 'right' ? '#2563eb' : '#6b7280',
              transition: 'background 0.1s',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorRuler;
