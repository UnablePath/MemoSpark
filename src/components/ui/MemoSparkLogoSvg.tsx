import React from 'react';

interface MemoSparkLogoSvgProps {
  height: number;
  className?: string;
  textColor?: string; // Optional prop to override text color
  darkBackground?: boolean; // Helper prop to determine if on dark background
}

export const MemoSparkLogoSvg: React.FC<MemoSparkLogoSvgProps> = ({ 
  height, 
  className = '',
  textColor,
  darkBackground = false
}) => {
  // Calculate proportional width based on original dimensions (1062.4 x 199.48)
  const aspectRatio = 1062.4 / 199.48;
  const width = height * aspectRatio;
  
  // Determine text color: explicit prop > context-based > CSS custom property > theme-aware fallback
  const logoTextColor = textColor || 
    (darkBackground ? '#ffffff' : 'hsl(var(--foreground))') ||
    'var(--logo-text-color, hsl(var(--foreground)))';
  
  return (
    <svg
      viewBox="0 0 1062.4 199.48"
      height={height}
      width={width}
      style={{ 
        height, 
        width, 
        display: 'block',
        '--logo-text-color': logoTextColor
      } as React.CSSProperties}
      className={`${className} mx-auto`}
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
                fill: 'hsl(142, 76%, 36%)', // Always use the primary green color
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
                fill: logoTextColor, // Use adaptive color
                fillOpacity: 1,
                fillRule: 'nonzero',
                stroke: 'none'
              }}
              transform="matrix(1,0,0,-0.9000009,496.246,28.6102)"
            >
              <tspan y="0" x="0 62.385303 150.59816 224.33784">PARK</tspan>
              <tspan y="-7.6085033" x="-496.24619 -388.26117 -323.34857 -216.30257">MEMO</tspan>
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
};

export default MemoSparkLogoSvg; 