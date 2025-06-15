'use client';

import type { Achievement, UserAchievement } from '@/types/achievements';

export type CelebrationType = 
  | 'achievement_unlock' 
  | 'streak_milestone' 
  | 'coin_earned' 
  | 'level_up' 
  | 'task_completed' 
  | 'first_time' 
  | 'rare_achievement';

export interface CelebrationConfig {
  type: CelebrationType;
  achievement?: Achievement | UserAchievement;
  message: string;
  duration: number; // in milliseconds
  intensity: 'low' | 'medium' | 'high' | 'epic';
  soundEffect?: string;
  lottieAnimation?: string; // Path to Lottie JSON file - REPLACE THESE WITH ACTUAL FILES
  particleEffect?: boolean;
  confetti?: boolean;
}

export interface CelebrationSound {
  type: CelebrationType;
  audioPath: string;
  volume: number;
}

export class StuCelebration {
  private static instance: StuCelebration;
  private isPlaying: boolean = false;
  private currentCelebration: CelebrationConfig | null = null;
  private celebrationQueue: CelebrationConfig[] = [];
  private audioContext: AudioContext | null = null;

  private constructor() {
    this.initAudioContext();
  }

  public static getInstance(): StuCelebration {
    if (!StuCelebration.instance) {
      StuCelebration.instance = new StuCelebration();
    }
    return StuCelebration.instance;
  }

  private initAudioContext() {
    // Only initialize audio context on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  /**
   * Contextual celebration messages based on achievement type
   */
  private getCelebrationMessage(type: CelebrationType, achievement?: Achievement): string {
    const messages = {
      achievement_unlock: [
        "🎉 Amazing! You've unlocked a new achievement!",
        "🏆 Incredible work! Another milestone reached!",
        "✨ Fantastic! You're on fire today!",
        "🌟 Outstanding! Keep up the great work!"
      ],
      streak_milestone: [
        "🔥 Streak master! Your consistency is incredible!",
        "⚡ Unstoppable! Your streak is getting stronger!",
        "🎯 Perfect! Your dedication is paying off!",
        "💪 Legendary streak! You're crushing it!"
      ],
      coin_earned: [
        "💰 Coins earned! Your hard work is paying off!",
        "🪙 Cha-ching! More coins in your pocket!",
        "💎 Valuable work! Keep collecting those coins!",
        "🏦 Building your fortune, one task at a time!"
      ],
      level_up: [
        "🚀 Level up! You've reached new heights!",
        "⭐ Congratulations! You've advanced to the next level!",
        "🎊 Epic progression! Your skills are evolving!",
        "🏅 Level mastery achieved! Onwards and upwards!"
      ],
      task_completed: [
        "✅ Task crushed! You're making great progress!",
        "🎯 Bulls-eye! Another task completed perfectly!",
        "💫 Smooth execution! You're in the zone!",
        "🏃‍♂️ Keep the momentum going! Great job!"
      ],
      first_time: [
        "🌱 First time achievement! Welcome to greatness!",
        "🎈 Your journey begins! Exciting times ahead!",
        "🌈 First step taken! Many more to come!",
        "🎪 Welcome to the club! This is just the beginning!"
      ],
      rare_achievement: [
        "🦄 LEGENDARY! You've achieved something truly rare!",
        "👑 EPIC ACHIEVEMENT! You're among the elite!",
        "🏆 INCREDIBLE! This is a once-in-a-lifetime moment!",
        "⚡ MYTHICAL! Your dedication is absolutely amazing!"
      ]
    };

    const typeMessages = messages[type] || messages.achievement_unlock;
    const randomMessage = typeMessages[Math.floor(Math.random() * typeMessages.length)];
    
    if (achievement?.name) {
      return `${randomMessage}\n"${achievement.name}" unlocked!`;
    }
    
    return randomMessage;
  }

  /**
   * Get celebration configuration based on type and context
   */
  private getCelebrationConfig(
    type: CelebrationType, 
    achievement?: Achievement | UserAchievement,
    customMessage?: string
  ): CelebrationConfig {
    const baseConfig: Partial<CelebrationConfig> = {
      type,
      achievement,
      message: customMessage || this.getCelebrationMessage(type, achievement as Achievement),
    };

    switch (type) {
      case 'rare_achievement':
        return {
          ...baseConfig,
          duration: 8000,
          intensity: 'epic',
          soundEffect: 'rare_achievement',
          lottieAnimation: '/animations/stu-epic-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: true,
          confetti: true,
        } as CelebrationConfig;

      case 'level_up':
        return {
          ...baseConfig,
          duration: 6000,
          intensity: 'high',
          soundEffect: 'level_up',
          lottieAnimation: '/animations/stu-level-up-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: true,
          confetti: false,
        } as CelebrationConfig;

      case 'achievement_unlock':
        return {
          ...baseConfig,
          duration: 5000,
          intensity: 'high',
          soundEffect: 'achievement_unlock',
          lottieAnimation: '/animations/stu-achievement-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: true,
          confetti: false,
        } as CelebrationConfig;

      case 'streak_milestone':
        return {
          ...baseConfig,
          duration: 4000,
          intensity: 'medium',
          soundEffect: 'streak_milestone',
          lottieAnimation: '/animations/stu-streak-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: false,
          confetti: false,
        } as CelebrationConfig;

      case 'coin_earned':
        return {
          ...baseConfig,
          duration: 3000,
          intensity: 'medium',
          soundEffect: 'coin_earned',
          lottieAnimation: '/animations/stu-coin-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: false,
          confetti: false,
        } as CelebrationConfig;

      case 'task_completed':
        return {
          ...baseConfig,
          duration: 3000,
          intensity: 'low',
          soundEffect: 'task_completed',
          lottieAnimation: '/animations/stu-happy-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: false,
          confetti: false,
        } as CelebrationConfig;

      case 'first_time':
        return {
          ...baseConfig,
          duration: 5000,
          intensity: 'medium',
          soundEffect: 'first_time',
          lottieAnimation: '/animations/stu-welcome-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: true,
          confetti: true,
        } as CelebrationConfig;

      default:
        return {
          ...baseConfig,
          duration: 4000,
          intensity: 'medium',
          soundEffect: 'default',
          lottieAnimation: '/animations/stu-default-celebration.json', // 🔄 REPLACE WITH ACTUAL LOTTIE
          particleEffect: false,
          confetti: false,
        } as CelebrationConfig;
    }
  }

  /**
   * Generate and play celebration sound effect using Web Audio API
   */
  private async playSoundEffect(soundType: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Generate sound based on celebration type
      switch (soundType) {
        case 'achievement_unlock':
          await this.playAchievementSound();
          break;
        case 'level_up':
          await this.playLevelUpSound();
          break;
        case 'streak_milestone':
          await this.playStreakSound();
          break;
        case 'coin_earned':
          await this.playCoinSound();
          break;
        case 'task_completed':
          await this.playTaskCompleteSound();
          break;
        case 'rare_achievement':
          await this.playEpicSound();
          break;
        case 'first_time':
          await this.playFirstTimeSound();
          break;
        default:
          await this.playDefaultSound();
      }
    } catch (error) {
      console.info('🔇 Generated celebration sound unavailable');
    }
  }

  /**
   * Generate achievement unlock sound (ascending chime)
   */
  private async playAchievementSound(): Promise<void> {
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    for (let i = 0; i < frequencies.length; i++) {
      setTimeout(() => this.playTone(frequencies[i], 0.3, 0.1), i * 100);
    }
  }

  /**
   * Generate level up sound (triumphant fanfare)
   */
  private async playLevelUpSound(): Promise<void> {
    const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    for (let i = 0; i < frequencies.length; i++) {
      setTimeout(() => this.playTone(frequencies[i], 0.4, 0.15), i * 80);
    }
  }

  /**
   * Generate streak milestone sound (rhythmic beeps)
   */
  private async playStreakSound(): Promise<void> {
    const frequency = 880; // A5
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.playTone(frequency, 0.3, 0.1), i * 150);
    }
  }

  /**
   * Generate coin earned sound (cash register ding)
   */
  private async playCoinSound(): Promise<void> {
    this.playTone(1318.51, 0.3, 0.2); // E6
    setTimeout(() => this.playTone(1567.98, 0.2, 0.1), 100); // G6
  }

  /**
   * Generate task complete sound (success chime)
   */
  private async playTaskCompleteSound(): Promise<void> {
    this.playTone(659.25, 0.3, 0.15); // E5
    setTimeout(() => this.playTone(783.99, 0.3, 0.15), 150); // G5
  }

  /**
   * Generate epic achievement sound (grand fanfare)
   */
  private async playEpicSound(): Promise<void> {
    const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4-G5
    for (let i = 0; i < frequencies.length; i++) {
      setTimeout(() => this.playTone(frequencies[i], 0.5, 0.2), i * 60);
    }
  }

  /**
   * Generate first time sound (gentle welcome)
   */
  private async playFirstTimeSound(): Promise<void> {
    const frequencies = [523.25, 587.33, 659.25]; // C5, D5, E5
    for (let i = 0; i < frequencies.length; i++) {
      setTimeout(() => this.playTone(frequencies[i], 0.4, 0.2), i * 200);
    }
  }

  /**
   * Generate default celebration sound
   */
  private async playDefaultSound(): Promise<void> {
    this.playTone(523.25, 0.3, 0.15); // C5
  }

  /**
   * Play a single tone using Web Audio API
   */
  private playTone(frequency: number, volume: number, duration: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = 'sine';

    // Create envelope for smooth sound
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Trigger a celebration
   */
  public async celebrate(
    type: CelebrationType,
    achievement?: Achievement | UserAchievement,
    customMessage?: string
  ): Promise<void> {
    const config = this.getCelebrationConfig(type, achievement, customMessage);
    
    // Add to queue if celebration is already playing
    if (this.isPlaying) {
      this.celebrationQueue.push(config);
      return;
    }

    await this.playCelebration(config);
  }

  /**
   * Play the celebration with all effects
   */
  private async playCelebration(config: CelebrationConfig): Promise<void> {
    this.isPlaying = true;
    this.currentCelebration = config;

    // Only dispatch events on client side
    if (typeof window !== 'undefined') {
      // Dispatch celebration event for UI components to listen
      const celebrationEvent = new CustomEvent('stu-celebration', {
        detail: config
      });
      window.dispatchEvent(celebrationEvent);
    }

    // Play sound effect
    if (config.soundEffect) {
      await this.playSoundEffect(config.soundEffect);
    }

    // Wait for celebration duration
    await new Promise(resolve => setTimeout(resolve, config.duration));

    this.isPlaying = false;
    this.currentCelebration = null;

    // Only dispatch events on client side
    if (typeof window !== 'undefined') {
      // Dispatch celebration end event
      const celebrationEndEvent = new CustomEvent('stu-celebration-end', {
        detail: config
      });
      window.dispatchEvent(celebrationEndEvent);
    }

    // Play next celebration in queue
    if (this.celebrationQueue.length > 0) {
      const nextCelebration = this.celebrationQueue.shift()!;
      await this.playCelebration(nextCelebration);
    }
  }

  /**
   * Stop current celebration
   */
  public stopCelebration(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.currentCelebration = null;
    this.celebrationQueue = [];

    // Only dispatch events on client side
    if (typeof window !== 'undefined') {
      const stopEvent = new CustomEvent('stu-celebration-stop');
      window.dispatchEvent(stopEvent);
    }
  }

  /**
   * Get current celebration status
   */
  public getCurrentCelebration(): CelebrationConfig | null {
    return this.currentCelebration;
  }

  /**
   * Check if celebration is currently playing
   */
  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Quick celebration methods for common scenarios
   */
  public achievementUnlocked(achievement: Achievement | UserAchievement): Promise<void> {
    // Handle both Achievement and UserAchievement types
    const achievementData = 'achievements' in achievement && achievement.achievements 
      ? achievement.achievements 
      : achievement as Achievement;
    const type = achievementData?.type === 'other' ? 'rare_achievement' : 'achievement_unlock';
    return this.celebrate(type, achievement);
  }

  public streakMilestone(streakCount: number): Promise<void> {
    const message = `🔥 ${streakCount} day streak! You're unstoppable!`;
    return this.celebrate('streak_milestone', undefined, message);
  }

  public coinsEarned(amount: number): Promise<void> {
    const message = `💰 ${amount} coins earned! Keep up the great work!`;
    return this.celebrate('coin_earned', undefined, message);
  }

  public levelUp(newLevel: number): Promise<void> {
    const message = `🚀 Level ${newLevel} reached! You're advancing rapidly!`;
    return this.celebrate('level_up', undefined, message);
  }

  public taskCompleted(taskName?: string): Promise<void> {
    const message = taskName 
      ? `✅ "${taskName}" completed! Nice work!`
      : '✅ Task completed! Keep the momentum going!';
    return this.celebrate('task_completed', undefined, message);
  }

  public firstTimeAchievement(achievementName: string): Promise<void> {
    const message = `🌱 Welcome! Your first "${achievementName}" achievement!`;
    return this.celebrate('first_time', undefined, message);
  }

  /**
   * Initialize celebration system (no preloading needed for generated sounds)
   */
  public async initializeCelebrations(): Promise<void> {
    // Initialize audio context if not already done
    if (!this.audioContext) {
      this.initAudioContext();
    }
    console.log('🎉 Celebration system initialized with generated sounds');
  }
}

// Export singleton instance
export const stuCelebration = StuCelebration.getInstance(); 