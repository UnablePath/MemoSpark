import type React from 'react';

import { cn } from '@/lib/utils';

/** Letter anchors from `public/MemoSpark.svg` (Inkscape export). */
const PARK_TSPAN_X = '0 62.385303 150.59816 224.33784';
const MEMO_TSPAN_X = '-496.24619 -388.26117 -323.34857 -216.30257';

/**
 * Safari: pull 2nd M toward E and tighten P↔AR↔K (WebKit exaggerates gaps at small sizes).
 * Baseline coords above match all other browsers.
 */
const PARK_TSPAN_X_SAFARI = '0 58 147 218';
const MEMO_TSPAN_X_SAFARI = '-496.24619 -388.26117 -328.34857 -216.30257';

const WORDMARK_TRANSFORM = 'matrix(1,0,0,-0.9000009,496.246,28.6102)';

const WORDMARK_TEXT_STYLE: React.CSSProperties = {
  fontVariant: 'normal',
  fontWeight: 900,
  fontSize: '120.41098785px',
  fontFamily: 'Futura, Arial, sans-serif',
  fillOpacity: 1,
  fillRule: 'nonzero',
  stroke: 'none',
};

interface MemoSparkLogoSvgProps {
  height: number;
  className?: string;
  /** Solid fill for MEMO/SPARK text; overrides theme-based color */
  textColor?: string;
  /** Force light wordmark (e.g. on a primary or photo slab). Prefer `text-foreground` via default when on `bg-background`. */
  darkBackground?: boolean;
}

function WordmarkText({
  wordmarkFill,
  parkTspanX,
  memoTspanX,
  className,
}: {
  wordmarkFill: string;
  parkTspanX: string;
  memoTspanX: string;
  className: string;
}) {
  return (
    <text
      className={className}
      style={{ ...WORDMARK_TEXT_STYLE, fill: wordmarkFill }}
      transform={WORDMARK_TRANSFORM}
    >
      <tspan y="0" x={parkTspanX}>
        PARK
      </tspan>
      <tspan y="-7.6085033" x={memoTspanX}>
        MEMO
      </tspan>
    </text>
  );
}

export const MemoSparkLogoSvg: React.FC<MemoSparkLogoSvgProps> = ({
  height,
  className = '',
  textColor,
  darkBackground = false,
}) => {
  const wordmarkFill = textColor
    ? textColor
    : darkBackground
      ? '#ffffff'
      : 'currentColor';

  return (
    <svg
      viewBox="0 0 1200 199.48"
      height={height}
      preserveAspectRatio="xMinYMid meet"
      className={cn(
        'block w-auto shrink-0',
        !textColor && !darkBackground && 'text-foreground',
        !textColor && darkBackground && 'text-white',
        className,
      )}
      style={{ height, display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MemoSpark Logo"
    >
      <g transform="matrix(1.3333333,0,0,-1.3333333,0,199.48)">
        <g transform="scale(0.1)">
          <g transform="scale(10)">
            <text
              style={{
                fontVariant: 'normal',
                fontWeight: 'normal',
                fontSize: '120.41100311px',
                fontFamily: 'linea, sans-serif',
                fill: 'hsl(142, 76%, 36%)',
                fillOpacity: 1,
                fillRule: 'nonzero',
                stroke: 'none',
              }}
              transform="matrix(1,0,0,-1,380.579,11.0328)"
            >
              <tspan y="0" x="0">
                S
              </tspan>
            </text>
          </g>
          <g transform="scale(10)">
            <WordmarkText
              wordmarkFill={wordmarkFill}
              parkTspanX={PARK_TSPAN_X}
              memoTspanX={MEMO_TSPAN_X}
              className="memospark-logo-wordmark memospark-logo-wordmark--default"
            />
            <WordmarkText
              wordmarkFill={wordmarkFill}
              parkTspanX={PARK_TSPAN_X_SAFARI}
              memoTspanX={MEMO_TSPAN_X_SAFARI}
              className="memospark-logo-wordmark memospark-logo-wordmark--safari"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default MemoSparkLogoSvg;
