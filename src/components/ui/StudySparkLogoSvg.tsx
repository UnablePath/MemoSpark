import type React from 'react';

interface StudySparkLogoSvgProps {
  height: number; // Specify height in pixels
  className?: string;
}

// Aspect ratio derived from viewBox (774.07 / 166.98 ≈ 4.6356)
const ASPECT_RATIO = 774.07 / 166.98;

export const StudySparkLogoSvg: React.FC<StudySparkLogoSvgProps> = ({ height, className }) => {
  const width = height * ASPECT_RATIO;

  return (
    <svg
        id="studyspark-logo"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 774.07 166.98"
        height={`${height}px`}
        width={`${width}px`}
        className={className} // Allow passing additional classes
        aria-label="StudySpark Logo"
    >
        {/* Extracted from public/StudySpark.svg */}
        <defs>
            <style>
            {`
                .studyspark-logo-b { letter-spacing: -0.09em; }
                .studyspark-logo-b, .studyspark-logo-c, .studyspark-logo-d, .studyspark-logo-e {
                    font-family: 'Square721 BT', sans-serif;
                    font-weight: 700;
                }
                .studyspark-logo-c { letter-spacing: -0.09em; }
                .studyspark-logo-d { letter-spacing: -0.15em; }
                .studyspark-logo-f { font-size: 120.41px; fill: currentColor; } /* Use currentColor for text */
                .studyspark-logo-g {
                    fill: #39b54a; /* Original green */
                    /* font-family will be applied via Tailwind utility class */
                    letter-spacing: -0.09em;
                 }
                .studyspark-logo-e { letter-spacing: -0.11em; }
            `}
            </style>
        </defs>
        <text className="studyspark-logo-f" transform="translate(0 138.58)">
            <tspan className="studyspark-logo-b" x="0" y="0">STU</tspan>
            <tspan className="studyspark-logo-e" x="219.35" y="0">D</tspan>
            <tspan className="studyspark-logo-c" x="299.23" y="0">Y</tspan>
            {/* Apply green fill directly or via class */}
            <tspan className="studyspark-logo-g font-linea" x="371.11" y="0">S</tspan>
            <tspan className="studyspark-logo-d" x="464.45" y="0">P</tspan>
            <tspan className="studyspark-logo-b" x="533.39" y="0">ARK</tspan>
        </text>
    </svg>
  );
};

export default StudySparkLogoSvg;
