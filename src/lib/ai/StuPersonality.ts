import { ExtendedTask, SuggestionContext } from '../../types/ai';

export interface StuPersonalityResponse {
  message: string;
  mood: 'excited' | 'focused' | 'encouraging' | 'celebratory' | 'concerned' | 'neutral';
  animation: string;
  personality: {
    encouragement: number;
    humor: number;
    directness: number;
    empathy: number;
  };
  contextualTips: string[];
  voiceEnabled?: boolean;
}

/**
 * StuPersonality - AI Mascot Personality Engine
 * Generates contextual, personality-driven responses for the Stu mascot
 */
export class StuPersonality {
  private basePersonality = {
    encouragement: 0.8,
    humor: 0.6,
    directness: 0.7,
    empathy: 0.9
  };

  private moodContexts = {
    excited: ['new tasks', 'high energy', 'motivation'],
    focused: ['deep work', 'concentration', 'productivity'],
    encouraging: ['struggle', 'setback', 'need motivation'],
    celebratory: ['completion', 'achievement', 'success'],
    concerned: ['overdue', 'stress', 'overwhelmed'],
    neutral: ['default', 'general', 'routine']
  };

  private responses = {
    greetings: [
      "Hey there, study superstar! 🌟 Ready to crush those goals?",
      "What's up, future genius! 🚀 Let's make today amazing!",
      "Hello brilliant human! ✨ Time to turn those dreams into achievements!",
      "Greetings, academic warrior! ⚔️ Your brain is about to level up!"
    ],
    motivation: [
      "You've got this! Every small step is progress towards your big dreams! 💪",
      "Remember: You're not just studying, you're building your future self! 🌱",
      "Challenges are just opportunities wearing a disguise! Keep pushing! 🎭",
      "Your brain is like a muscle - every study session makes it stronger! 🧠💪"
    ],
    celebration: [
      "WOOHOO! 🎉 Look at you being absolutely amazing! That's the spirit!",
      "Victory dance time! 💃 You just proved how awesome you are!",
      "*throws confetti* 🎊 Another win in the books! You're on fire!",
      "That's what I'm talking about! 🔥 Keep this momentum going!"
    ],
    concern: [
      "Hey, I notice you might be feeling overwhelmed. Let's break this down together! 🤗",
      "It's okay to feel stressed sometimes. We'll figure this out step by step! 💙",
      "Remember: Rome wasn't built in a day, and neither is academic success! 🏗️",
      "Take a deep breath. You're stronger than you think, and I'm here to help! 🌸"
    ],
    tips: [
      "Pro tip: The Pomodoro Technique can work wonders! 25 minutes focused work, 5-minute break! ⏰",
      "Here's a secret: Teaching concepts to others (even imaginary friends!) helps you learn better! 🎭",
      "Brain hack: Studying in different locations can improve memory retention! 🏠📚",
      "Fun fact: Your brain consolidates memories during sleep, so don't skip those Z's! 😴"
    ],
    focus: [
      "Time to enter the zone! 🎯 Let's channel that beautiful brain power!",
      "Focus mode: ACTIVATED! 🔋 You're about to do something incredible!",
      "Deep work incoming! 🌊 Surf those concentration waves!",
      "Laser focus engaged! 🔦 Watch out world, genius at work!"
    ]
  };

  constructor() {
    // Initialize with default personality
  }

  /**
   * Generate contextual response based on tasks and user state
   */
  async generateResponse(
    tasks: ExtendedTask[],
    userId: string,
    context: SuggestionContext
  ): Promise<StuPersonalityResponse> {
    try {
      // Analyze current situation
      const situation = this.analyzeSituation(tasks, context);
      
      // Determine appropriate mood
      const mood = this.determineMood(situation);
      
      // Generate contextual message
      const message = this.generateContextualMessage(situation, mood);
      
      // Select animation
      const animation = this.selectAnimation(mood);
      
      // Generate tips
      const contextualTips = this.generateTips(situation);

      return {
        message,
        mood,
        animation,
        personality: this.basePersonality,
        contextualTips,
        voiceEnabled: true
      };
    } catch (error) {
      console.error('Error generating Stu response:', error);
      return this.getDefaultResponse();
    }
  }

  /**
   * Analyze current user situation
   */
  private analyzeSituation(tasks: ExtendedTask[], context: SuggestionContext): {
    completedToday: number;
    overdueTasks: number;
    upcomingDeadlines: number;
    totalTasks: number;
    recentActivity: number;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    workload: 'light' | 'moderate' | 'heavy';
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const completedToday = tasks.filter(task => 
      task.completed && 
      task.completedAt && 
      new Date(task.completedAt) >= today
    ).length;

    const overdueTasks = tasks.filter(task => 
      !task.completed && 
      new Date(task.dueDate) < now
    ).length;

    const upcomingDeadlines = tasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return !task.completed && dueDate <= threeDaysFromNow && dueDate >= now;
    }).length;

    const hour = now.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const activeTasks = tasks.filter(t => !t.completed).length;
    let workload: 'light' | 'moderate' | 'heavy';
    if (activeTasks <= 5) workload = 'light';
    else if (activeTasks <= 15) workload = 'moderate';
    else workload = 'heavy';

    return {
      completedToday,
      overdueTasks,
      upcomingDeadlines,
      totalTasks: tasks.length,
      recentActivity: context.recentActivity?.length || 0,
      timeOfDay,
      workload
    };
  }

  /**
   * Determine appropriate mood based on situation
   */
  private determineMood(situation: any): 'excited' | 'focused' | 'encouraging' | 'celebratory' | 'concerned' | 'neutral' {
    // Celebratory if user completed tasks recently
    if (situation.completedToday >= 3) {
      return 'celebratory';
    }

    // Concerned if there are overdue tasks
    if (situation.overdueTasks > 0) {
      return 'concerned';
    }

    // Encouraging if heavy workload but making progress
    if (situation.workload === 'heavy' && situation.recentActivity > 0) {
      return 'encouraging';
    }

    // Excited for new day or light workload
    if (situation.timeOfDay === 'morning' || situation.workload === 'light') {
      return 'excited';
    }

    // Focused for work periods
    if (situation.timeOfDay === 'afternoon' && situation.upcomingDeadlines > 0) {
      return 'focused';
    }

    return 'neutral';
  }

  /**
   * Generate contextual message
   */
  private generateContextualMessage(situation: any, mood: string): string {
    const timeGreetings: Record<string, string> = {
      morning: "Good morning",
      afternoon: "Good afternoon", 
      evening: "Good evening",
      night: "Hey night owl"
    };
    
    const timeGreeting = timeGreetings[situation.timeOfDay] || "Hey there";

    let baseMessage = '';

    switch (mood) {
      case 'celebratory':
        baseMessage = this.getRandomResponse('celebration');
        break;
      case 'concerned':
        baseMessage = this.getRandomResponse('concern');
        break;
      case 'encouraging':
        baseMessage = this.getRandomResponse('motivation');
        break;
      case 'focused':
        baseMessage = this.getRandomResponse('focus');
        break;
      case 'excited':
        baseMessage = this.getRandomResponse('greetings');
        break;
      default:
        baseMessage = `${timeGreeting}! Ready to tackle your studies? 📚`;
    }

    // Add contextual information
    if (situation.completedToday > 0) {
      baseMessage += ` You've already completed ${situation.completedToday} task${situation.completedToday > 1 ? 's' : ''} today - you're on a roll! 🔥`;
    }

    if (situation.upcomingDeadlines > 0) {
      baseMessage += ` You have ${situation.upcomingDeadlines} deadline${situation.upcomingDeadlines > 1 ? 's' : ''} coming up - let's stay ahead of the game! ⏰`;
    }

    return baseMessage;
  }

  /**
   * Select animation based on mood
   */
  private selectAnimation(mood: string): string {
    const animations = {
      excited: 'bounce',
      focused: 'pulse',
      encouraging: 'gentle-sway',
      celebratory: 'confetti-dance',
      concerned: 'concerned-nod',
      neutral: 'idle-float'
    };

    return animations[mood as keyof typeof animations] || 'idle-float';
  }

  /**
   * Generate contextual tips
   */
  private generateTips(situation: any): string[] {
    const tips: string[] = [];

    if (situation.workload === 'heavy') {
      tips.push("Break large tasks into smaller, manageable chunks!");
      tips.push("Remember to take regular breaks to maintain focus!");
    }

    if (situation.overdueTasks > 0) {
      tips.push("Tackle overdue tasks first to reduce stress!");
      tips.push("Consider adjusting your schedule to prevent future delays!");
    }

    if (situation.timeOfDay === 'evening') {
      tips.push("Evening study sessions can be great for review and reflection!");
    }

    if (situation.timeOfDay === 'morning') {
      tips.push("Morning energy is perfect for tackling challenging subjects!");
    }

    // Add a random general tip
    tips.push(this.getRandomResponse('tips'));

    return tips.slice(0, 3); // Return max 3 tips
  }

  /**
   * Get random response from category
   */
  private getRandomResponse(category: keyof typeof this.responses): string {
    const responses = this.responses[category];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Get default response for error cases
   */
  private getDefaultResponse(): StuPersonalityResponse {
    return {
      message: "Hey there! 👋 I'm Stu, your AI study buddy! Ready to make today awesome? 🚀",
      mood: 'neutral',
      animation: 'wave',
      personality: this.basePersonality,
      contextualTips: [
        "Remember: Progress, not perfection! 📈",
        "Every expert was once a beginner! 🌱",
        "You're doing better than you think! 💪"
      ],
      voiceEnabled: true
    };
  }

  /**
   * Generate specific interaction types
   */
  async generateCelebration(achievement: string): Promise<StuPersonalityResponse> {
    const celebrations = [
      `🎉 AMAZING! You just ${achievement}! I'm doing a happy dance over here!`,
      `🔥 WOW! Look at you absolutely crushing it with ${achievement}!`,
      `⭐ STELLAR work on ${achievement}! You're officially a productivity superstar!`,
      `🚀 BOOM! ${achievement} complete! Your future self is giving you a standing ovation!`
    ];

    return {
      message: celebrations[Math.floor(Math.random() * celebrations.length)],
      mood: 'celebratory',
      animation: 'victory-dance',
      personality: this.basePersonality,
      contextualTips: [
        "Celebrate your wins - they fuel future success! 🎊",
        "This momentum is golden - keep it rolling! ⚡",
        "You've proven you can do hard things! 💎"
      ],
      voiceEnabled: true
    };
  }

  async generateEncouragement(challenge: string): Promise<StuPersonalityResponse> {
    const encouragements = [
      `I see you're working on ${challenge}. That takes courage - I believe in you! 💪`,
      `${challenge} might be tough, but remember: You're tougher! Let's break it down together! 🧩`,
      `Feeling stuck on ${challenge}? That's just your brain getting stronger! Keep going! 🧠`,
      `${challenge} is challenging you to level up! I know you've got what it takes! ⬆️`
    ];

    return {
      message: encouragements[Math.floor(Math.random() * encouragements.length)],
      mood: 'encouraging',
      animation: 'supportive-nod',
      personality: this.basePersonality,
      contextualTips: [
        "Break it into smaller steps - mountain climbed one step at a time! 🏔️",
        "Take a short break and come back fresh! 🌿",
        "Remember why this matters to you! 💭"
      ],
      voiceEnabled: true
    };
  }

  /**
   * Adjust personality based on user preferences
   */
  adjustPersonality(preferences: {
    encouragement?: number;
    humor?: number;
    directness?: number;
    empathy?: number;
  }): void {
    this.basePersonality = {
      ...this.basePersonality,
      ...preferences
    };
  }

  /**
   * Get personality status
   */
  getPersonalityStatus(): {
    currentMood: string;
    personality: {
      encouragement: number;
      humor: number;
      directness: number;
      empathy: number;
    };
    responsesAvailable: number;
  } {
    return {
      currentMood: 'adaptive',
      personality: this.basePersonality,
      responsesAvailable: Object.values(this.responses).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
} 