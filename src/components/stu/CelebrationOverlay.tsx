'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StuLottieAnimation } from './StuLottieAnimation';
import { InteractiveStu } from './InteractiveStu';
import type { CelebrationConfig } from '@/lib/stu/StuCelebration';
import type { Achievement, UserAchievement } from '@/types/achievements';

interface CelebrationOverlayProps {
  className?: string;
  position?: 'center' | 'top-right' | 'bottom-right' | 'floating';
  enableParticles?: boolean;
  enableConfetti?: boolean;
  enableSound?: boolean;
}

interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  className = '',
  position = 'center',
  enableParticles = true,
  enableConfetti = true,
  enableSound = true,
}) => {
  // Helper function to extract achievement data from either Achievement or UserAchievement
  const getAchievementData = (achievement: Achievement | UserAchievement | undefined): Achievement | undefined => {
    if (!achievement) return undefined;
    
    // If it's a UserAchievement with achievements relation, use that
    if ('achievements' in achievement && achievement.achievements) {
      return achievement.achievements;
    }
    
    // Otherwise, treat it as an Achievement
    return achievement as Achievement;
  };

  const [isVisible, setIsVisible] = useState(false);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationConfig | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [particles, setParticles] = useState<ParticleConfig[]>([]);
  const [confettiPieces, setConfettiPieces] = useState<ParticleConfig[]>([]);

  // Generate particle effects
  const generateParticles = useCallback(() => {
    const newParticles: ParticleConfig[] = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
      });
    }
    setParticles(newParticles);
  }, []);

  // Generate confetti effects
  const generateConfetti = useCallback(() => {
    const newConfetti: ParticleConfig[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    for (let i = 0; i < 50; i++) {
      newConfetti.push({
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 2,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
      });
    }
    setConfettiPieces(newConfetti);
  }, []);

  // Generate and play sound effect using Web Audio API
  const playSound = useCallback(async (soundType: string) => {
    try {
      // Use the same sound generation logic as StuCelebration
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (frequency: number, volume: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';

        // Create envelope for smooth sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      };

      // Generate sound based on type
      switch (soundType) {
        case 'achievement_unlock':
          [523.25, 659.25, 783.99].forEach((freq, i) => 
            setTimeout(() => playTone(freq, 0.3, 0.1), i * 100)
          );
          break;
        case 'level_up':
          [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => 
            setTimeout(() => playTone(freq, 0.4, 0.15), i * 80)
          );
          break;
        case 'streak_milestone':
          [0, 1, 2].forEach(i => 
            setTimeout(() => playTone(880, 0.3, 0.1), i * 150)
          );
          break;
        case 'coin_earned':
          playTone(1318.51, 0.3, 0.2);
          setTimeout(() => playTone(1567.98, 0.2, 0.1), 100);
          break;
        case 'task_completed':
          playTone(659.25, 0.3, 0.15);
          setTimeout(() => playTone(783.99, 0.3, 0.15), 150);
          break;
        case 'rare_achievement':
          [261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((freq, i) => 
            setTimeout(() => playTone(freq, 0.5, 0.2), i * 60)
          );
          break;
        case 'first_time':
          [523.25, 587.33, 659.25].forEach((freq, i) => 
            setTimeout(() => playTone(freq, 0.4, 0.2), i * 200)
          );
          break;
        default:
          playTone(523.25, 0.3, 0.15);
      }
    } catch (error) {
      console.info('🔇 Generated celebration sound unavailable');
    }
  }, []);

  // Handle celebration events
  const handleCelebrationStart = useCallback((event: CustomEvent<CelebrationConfig>) => {
    const config = event.detail;
    setCurrentCelebration(config);
    setIsVisible(true);
    
    // Enable effects based on configuration
    if (enableParticles && config.particleEffect) {
      setShowParticles(true);
      generateParticles();
    }
    
    if (enableConfetti && config.confetti) {
      setShowConfetti(true);
      generateConfetti();
    }
    
    // Play sound effect if available
    if (enableSound && config.soundEffect) {
      playSound(config.soundEffect);
    }
  }, [enableParticles, enableConfetti, enableSound, generateParticles, generateConfetti, playSound]);

  const handleCelebrationEnd = useCallback(() => {
    setIsVisible(false);
    setCurrentCelebration(null);
    setShowParticles(false);
    setShowConfetti(false);
    setParticles([]);
    setConfettiPieces([]);
  }, []);

  const handleCelebrationStop = useCallback(() => {
    setIsVisible(false);
    setCurrentCelebration(null);
    setShowParticles(false);
    setShowConfetti(false);
    setParticles([]);
    setConfettiPieces([]);
  }, []);

  // Animate particles
  useEffect(() => {
    if (!showParticles && !showConfetti) return;

    const interval = setInterval(() => {
      if (showParticles) {
        setParticles(prev => 
          prev.map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 0.02,
          })).filter(particle => particle.life > 0)
        );
      }

      if (showConfetti) {
        setConfettiPieces(prev => 
          prev.map(piece => ({
            ...piece,
            x: piece.x + piece.vx,
            y: piece.y + piece.vy,
            vy: piece.vy + 0.1, // Gravity effect
            life: piece.life - 0.01,
          })).filter(piece => piece.life > 0 && piece.y < window.innerHeight + 50)
        );
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [showParticles, showConfetti]);

  // Event listeners
  useEffect(() => {
    window.addEventListener('stu-celebration', handleCelebrationStart as EventListener);
    window.addEventListener('stu-celebration-end', handleCelebrationEnd as EventListener);
    window.addEventListener('stu-celebration-stop', handleCelebrationStop as EventListener);

    return () => {
      window.removeEventListener('stu-celebration', handleCelebrationStart as EventListener);
      window.removeEventListener('stu-celebration-end', handleCelebrationEnd as EventListener);
      window.removeEventListener('stu-celebration-stop', handleCelebrationStop as EventListener);
    };
  }, [handleCelebrationStart, handleCelebrationEnd, handleCelebrationStop]);

  if (!isVisible || !currentCelebration) {
    return null;
  }

  const positionClasses = {
    center: 'fixed inset-0 flex items-center justify-center',
    'top-right': 'fixed top-4 right-4',
    'bottom-right': 'fixed bottom-4 right-4',
    floating: 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
  };

  const intensityClasses = {
    low: 'scale-100',
    medium: 'scale-110',
    high: 'scale-125',
    epic: 'scale-150',
  };

  return (
    <>
      {/* Particles */}
      {showParticles && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {particles.map((particle, index) => (
            <div
              key={index}
              className="absolute rounded-full animate-pulse"
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                opacity: particle.life,
                transform: `scale(${particle.life})`,
              }}
            />
          ))}
        </div>
      )}

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {confettiPieces.map((piece, index) => (
            <div
              key={index}
              className="absolute rounded-sm animate-spin"
              style={{
                left: piece.x,
                top: piece.y,
                width: piece.size,
                height: piece.size * 0.6,
                backgroundColor: piece.color,
                opacity: piece.life,
                transform: `rotate(${piece.x * 2}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main Celebration Overlay */}
      <div className={`${positionClasses[position]} z-50 pointer-events-none ${className}`}>
        {/* Background Blur (for center position) */}
        {position === 'center' && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        )}

        {/* Celebration Content */}
        <div 
          className={`
            relative bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl 
            border border-white/20 backdrop-blur-md p-6 max-w-sm mx-4
            ${intensityClasses[currentCelebration.intensity]}
            animate-in fade-in-0 zoom-in-95 duration-500
          `}
        >
          {/* Celebration Stu with Lottie or Fallback */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              {/* 🔄 PLACEHOLDER: Replace with actual Lottie when files are ready */}
              <InteractiveStu
                size="lg"
                messages={[currentCelebration.message]}
                enableTTS={false}
                showSpeechBubble={false}
                className="animate-bounce"
              />
              {/* 
              TODO: Uncomment this when you have actual Lottie celebration files:
              
              {currentCelebration.lottieAnimation && (
                <StuLottieAnimation
                  src={currentCelebration.lottieAnimation}
                  className="w-24 h-24"
                  loop={false}
                  autoplay={true}
                />
              )}
              */}

              {/* Intensity glow effect */}
              {currentCelebration.intensity === 'epic' && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-ping opacity-20 scale-150" />
              )}
              {currentCelebration.intensity === 'high' && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse opacity-30 scale-125" />
              )}
            </div>

            {/* Achievement Icon (if available) */}
            {(() => {
              const achievementData = getAchievementData(currentCelebration.achievement);
              return achievementData?.icon && (
                <div className="text-4xl animate-bounce">
                  {achievementData.icon}
                </div>
              );
            })()}

            {/* Celebration Message */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {getAchievementData(currentCelebration.achievement)?.name || 'Celebration!'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {currentCelebration.message}
              </p>
            </div>

            {/* Achievement Points (if available) */}
            {(() => {
              const achievementData = getAchievementData(currentCelebration.achievement);
              return achievementData?.points_reward && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  +{achievementData.points_reward} pts
                </div>
              );
            })()}

            {/* Celebration Type Badge */}
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide
              ${currentCelebration.intensity === 'epic' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                currentCelebration.intensity === 'high' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                currentCelebration.intensity === 'medium' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }
            `}>
              {currentCelebration.type.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 