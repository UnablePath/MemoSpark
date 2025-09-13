'use client';

import React, { useState, useEffect } from 'react';
import { useDebouncedAchievementTrigger } from '@/hooks/useDebouncedAchievementTrigger';
import { useRelaxationAudio, type RelaxationSoundType } from '@/hooks/useRelaxationAudio';
import { Gamepad2, Wind, Music, Palette, Play, Pause, Volume2, VolumeX } from 'lucide-react';

const breathingCycle = [
  { text: 'Breathe In...', duration: 4000, phase: 'inhale' },
  { text: 'Hold', duration: 7000, phase: 'hold' },
  { text: 'Breathe Out...', duration: 8000, phase: 'exhale' },
];

interface RelaxationCornerProps {
  onExit: () => void;
}

type RelaxationMode = 'breathing' | 'ragdoll' | 'music' | 'drawing';

export const RelaxationCorner: React.FC<RelaxationCornerProps> = ({ onExit }) => {
  const { triggerWellnessAction } = useDebouncedAchievementTrigger();
  const {
    currentSound,
    isPlaying,
    volume,
    isLoading,
    error,
    playSound,
    pauseSound,
    stopSound,
    setVolume,
    togglePlayPause,
  } = useRelaxationAudio();
  
  const [currentMode, setCurrentMode] = useState<RelaxationMode>('breathing');
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathingProgress, setBreathingProgress] = useState(0);

  useEffect(() => {
    if (currentMode === 'breathing' && isBreathingActive) {
      const currentPhase = breathingCycle[cycleIndex];
      const startTime = Date.now();
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / currentPhase.duration, 1);
        setBreathingProgress(progress);
        
        if (progress >= 1) {
          clearInterval(progressInterval);
          setCycleIndex((prevIndex) => (prevIndex + 1) % breathingCycle.length);
          setBreathingProgress(0);
        }
      }, 50);

      return () => clearInterval(progressInterval);
    }
  }, [cycleIndex, currentMode, isBreathingActive]);

  const relaxationModes = [
    {
      id: 'breathing' as RelaxationMode,
      title: 'Breathing Exercise',
      icon: Wind,
      description: 'Calm your mind with guided breathing',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'music' as RelaxationMode,
      title: 'Calming Sounds',
      icon: Music,
      description: 'Relax with ambient soundscapes',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'drawing' as RelaxationMode,
      title: 'Zen Drawing',
      icon: Palette,
      description: 'Express yourself with digital art',
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'ragdoll' as RelaxationMode,
      title: 'Stress Game',
      icon: Gamepad2,
      description: 'Coming Soon',
      color: 'from-gray-500 to-gray-600'
    }
  ];

  const handleModeChange = (mode: RelaxationMode) => {
    // Stop audio when switching away from music mode
    if (currentMode === 'music' && mode !== 'music') {
      stopSound();
    }
    
    setCurrentMode(mode);
    // Trigger achievement when a session is started
    triggerWellnessAction('stress_relief_session_started');
  };

  // Cleanup audio when exiting
  const handleExit = () => {
    if (currentSound) {
      stopSound();
    }
    onExit();
  };

  const getBreathingScale = () => {
    const currentPhase = breathingCycle[cycleIndex];
    if (currentPhase.phase === 'inhale') {
      return 1 + (breathingProgress * 0.5); // Scale from 1 to 1.5
    } else if (currentPhase.phase === 'exhale') {
      return 1.5 - (breathingProgress * 0.5); // Scale from 1.5 to 1
    }
    return 1.5; // Hold phase
  };

  const renderContent = () => {
    switch (currentMode) {
      case 'breathing':
        const currentPhase = breathingCycle[cycleIndex];
        const scale = getBreathingScale();
        
        return (
          <div className="text-center max-w-2xl mx-auto">
            {/* Enhanced Breathing Visualization */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mx-auto mb-6 sm:mb-8">
              {/* Outer ring */}
              <div 
                className="absolute w-full h-full rounded-full border-4 border-blue-300/30 transition-all duration-300"
                style={{
                  transform: `scale(${scale})`,
                  borderColor: currentPhase.phase === 'inhale' ? '#60a5fa' : currentPhase.phase === 'exhale' ? '#34d399' : '#a78bfa'
                }}
              />
              
              {/* Middle ring */}
              <div 
                className="absolute w-4/5 h-4/5 rounded-full border-4 border-blue-400/50 transition-all duration-300"
                style={{
                  transform: `scale(${scale * 0.9})`,
                  borderColor: currentPhase.phase === 'inhale' ? '#3b82f6' : currentPhase.phase === 'exhale' ? '#10b981' : '#8b5cf6'
                }}
              />
              
              {/* Inner circle with gradient */}
              <div 
                className="absolute w-3/5 h-3/5 rounded-full transition-all duration-300 flex items-center justify-center"
                style={{
                  transform: `scale(${scale * 0.8})`,
                  background: currentPhase.phase === 'inhale' 
                    ? 'radial-gradient(circle, #dbeafe, #3b82f6)' 
                    : currentPhase.phase === 'exhale' 
                    ? 'radial-gradient(circle, #d1fae5, #10b981)' 
                    : 'radial-gradient(circle, #e9d5ff, #8b5cf6)'
                }}
              >
                {/* Phase text */}
                <div className="text-white text-xl font-bold drop-shadow-lg">
                  {currentPhase.text}
                </div>
              </div>
              
              {/* Progress ring */}
              <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - breathingProgress)}`}
                  className="transition-all duration-100"
                />
              </svg>
            </div>

            {/* Instructions and Controls */}
            <div className="space-y-6">
              <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-3">4-7-8 Breathing Technique</h3>
                <p className="text-gray-300 text-lg mb-4">
                  Follow the breathing pattern to calm your mind and reduce stress
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => setIsBreathingActive(!isBreathingActive)}
                    className={`px-8 py-3 rounded-full font-semibold text-white transition-all duration-200 ${
                      isBreathingActive 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isBreathingActive ? '⏸️ Pause' : '▶️ Start Breathing'}
                  </button>
                </div>
              </div>

              {/* Breathing Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                  <div className="text-blue-300 font-bold mb-1">INHALE</div>
                  <div className="text-white">4 seconds</div>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-purple-300 font-bold mb-1">HOLD</div>
                  <div className="text-white">7 seconds</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                  <div className="text-green-300 font-bold mb-1">EXHALE</div>
                  <div className="text-white">8 seconds</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ragdoll':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 w-full max-w-2xl border border-gray-700 text-center">
              <div className="text-6xl mb-6">🎮</div>
              <h3 className="text-3xl font-bold text-white mb-4">Stress Relief Game</h3>
              <p className="text-gray-300 text-lg mb-6">
                An interactive stress relief experience is coming soon!
              </p>
              <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
                <h4 className="text-xl font-semibold text-white mb-3">What to expect:</h4>
                <ul className="text-gray-300 space-y-2 text-left max-w-md mx-auto">
                  <li>• Interactive stress relief activities</li>
                  <li>• Satisfying physics-based interactions</li>
                  <li>• Multiple stress-busting mini-games</li>
                  <li>• Progress tracking and achievements</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'music':
        const soundscapes: Array<{
          id: RelaxationSoundType;
          name: string;
          emoji: string;
          description: string;
        }> = [
          { id: 'ocean-waves', name: 'Ocean Waves', emoji: '🌊', description: 'Gentle waves for deep relaxation' },
          { id: 'rain-sounds', name: 'Rain Sounds', emoji: '🌧️', description: 'Soft rainfall for focus' },
          { id: 'crackling-fire', name: 'Crackling Fire', emoji: '🔥', description: 'Warm fireplace ambience' },
          { id: 'forest-ambience', name: 'Forest Ambience', emoji: '🌲', description: 'Nature sounds and birds' },
        ];

        return (
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            {/* Header with current status */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-2">Calming Soundscapes</h3>
              <p className="text-gray-300 mb-4">
                {currentSound ? `Now playing: ${soundscapes.find(s => s.id === currentSound)?.name}` : 'Select a soundscape to begin'}
              </p>
              
              {/* Global Controls */}
              <div className="flex items-center justify-center space-x-4 mb-4">
                <button
                  onClick={togglePlayPause}
                  disabled={!currentSound}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    !currentSound 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : isPlaying 
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={stopSound}
                  disabled={!currentSound}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !currentSound 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                  aria-label="Stop audio"
                >
                  Stop
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center space-x-3 max-w-xs mx-auto">
                <VolumeX className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    aria-label="Volume control"
                  />
                </div>
                <Volume2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400 w-8">{Math.round(volume * 100)}%</span>
              </div>

              {/* Loading and Error States */}
              {isLoading && (
                <div className="mt-4 text-blue-400 flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                  <span>Loading audio...</span>
                </div>
              )}

              {error && (
                <div className="mt-4 text-red-400 text-sm">
                  ⚠️ {error} (Using generated sounds as fallback)
                </div>
              )}
            </div>

            {/* Sound Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {soundscapes.map((soundscape) => {
                const isActive = currentSound === soundscape.id;
                const isCurrentlyPlaying = isActive && isPlaying;
                
                return (
                  <div
                    key={soundscape.id}
                    className={`relative bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border transition-all cursor-pointer group ${
                      isActive 
                        ? 'border-purple-500 bg-purple-900/20' 
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/80'
                    }`}
                    onClick={() => playSound(soundscape.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playSound(soundscape.id);
                      }
                    }}
                    aria-label={`Play ${soundscape.name}`}
                  >
                    {/* Visual Feedback for Active Sound */}
                    {isCurrentlyPlaying && (
                      <div className="absolute inset-0 rounded-xl bg-purple-500/10 animate-pulse"></div>
                    )}
                    
                    <div className="relative z-10">
                      <div className="text-4xl mb-3 transition-transform group-hover:scale-110">
                        {soundscape.emoji}
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        {soundscape.name}
                      </h4>
                      <p className="text-sm text-gray-400 mb-4">
                        {soundscape.description}
                      </p>
                      
                      {/* Status Indicator */}
                      <div className="flex items-center justify-center space-x-2">
                        {isActive ? (
                          <div className="flex items-center space-x-1 text-purple-400">
                            {isCurrentlyPlaying ? (
                              <>
                                <div className="flex space-x-1">
                                  <div className="w-1 h-4 bg-purple-400 animate-pulse"></div>
                                  <div className="w-1 h-4 bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                  <div className="w-1 h-4 bg-purple-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                                <span className="text-sm">Playing</span>
                              </>
                            ) : (
                              <>
                                <Pause className="h-4 w-4" />
                                <span className="text-sm">Paused</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-gray-500 group-hover:text-purple-400 transition-colors">
                            <Play className="h-4 w-4" />
                            <span className="text-sm">Click to play</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Instructions */}
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
              <p className="text-gray-300 text-sm">
                💡 <strong>Tip:</strong> These sounds are designed to loop seamlessly. 
                Use them while studying, meditating, or whenever you need to relax and focus.
              </p>
            </div>
          </div>
        );

      case 'drawing':
        return (
          <div className="text-center">
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 max-w-2xl mx-auto border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Zen Drawing Canvas</h3>
              <div className="w-full h-96 bg-white rounded-lg mb-4 flex items-center justify-center">
                <p className="text-gray-500">Drawing canvas coming soon...</p>
              </div>
              <div className="flex justify-center space-x-4">
                {['🖌️ Brush', '✏️ Pencil', '🌈 Colors', '🗑️ Clear'].map((tool) => (
                  <button
                    key={tool}
                    className="py-2 px-4 bg-green-600/20 hover:bg-green-600/40 rounded-lg text-white transition-colors border border-green-500/30"
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <h2 className="text-3xl font-bold text-white">Stress Relief Corner 🧘‍♀️</h2>
        <button 
          onClick={handleExit} 
          className="text-white text-2xl font-bold bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
          aria-label="Exit relaxation mode"
        >
          &times;
        </button>
      </div>

      {/* Mode Selection Tabs */}
      <div className="flex justify-center p-4 sm:p-6">
        <div className="flex bg-gray-800/50 rounded-full p-2 border border-gray-700 overflow-x-auto max-w-full">
          {relaxationModes.map((mode) => {
            const Icon = mode.icon;
            const isDisabled = mode.id === 'ragdoll';
            return (
              <button
                key={mode.id}
                onClick={() => !isDisabled && handleModeChange(mode.id)}
                disabled={isDisabled}
                className={`flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  currentMode === mode.id
                    ? `bg-gradient-to-r ${mode.color} text-white shadow-lg`
                    : isDisabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">{mode.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 overflow-auto">
        <div className="w-full max-w-4xl pt-4 sm:pt-8">
          {renderContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center p-4 border-t border-gray-700">
        <p className="text-gray-400 text-sm">
          Take your time. Mental health is just as important as your studies. 💙
        </p>
      </div>
    </div>
  );
}; 