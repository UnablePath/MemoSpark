'use client';

import React, { useState, useRef, useCallback } from 'react';
import { KoalaMascot } from '@/components/ui/koala-mascot';
import { StuLottieAnimation } from './StuLottieAnimation';



interface InteractiveStuProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  messages?: string[];
  enableTTS?: boolean;
  showSpeechBubble?: boolean;
}

export const InteractiveStu: React.FC<InteractiveStuProps> = ({
  size = "lg",
  className = "",
  messages = [
    "Hi! I'm Stu, your study buddy!",
    "Ready to tackle some tasks together?",
    "You're doing great! Keep it up!",
    "Time for a quick study break?",
    "Let's make learning fun today!"
  ],
  enableTTS = true,
  showSpeechBubble = true
}) => {
  const [currentState, setCurrentState] = useState<'idle' | 'animating' | 'speaking'>('idle');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [showBubble, setShowBubble] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Text-to-Speech function
  const speak = useCallback((text: string) => {
    if (!enableTTS || !('speechSynthesis' in window)) {
      console.log('TTS not available');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    
    // Try to use a friendly voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setCurrentState('speaking');
    };

    utterance.onend = () => {
      setCurrentState('idle');
      // Hide speech bubble after speaking
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setShowBubble(false);
        setCurrentMessage('');
      }, 2000);
    };

    utterance.onerror = () => {
      setCurrentState('idle');
      console.log('TTS error occurred');
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [enableTTS]);

  // Handle Stu click interaction
  const handleStuClick = useCallback(() => {
    if (currentState !== 'idle') return;

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Start animation
    setCurrentState('animating');
    setIsAnimating(true);

    // Pick a random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setCurrentMessage(randomMessage);
    setShowBubble(true);

    // Start TTS immediately with animation
    if (enableTTS) {
      speak(randomMessage);
    }

    // Play Lottie animation for 3 seconds
    setTimeout(() => {
      setIsAnimating(false);
      setCurrentState('idle');
      
      // If no TTS, hide bubble after animation ends
      if (!enableTTS) {
        timeoutRef.current = setTimeout(() => {
          setShowBubble(false);
          setCurrentMessage('');
        }, 2000);
      }
    }, 3000);
  }, [currentState, messages, enableTTS, speak]);

  // Load voices when component mounts
  React.useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      loadVoices();
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stateClasses = {
    idle: "hover:opacity-80",
    animating: "",
    speaking: ""
  };

  return (
    <div className="relative">
      {/* Speech Bubble */}
      {showSpeechBubble && showBubble && currentMessage && (
        <div className="absolute -top-20 -left-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 shadow-lg pointer-events-none max-w-xs z-10 animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-normal">
            {currentMessage}
          </div>
          {/* Speech bubble tail */}
          <div className="absolute bottom-0 left-8 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800 transform translate-y-full"></div>
          
          {/* Speaking indicator */}
          {currentState === 'speaking' && (
            <div className="absolute -right-2 -top-2 w-4 h-4 bg-green-500 rounded-full animate-pulse">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping"></div>
            </div>
          )}
        </div>
      )}

      {/* Stu Mascot */}
      <div
        className={`relative transition-all duration-300 cursor-pointer select-none ${stateClasses[currentState]} ${className}`}
        onClick={handleStuClick}
        role="button"
        tabIndex={0}
        aria-label="Click Stu to hear a motivational message"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleStuClick();
          }
        }}
      >
        {/* Show either Lottie Animation OR Static Stu */}
        {isAnimating ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4/5 h-4/5">
              <StuLottieAnimation
                className="w-full h-full"
                loop={false}
                autoplay={true}
                onComplete={() => {
                  console.log('Lottie animation completed');
                }}
              />
            </div>
          </div>
        ) : (
          <KoalaMascot 
            size={size}
            className="drop-shadow-lg transition-all duration-300"
            aria-label="Stu the study mascot"
          />
        )}

        {/* Interaction hint */}
        {currentState === 'idle' && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-75"></div>
        )}
      </div>


    </div>
  );
}; 