import React from "react";

interface KoalaMascotProps extends React.SVGProps<SVGSVGElement> {
  size?: string | number;
  fullBody?: boolean;
}

export const KoalaMascot: React.FC<KoalaMascotProps> = ({
  size = 120,
  fullBody = false,
  ...props
}) => {
  const width = typeof size === "string" ? size : `${size}px`;
  const height = typeof size === "string" ? size : `${size}px`;

  if (fullBody) {
    // Full body koala with clothing
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 800 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Ears */}
        <path d="M150 200C80 150 10 230 80 350C120 420 200 400 220 300" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />
        <path d="M650 200C720 150 790 230 720 350C680 420 600 400 580 300" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />

        {/* Inner ears */}
        <ellipse cx="140" cy="270" rx="60" ry="70" fill="#A59A87" />
        <ellipse cx="660" cy="270" rx="60" ry="70" fill="#A59A87" />

        {/* Head */}
        <ellipse cx="400" cy="300" rx="280" ry="250" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />

        {/* Eyes */}
        <ellipse cx="300" cy="320" rx="40" ry="50" fill="#201E1C" />
        <ellipse cx="500" cy="320" rx="40" ry="50" fill="#201E1C" />

        {/* Highlights in eyes */}
        <ellipse cx="320" cy="300" rx="10" ry="10" fill="#FFFFFF" />
        <ellipse cx="520" cy="300" rx="10" ry="10" fill="#FFFFFF" />

        {/* Nose */}
        <path d="M400 350C430 350 460 380 460 430C460 480 400 500 340 430C340 380 370 350 400 350Z" fill="#8B5E3C" stroke="#201E1C" strokeWidth="12" />

        {/* Mouth */}
        <path d="M350 450C360 470 380 480 400 480C420 480 440 470 450 450" stroke="#201E1C" strokeWidth="12" strokeLinecap="round" />

        {/* Body */}
        <rect x="200" y="550" width="400" height="200" rx="100" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />

        {/* Legs and bottom body */}
        <rect x="200" y="750" width="400" height="100" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />

        {/* Arms */}
        <path d="M200 600C160 620 150 670 170 700" stroke="#201E1C" strokeWidth="20" strokeLinecap="round" />
        <path d="M600 600C640 620 650 670 630 700" stroke="#201E1C" strokeWidth="20" strokeLinecap="round" />

        {/* Shorts */}
        <rect x="240" y="850" width="320" height="100" rx="20" fill="#607D8B" stroke="#201E1C" strokeWidth="16" />

        {/* Feet/Shoes */}
        <path d="M280 950H220C220 950 200 980 240 980H320C360 980 340 950 340 950H280Z" fill="#8B5E3C" stroke="#201E1C" strokeWidth="10" />
        <path d="M520 950H460C460 950 440 980 480 980H560C600 980 580 950 580 950H520Z" fill="#8B5E3C" stroke="#201E1C" strokeWidth="10" />

        {/* Shoe highlights */}
        <path d="M260 980H300" stroke="#F5F5DC" strokeWidth="6" strokeLinecap="round" />
        <path d="M500 980H540" stroke="#F5F5DC" strokeWidth="6" strokeLinecap="round" />

        {/* Shirt details */}
        <path d="M250 600H550" stroke="#201E1C" strokeWidth="16" strokeLinecap="round" strokeDasharray="20 20" />
        <path d="M250 750H550" stroke="#201E1C" strokeWidth="16" strokeLinecap="round" strokeDasharray="20 20" />
      </svg>
    );
  }

  // Just the koala face
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Ears */}
      <path d="M150 200C80 150 10 230 80 350C120 420 200 400 220 300" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />
      <path d="M650 200C720 150 790 230 720 350C680 420 600 400 580 300" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />

      {/* Inner ears */}
      <ellipse cx="140" cy="270" rx="60" ry="70" fill="#A59A87" />
      <ellipse cx="660" cy="270" rx="60" ry="70" fill="#A59A87" />

      {/* Head */}
      <ellipse cx="400" cy="300" rx="280" ry="250" fill="#C2B8A3" stroke="#201E1C" strokeWidth="20" />

      {/* Eyes */}
      <ellipse cx="300" cy="320" rx="40" ry="50" fill="#201E1C" />
      <ellipse cx="500" cy="320" rx="40" ry="50" fill="#201E1C" />

      {/* Highlights in eyes */}
      <ellipse cx="320" cy="300" rx="10" ry="10" fill="#FFFFFF" />
      <ellipse cx="520" cy="300" rx="10" ry="10" fill="#FFFFFF" />

      {/* Nose */}
      <path d="M400 350C430 350 460 380 460 430C460 480 400 500 340 430C340 380 370 350 400 350Z" fill="#8B5E3C" stroke="#201E1C" strokeWidth="12" />

      {/* Mouth */}
      <path d="M350 450C360 470 380 480 400 480C420 480 440 470 450 450" stroke="#201E1C" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
};

export default KoalaMascot;
