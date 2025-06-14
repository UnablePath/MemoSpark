'use client';

import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

interface StuLottieAnimationProps {
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  onComplete?: () => void;
}

export const StuLottieAnimation: React.FC<StuLottieAnimationProps> = ({
  className = "",
  loop = false,
  autoplay = true,
  onComplete
}) => {
  const [animationData, setAnimationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load the actual Lottie JSON file
        const response = await fetch('/animations/stu-waving.json');
        
        if (!response.ok) {
          throw new Error(`Failed to load animation: ${response.status}`);
        }
        
        const data = await response.json();
        setAnimationData(data);
      } catch (err) {
        console.error('Error loading Stu animation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load animation');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, []);

  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !animationData) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-xs text-red-500 text-center">
          {error || 'Animation not available'}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        onComplete={onComplete}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}; 