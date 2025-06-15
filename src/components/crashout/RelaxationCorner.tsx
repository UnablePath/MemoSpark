'use client';

import React, { useState, useEffect } from 'react';

const breathingCycle = [
  { text: 'Breathe In...', duration: 4000 },
  { text: 'Hold', duration: 7000 },
  { text: 'Breathe Out...', duration: 8000 },
];

export const RelaxationCorner = ({ onExit }: any) => {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('scale-100 opacity-100');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationClass('scale-125 opacity-0');
      setTimeout(() => {
        setCycleIndex((prevIndex) => (prevIndex + 1) % breathingCycle.length);
        setAnimationClass('scale-100 opacity-100');
      }, 1000); // fade-out duration
    }, breathingCycle[cycleIndex].duration);

    return () => clearTimeout(timer);
  }, [cycleIndex]);

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-xl flex flex-col items-center justify-center z-50">
      <div className="text-center">
        <div className="relative w-48 h-48 flex items-center justify-center">
                      <div className={`absolute w-full h-full bg-blue-500 rounded-full transition-transform duration-4000 ease-in-out ${cycleIndex === 0 ? 'scale-100' : 'scale-50'}`} />
            <div className={`absolute w-full h-full bg-purple-500 rounded-full transition-transform duration-8000 ease-in-out ${cycleIndex === 2 ? 'scale-100' : 'scale-50'}`} />
          <div className={`text-4xl font-bold text-white transition-all duration-1000 ${animationClass}`}>
            {breathingCycle[cycleIndex].text}
          </div>
        </div>
      </div>
      <button 
        onClick={onExit} 
        className="absolute top-8 right-8 text-white text-2xl font-bold bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Exit relaxation mode"
      >
        &times;
      </button>
    </div>
  );
}; 