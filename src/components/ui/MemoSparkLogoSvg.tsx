import type React from 'react';

import { cn } from '@/lib/utils';

interface MemoSparkLogoSvgProps {
  height: number;
  className?: string;
  /** Solid fill for MEMO/SPARK text; overrides theme-based color */
  textColor?: string;
  /** Force light wordmark (e.g. on a primary or photo slab). Prefer `text-foreground` via default when on `bg-background`. */
  darkBackground?: boolean;
}

export const MemoSparkLogoSvg: React.FC<MemoSparkLogoSvgProps> = ({
  height,
  className = '',
  textColor,
  darkBackground = false,
}) => {
  const aspectRatio = 1200 / 199.48;
  const width = height * aspectRatio;

  const wordmarkFill = textColor
    ? textColor
    : darkBackground
      ? '#ffffff'
      : 'currentColor';

  return (
    <svg
      viewBox="0 0 1200 199.48"
      height={height}
      width={width}
      style={{
        height,
        width,
        display: 'block',
      }}
      className={cn(
        'mx-auto',
        !textColor && !darkBackground && 'text-foreground',
        !textColor && darkBackground && 'text-white',
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MemoSpark Logo"
    >
      <g transform="matrix(1.3333333,0,0,-1.3333333,0,199.48)">
        <g transform="scale(0.1)">
          <g transform="scale(10)">
            {/* Green Spark/Lightning Symbol */}
            <text
              style={{
                fontVariant: 'normal',
                fontWeight: 'normal',
                fontSize: '120.41100311px',
                fontFamily: 'linea, sans-serif',
                fill: 'hsl(142, 76%, 36%)',
                fillOpacity: 1,
                fillRule: 'nonzero',
                stroke: 'none'
              }}
              transform="matrix(1,0,0,-1,380.579,11.0328)"
            >
              <tspan y="0" x="0">S</tspan>
            </text>
          </g>
          <g transform="scale(10)">
            {/* MEMO and PARK Text */}
            <text
              style={{
                fontVariant: 'normal',
                fontWeight: 900,
                fontSize: '120.41098785px',
                fontFamily: 'Futura, Arial, sans-serif',
                fill: wordmarkFill,
                fillOpacity: 1,
                fillRule: 'nonzero',
                stroke: 'none'
              }}
              transform="matrix(1,0,0,-0.9000009,496.246,28.6102)"
            >
              <tspan y="0" x="0 82 168 258">PARK</tspan>
              <tspan y="-7.6085033" x="-496.246 -392.246 -310.246 -206.246">MEMO</tspan>
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
};

export default MemoSparkLogoSvg; 