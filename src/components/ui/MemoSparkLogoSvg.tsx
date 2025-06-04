import type React from 'react';

interface MemoSparkLogoSvgProps {
  height: number; // Specify height in pixels
  className?: string;
}

// Aspect ratio derived from new viewBox (796.8 / 139.75 ≈ 5.702)
const ASPECT_RATIO = 796.8 / 139.75;

export const MemoSparkLogoSvg: React.FC<MemoSparkLogoSvgProps> = ({ height, className }) => {
  const width = height * ASPECT_RATIO;

  return (
    <svg
        id="memospark-logo"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 796.8 139.75"
        height={`${height}px`}
        width={`${width}px`}
        className={className} // Allow passing additional classes
        aria-label="MemoSpark Logo"
    >
        {/* Based on Asset 3lol yt.svg */}
        <defs>
            <style>
            {`
                .memospark-logo-s { 
                    font-family: 'Linea', sans-serif;
                    fill: #39b54a; /* Green S */
                    letter-spacing: 0em;
                }
                .memospark-logo-memo, .memospark-logo-park { 
                    font-family: 'Futura Heavy', sans-serif;
                    font-weight: 800;
                    fill: currentColor; /* Use currentColor for text */
                }
                .memospark-logo-text { font-size: 120.41px; }
                .memospark-logo-memo-m { letter-spacing: 0.06em; }
                .memospark-logo-memo-e { letter-spacing: 0.05em; }
                .memospark-logo-memo-o { letter-spacing: 0.07em; }
                .memospark-logo-park-p { letter-spacing: 0em; }
                .memospark-logo-park-a { letter-spacing: 0.06em; }
                .memospark-logo-park-r { letter-spacing: 0.05em; }
                .memospark-logo-park-k { letter-spacing: 0.08em; }
            `}
            </style>
        </defs>
        
        {/* Green S */}
        <text transform="translate(380.58 138.58)" className="memospark-logo-s memospark-logo-text">
            <tspan x="0" y="0">S</tspan>
        </text>
        
        {/* PARK text */}
        <text transform="translate(496.25 103.09) scale(1 .9)" className="memospark-logo-park memospark-logo-text">
            <tspan className="memospark-logo-park-p" x="0" y="0">P</tspan>
            <tspan className="memospark-logo-park-a" x="62.39" y="0">A</tspan>
            <tspan className="memospark-logo-park-r" x="150.6" y="0">R</tspan>
            <tspan className="memospark-logo-park-k" x="224.34" y="0">K</tspan>
        </text>
        
        {/* MEMO text */}
        <text transform="translate(0 103.09) scale(1 .9)" className="memospark-logo-memo memospark-logo-text">
            <tspan className="memospark-logo-memo-m" x="0" y="0">M</tspan>
            <tspan className="memospark-logo-memo-e" x="107.98" y="0">E</tspan>
            <tspan className="memospark-logo-memo-e" x="172.9" y="0">M</tspan>
            <tspan className="memospark-logo-memo-o" x="279.94" y="0">O</tspan>
        </text>
    </svg>
  );
};

export default MemoSparkLogoSvg; 