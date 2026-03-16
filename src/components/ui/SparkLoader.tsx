'use client';

import type React from 'react';

interface SparkLoaderProps {
  size?: number;
  label?: string;
}

export const SparkLoader: React.FC<SparkLoaderProps> = ({ size = 64, label = 'Loading MemoSpark' }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4" aria-live="polite" aria-label={label}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="MemoSpark loading animation"
        className="drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]"
      >
        <path
          d="M36 4L14 32H29L24 60L50 26H35L36 4Z"
          className="fill-emerald-400"
          style={{
            animation: 'sparkPulse 1.2s ease-in-out infinite',
            transformOrigin: 'center',
          }}
        />
      </svg>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500"
          style={{ animation: 'sparkBar 1.6s ease-in-out infinite' }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <style jsx>{`
        @keyframes sparkPulse {
          0%,
          100% {
            transform: scale(0.9);
            opacity: 0.7;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes sparkBar {
          0% {
            transform: translateX(-65%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          path,
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
