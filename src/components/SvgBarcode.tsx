import React, { useMemo } from 'react';
import { encodeCode128B } from '../utils/code128';

interface SvgBarcodeProps {
  code: string;
  height?: number;
  showText?: boolean;
  className?: string;
  maxSvgWidth?: number;
}

export const SvgBarcode: React.FC<SvgBarcodeProps> = ({
  code,
  height = 42,
  showText = false,
  className = '',
  maxSvgWidth = 240
}) => {
  const encoded = useMemo(() => {
    return encodeCode128B(code || 'ITEM');
  }, [code]);

  const blackBars = useMemo(() => {
    return encoded.bars.filter(b => b.isBlack);
  }, [encoded]);

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${encoded.totalWidth} ${height}`}
        style={{ width: '100%', maxWidth: `${maxSvgWidth}px`, height: `${height}px` }}
        className="overflow-visible"
        shapeRendering="crispEdges"
      >
        {/* Background white rect for contrast */}
        <rect x="0" y="0" width={encoded.totalWidth} height={height} fill="#ffffff" />
        {/* Crisp black bars */}
        {blackBars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      {showText && (
        <div className="font-mono text-[10px] sm:text-xs font-black tracking-widest text-slate-900 mt-1">
          *{code}*
        </div>
      )}
    </div>
  );
};
