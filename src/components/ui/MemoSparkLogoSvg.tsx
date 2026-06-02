import type React from 'react';

import { cn } from '@/lib/utils';

/** Brand green for the lightning bolt — matches `hsl(142 76% 36%)`. */
const SPARK_FILL = 'hsl(142 76% 36%)';

interface MemoSparkLogoSvgProps {
  height: number;
  className?: string;
  /** Solid fill for MEMO/PARK text; overrides theme-based color */
  textColor?: string;
  /** Force light wordmark (e.g. on a primary or photo slab). Prefer `text-foreground` via default when on `bg-background`. */
  darkBackground?: boolean;
}

/**
 * Path-based MemoSpark wordmark (MEMO + bolt + PARK).
 * No `<text>` nodes or web fonts — scales cleanly at any size via viewBox + CSS height only.
 */
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
      viewBox="0 0 440 60"
      height={height}
      preserveAspectRatio="xMinYMid meet"
      className={cn(
        'block w-auto shrink-0',
        !textColor && !darkBackground && 'text-foreground',
        !textColor && darkBackground && 'text-white',
        className,
      )}
      style={{ height }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MemoSpark"
    >
      <g fill={wordmarkFill} fillRule="evenodd">
        {/* MEMO */}
        <path d="M6 52V14L24 34L42 14V52H35V22L24 31L13 22V52H6Z" />
        <path d="M50 52V14H74C82 14 88 18 88 24C88 30 82 34 74 34H56V38H76C84 38 90 42 90 48C90 54 84 58 74 58H50V52ZM56 20V30H72C76 30 78 28 78 25C78 22 76 20 72 20H56ZM56 42V52H74C78 52 80 50 80 47C80 44 78 42 74 42H56Z" />
        <path d="M94 52V14L112 34L130 14V52H123V22L112 31L101 22V52H94Z" />
        <path d="M138 14C152 14 162 24 162 34C162 44 152 54 138 54C124 54 114 44 114 34C114 24 124 14 138 14ZM138 20C128 20 120 27 120 34C120 41 128 48 138 48C148 48 156 41 156 34C156 27 148 20 138 20Z" />
        {/* PARK */}
        <path d="M224 52V14H246C256 14 264 20 264 28C264 36 256 42 246 42H232V52H224ZM232 20V36H244C248 36 250 34 250 28C250 22 248 20 244 20H232Z" />
        <path d="M270 52L278 36H290L298 52H306L286 14H274L254 52H262ZM284 30L288 22L292 30H284Z" />
        <path d="M312 52V14H334C346 14 354 22 354 32C354 40 348 46 338 48L356 52H346L330 44H320V52H312ZM320 20V38H332C340 38 344 36 344 30C344 24 340 20 332 20H320Z" />
        <path d="M360 52V14H368V32L384 14H394L378 32L396 52H386L370 36L368 38V52H360Z" />
      </g>
      {/* Lightning bolt (replaces “S” in MemoSpark) */}
      <path
        fill={SPARK_FILL}
        d="M182 10L196 28H188L200 50L180 28H188L174 10H182Z"
      />
    </svg>
  );
};

export default MemoSparkLogoSvg;
