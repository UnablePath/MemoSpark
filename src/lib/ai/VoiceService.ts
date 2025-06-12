import { ExtendedTask } from '../../types/ai';

// Extended speech recognition interfaces
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}

export interface VoiceProcessingResult {
  transcription: string;
  extractedTasks: Array<{
    title: string;
    subject?: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    description?: string;
  }>;
  confidence: number;
  processingTime: number;
  language?: string;
}

export interface SpeechSynthesisOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

/**
 * VoiceService - Premium voice input/output features
 * Handles voice-to-text conversion and text-to-speech for Stu personality
 */
export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    // Check for browser support
    if (typeof window !== 'undefined') {
      // Speech Recognition
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.setupRecognition();
      }

      // Speech Synthesis
      if (window.speechSynthesis) {
        this.synthesis = window.speechSynthesis;
      }

      this.isSupported = !!(this.recognition && this.synthesis);
    }

    if (!this.isSupported) {
      console.warn('Voice services not supported in this environment');
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
  }

  /**
   * Process voice input and extract tasks
   */
  async processVoiceInput(audioData: any, userId: string): Promise<VoiceProcessingResult> {
    const startTime = Date.now();

    if (!this.isSupported || !this.recognition) {
      return {
        transcription: 'Voice input not supported in this environment',
        extractedTasks: [],
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }

    try {
      // If audioData is provided, process it; otherwise use live microphone
      let transcription: string;
      
      if (audioData) {
        transcription = await this.processAudioData(audioData);
      } else {
        transcription = await this.startListening();
      }

      // Extract tasks from transcription
      const extractedTasks = this.extractTasksFromText(transcription);
      
      // Calculate confidence based on clarity of extracted information
      const confidence = this.calculateConfidence(transcription, extractedTasks);

      return {
        transcription,
        extractedTasks,
        confidence,
        processingTime: Date.now() - startTime,
        language: 'en-US'
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        transcription: 'Error processing voice input',
        extractedTasks: [],
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Start listening for voice input
   */
  private startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      this.isListening = true;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        resolve(transcript);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
    });
  }

  /**
   * Process pre-recorded audio data
   */
  private async processAudioData(audioData: any): Promise<string> {
    // In a real implementation, this would process audio data
    // For now, return a simulated result
    return 'Create a math assignment due tomorrow at 5 PM with high priority';
  }

  /**
   * Extract task information from text using pattern matching
   */
  private extractTasksFromText(text: string): Array<{
    title: string;
    subject?: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    description?: string;
  }> {
    const tasks: Array<{
      title: string;
      subject?: string;
      priority: 'low' | 'medium' | 'high';
      dueDate?: string;
      description?: string;
    }> = [];

    // Keywords that indicate task creation
    const taskKeywords = ['create', 'add', 'make', 'schedule', 'plan', 'do', 'finish', 'complete'];
    const hasTaskKeyword = taskKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (!hasTaskKeyword) {
      return tasks;
    }

    // Extract priority
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (text.toLowerCase().includes('high priority') || text.toLowerCase().includes('urgent')) {
      priority = 'high';
    } else if (text.toLowerCase().includes('low priority') || text.toLowerCase().includes('later')) {
      priority = 'low';
    }

    // Extract subject/course
    const subjects = ['math', 'science', 'english', 'history', 'chemistry', 'physics', 'biology'];
    const subject = subjects.find(s => text.toLowerCase().includes(s));

    // Extract due date patterns
    const dueDate = this.extractDueDate(text);

    // Extract task title (simplified)
    let title = text;
    
    // Remove common prefixes
    const prefixes = ['create a', 'add a', 'make a', 'schedule a', 'plan a'];
    for (const prefix of prefixes) {
      if (title.toLowerCase().startsWith(prefix)) {
        title = title.substring(prefix.length).trim();
        break;
      }
    }

    // Clean up title
    title = title.split(' due ')[0]; // Remove due date part
    title = title.split(' with ')[0]; // Remove priority part
    title = title.charAt(0).toUpperCase() + title.slice(1); // Capitalize

    tasks.push({
      title: title || 'Voice-created task',
      subject,
      priority,
      dueDate,
      description: `Created from voice input: "${text}"`
    });

    return tasks;
  }

  /**
   * Extract due date from text
   */
  private extractDueDate(text: string): string | undefined {
    const today = new Date();
    
    // Common patterns
    if (text.toLowerCase().includes('today')) {
      return today.toISOString();
    }
    
    if (text.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString();
    }
    
    if (text.toLowerCase().includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString();
    }

    // Time patterns (5 PM, 3:30, etc.)
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s?(am|pm|AM|PM)/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const isPM = timeMatch[3].toLowerCase() === 'pm';
      
      const dueDate = new Date(today);
      dueDate.setHours(isPM && hour !== 12 ? hour + 12 : hour, minute, 0, 0);
      
      return dueDate.toISOString();
    }

    return undefined;
  }

  /**
   * Calculate confidence score based on extracted information
   */
  private calculateConfidence(transcription: string, extractedTasks: any[]): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if we extracted tasks
    if (extractedTasks.length > 0) {
      confidence += 0.3;
    }
    
    // Higher confidence for clear speech (longer transcription)
    if (transcription.length > 20) {
      confidence += 0.1;
    }
    
    // Higher confidence if specific details were found
    const task = extractedTasks[0];
    if (task) {
      if (task.subject) confidence += 0.05;
      if (task.dueDate) confidence += 0.05;
      if (task.priority !== 'medium') confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Convert text to speech (for Stu personality)
   */
  async speak(text: string, options: SpeechSynthesisOptions = {}): Promise<void> {
    if (!this.synthesis) {
      console.warn('Speech synthesis not available');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set options
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        
        // Set voice if specified
        if (options.voice) {
          const voices = this.synthesis!.getVoices();
          const selectedVoice = voices.find(voice => 
            voice.name.includes(options.voice!) || voice.lang.includes(options.voice!)
          );
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

        this.synthesis!.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Check if voice services are supported
   */
  isVoiceSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get service status
   */
  getStatus(): {
    supported: boolean;
    listening: boolean;
    speaking: boolean;
    voices: number;
  } {
    return {
      supported: this.isSupported,
      listening: this.isListening,
      speaking: this.synthesis ? this.synthesis.speaking : false,
      voices: this.getAvailableVoices().length
    };
  }

  /**
   * Check browser support for voice features
   */
  checkBrowserSupport(): {
    speechRecognition: boolean;
    speechSynthesis: boolean;
    mediaDevices: boolean;
    overall: boolean;
  } {
    const hasWindow = typeof window !== 'undefined';
    const speechRecognition = hasWindow && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    const speechSynthesis = hasWindow && 'speechSynthesis' in window;
    const mediaDevices = hasWindow && navigator?.mediaDevices?.getUserMedia !== undefined;
    
    return {
      speechRecognition,
      speechSynthesis,
      mediaDevices,
      overall: speechRecognition && speechSynthesis
    };
  }

  /**
   * Get voice service health and status
   */
  getServiceHealth(): {
    status: string;
    isConfigured: boolean;
    environment: 'browser' | 'server' | 'unknown';
    features: {
      voiceInput: boolean;
      voiceOutput: boolean;
      audioProcessing: boolean;
    };
  } {
    const hasWindow = typeof window !== 'undefined';
    const environment = hasWindow ? 'browser' : 'server';
    const support = this.checkBrowserSupport();
    
    return {
      status: hasWindow ? 'Ready for browser usage' : 'Server environment - voice features disabled',
      isConfigured: true,
      environment,
      features: {
        voiceInput: support.speechRecognition,
        voiceOutput: support.speechSynthesis,
        audioProcessing: support.mediaDevices
      }
    };
  }
} 