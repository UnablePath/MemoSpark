import { useState, useEffect, useCallback, useRef } from 'react';

export type RelaxationSoundType = 'ocean-waves' | 'rain-sounds' | 'crackling-fire' | 'forest-ambience';

interface RelaxationAudioState {
  currentSound: RelaxationSoundType | null;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

interface RelaxationAudioControls {
  playSound: (soundType: RelaxationSoundType) => Promise<void>;
  pauseSound: () => void;
  stopSound: () => void;
  setVolume: (volume: number) => void;
  togglePlayPause: () => void;
}

export const useRelaxationAudio = (): RelaxationAudioState & RelaxationAudioControls => {
  const [state, setState] = useState<RelaxationAudioState>({
    currentSound: null,
    isPlaying: false,
    volume: 0.7,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Sound file paths
  const soundPaths: Record<RelaxationSoundType, string> = {
    'ocean-waves': '/sounds/relaxation/ocean-waves.mp3',
    'rain-sounds': '/sounds/relaxation/rain-sounds.mp3',
    'crackling-fire': '/sounds/relaxation/crackling-fire.mp3',
    'forest-ambience': '/sounds/relaxation/forest-ambience.mp3',
  };

  // TODO: Implement Web Audio API sound generation as fallback
  const generateAmbientSound = useCallback((soundType: RelaxationSoundType): Promise<AudioBuffer> => {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = audioContextRef.current || new AudioContext();
        audioContextRef.current = audioContext;

        // Create a buffer for 10 seconds of audio
        const sampleRate = audioContext.sampleRate;
        const duration = 10;
        const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);

        // Generate different ambient sounds based on type
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          
          switch (soundType) {
            case 'ocean-waves':
              // Generate ocean wave sounds using filtered noise and low-frequency oscillation
              for (let i = 0; i < channelData.length; i++) {
                const time = i / sampleRate;
                const wave = Math.sin(time * 0.5 * Math.PI) * 0.3; // Slow wave motion
                const noise = (Math.random() * 2 - 1) * 0.2; // White noise for water texture
                const filtered = noise * (1 + Math.sin(time * 2 * Math.PI) * 0.5); // Filter modulation
                channelData[i] = wave + filtered * 0.4;
              }
              break;

            case 'rain-sounds':
              // Generate rain sounds using filtered noise bursts
              for (let i = 0; i < channelData.length; i++) {
                const noise = (Math.random() * 2 - 1);
                const filtered = noise * Math.random() * 0.6; // Random intensity for rain drops
                channelData[i] = filtered * 0.3;
              }
              break;

            case 'crackling-fire':
              // Generate fire crackling using burst noise and low-frequency rumble
              for (let i = 0; i < channelData.length; i++) {
                const time = i / sampleRate;
                const crackle = Math.random() < 0.01 ? (Math.random() * 2 - 1) * 0.8 : 0; // Occasional crackles
                const rumble = Math.sin(time * 20 * Math.PI) * 0.1; // Low rumble
                const noise = (Math.random() * 2 - 1) * 0.1; // Background noise
                channelData[i] = crackle + rumble + noise;
              }
              break;

            case 'forest-ambience':
              // Generate forest sounds using filtered noise and bird-like tones
              for (let i = 0; i < channelData.length; i++) {
                const time = i / sampleRate;
                const wind = Math.sin(time * 0.3 * Math.PI) * (Math.random() * 2 - 1) * 0.2;
                const birds = Math.random() < 0.001 ? Math.sin(time * 800 * Math.PI) * 0.3 : 0; // Occasional bird sounds
                const leaves = (Math.random() * 2 - 1) * 0.05; // Rustling leaves
                channelData[i] = wind + birds + leaves;
              }
              break;
          }
        }

        resolve(buffer);
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  const playSound = useCallback(async (soundType: RelaxationSoundType) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Stop current sound if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }

      // Try to load audio file first
      const audio = new Audio();
      audio.src = soundPaths[soundType];
      audio.loop = true;
      audio.volume = state.volume;

      // TODO: Add error handling for missing audio files
      audio.addEventListener('canplaythrough', () => {
        audioRef.current = audio;
        audio.play().then(() => {
          setState(prev => ({
            ...prev,
            currentSound: soundType,
            isPlaying: true,
            isLoading: false,
            error: null,
          }));
        }).catch(() => {
          // Fallback to generated sound
          playGeneratedSound(soundType);
        });
      });

      audio.addEventListener('error', () => {
        // Fallback to generated sound if file loading fails
        playGeneratedSound(soundType);
      });

      audio.load();

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load audio', 
        isLoading: false 
      }));
    }
  }, [state.volume]);

  const playGeneratedSound = useCallback(async (soundType: RelaxationSoundType) => {
    try {
      const audioContext = audioContextRef.current || new AudioContext();
      audioContextRef.current = audioContext;

      // Resume audio context if suspended (required by browser policies)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const buffer = await generateAmbientSound(soundType);
      
      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = state.volume;
      gainNodeRef.current = gainNode;

      // Create and start source
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      sourceNodeRef.current = source;
      source.start();

      setState(prev => ({
        ...prev,
        currentSound: soundType,
        isPlaying: true,
        isLoading: false,
        error: null,
      }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to generate audio', 
        isLoading: false 
      }));
    }
  }, [generateAmbientSound, state.volume]);

  const pauseSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      currentSound: null, 
      isPlaying: false 
    }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
    
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pauseSound();
    } else if (state.currentSound) {
      playSound(state.currentSound);
    }
  }, [state.isPlaying, state.currentSound, pauseSound, playSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    playSound,
    pauseSound,
    stopSound,
    setVolume,
    togglePlayPause,
  };
};
