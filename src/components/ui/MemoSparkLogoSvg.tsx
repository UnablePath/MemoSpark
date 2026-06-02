import type React from 'react';

import { cn } from '@/lib/utils';

/** Default MEMO letter anchors from brand SVG. */
const MEMO_TSPAN_X_DEFAULT = '-496.246 -392.246 -310.246 -206.246';
/** Safari: slightly wider M→E gap (WebKit subpixel kerning at small heights). */
const MEMO_TSPAN_X_SAFARI = '-496.246 -384.246 -310.246 -206.246';

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

function MemoWordmarkText({
  wordmarkFill,
  memoTspanX,
  className,
}: {
  wordmarkFill: string;
  memoTspanX: string;
  className: string;
}) {
  return (
    <text
      className={className}
      style={{ ...WORDMARK_TEXT_STYLE, fill: wordmarkFill }}
      transform="matrix(1,0,0,-1,496.246,28.6102)"
    >
      <tspan y="0" x="0 82 168 258">
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
            <MemoWordmarkText
              wordmarkFill={wordmarkFill}
              memoTspanX={MEMO_TSPAN_X_DEFAULT}
              className="memospark-logo-memo memospark-logo-memo--default"
            />
            <MemoWordmarkText
              wordmarkFill={wordmarkFill}
              memoTspanX={MEMO_TSPAN_X_SAFARI}
              className="memospark-logo-memo memospark-logo-memo--safari"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default MemoSparkLogoSvg;
