'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Sparkles, Brain, Clock, Heart, CheckCircle, ArrowRight } from 'lucide-react';
import { InteractiveStu } from '@/components/stu/InteractiveStu';
import { useRouter } from 'next/navigation';
import QuestionnaireManager, { 
  QuestionnaireTemplate, 
  QuestionnaireQuestion, 
  QuestionnaireResponse 
} from '@/lib/ai/QuestionnaireManager';

interface AIQuestionnaireProps {
  onComplete?: (patterns: any) => void;
  className?: string;
}

const categoryIcons = {
  onboarding: Sparkles,
  preferences: Brain,
  schedule: Clock,
  habits: CheckCircle,
  stress: Heart
};

const categoryColors = {
  onboarding: 'bg-gradient-to-r from-purple-500 to-pink-500',
  preferences: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  schedule: 'bg-gradient-to-r from-green-500 to-emerald-500',
  habits: 'bg-gradient-to-r from-orange-500 to-red-500',
  stress: 'bg-gradient-to-r from-pink-500 to-rose-500'
};

export const AIQuestionnaire: React.FC<AIQuestionnaireProps> = ({ 
  onComplete, 
  className = '' 
}) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [questionnaireManager] = useState(() => new QuestionnaireManager(getToken));
  
  // State management
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<QuestionnaireTemplate | null>(null);
  const [currentResponse, setCurrentResponse] = useState<QuestionnaireResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stuMessage, setStuMessage] = useState('');
  const [stuState, setStuState] = useState<'idle' | 'talking' | 'excited' | 'thinking' | 'celebrating'>('idle');
  
  // Debounce timer
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Detect native time input support (iOS Safari lacks reliable support and may reset values)
  const supportsNativeTimeInput = React.useMemo(() => {
    if (typeof document === 'undefined') return true;
    const input = document.createElement('input');
    input.setAttribute('type', 'time');
    // If unsupported, browser falls back to text
    return input.type === 'time';
  }, []);

  // Initialize questionnaire
  useEffect(() => {
    if (user?.id) {
      loadQuestionnaires();
    }
  }, [user?.id]);

  // Local storage key per user to prevent transient resets between renders/navigation
  const localStorageKey = user?.id ? `questionnaire_answers_${user.id}` : undefined;

  // Merge locally cached answers on mount/template change (does not override server data)
  useEffect(() => {
    if (!localStorageKey || !currentTemplate) return;
    try {
      const raw = localStorage.getItem(localStorageKey);
      if (!raw) return;
      const cached: Record<string, any> = JSON.parse(raw);
      if (cached && typeof cached === 'object') {
        setAnswers(prev => ({ ...cached, ...prev }));
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTemplate?.id, localStorageKey]);

  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      console.log('Loading questionnaires for user:', user?.id);
      
      // Get next recommended questionnaire
      const nextTemplate = await questionnaireManager.getNextRecommendedQuestionnaire(user!.id);
      console.log('Next template found:', nextTemplate);
      
      if (nextTemplate) {
        setCurrentTemplate(nextTemplate);
        
        // Check if user has existing response
        const existingResponse = await questionnaireManager.getUserResponse(user!.id, nextTemplate.id);
        console.log('Existing response:', existingResponse);
        
        if (existingResponse) {
          setCurrentResponse(existingResponse);
          setAnswers(existingResponse.responses);
          
          // Find current question index based on responses - but don't go backwards
          const answeredQuestions = Object.keys(existingResponse.responses);
          const nextQuestionIndex = nextTemplate.questions.findIndex(q => !answeredQuestions.includes(q.id));
          
          // Only update question index if we're loading fresh or moving forward
          if (currentQuestionIndex === 0 || nextQuestionIndex > currentQuestionIndex) {
            setCurrentQuestionIndex(Math.max(0, nextQuestionIndex));
          }
          // If nextQuestionIndex is -1 (all questions answered), stay at current position
          if (nextQuestionIndex === -1 && currentQuestionIndex < nextTemplate.questions.length - 1) {
            // Keep current position, don't jump to end
          }
        } else {
          // Start new questionnaire
          console.log('Starting new questionnaire...');
          const newResponse = await questionnaireManager.startQuestionnaire(user!.id, nextTemplate.id);
          console.log('New response created:', newResponse);
          setCurrentResponse(newResponse);
          setCurrentQuestionIndex(0); // Always start at beginning for new questionnaire
        }
        
        // Set initial Stu message
        setStuMessage(`Hi! I'm Stu, and I'm here to help learn about your study habits. Let's start with "${nextTemplate.title}". Ready?`);
        setStuState('talking');
      } else {
        // Check if user has any completed questionnaires
        const userResponses = await questionnaireManager.getUserResponses(user!.id);
        const hasCompletedQuestionnaires = userResponses.some(r => r.completion_status === 'completed');
        
        if (hasCompletedQuestionnaires) {
          // User has completed all available questionnaires
          setCompleted(true);
          setStuMessage("Wow! You've completed all our questionnaires! I now understand your study patterns much better. Let me analyze this data to give you personalized suggestions!");
          setStuState('celebrating');
        } else {
          // No questionnaires available (system issue)
          setStuMessage("Hmm, I'm having trouble loading questionnaires right now. Let's try refreshing the page!");
          setStuState('thinking');
        }
      }
    } catch (err: any) {
      console.error('Error loading questionnaires:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      setStuMessage("Oops! I'm having trouble loading the questionnaire. Let's try again in a moment.");
      setStuState('thinking');
    } finally {
      setLoading(false);
    }
  };

  // Debounced answer handler for continuous inputs like sliders/text
  const handleDebouncedAnswer = React.useCallback((questionId: string, answer: any) => {
    if (!currentTemplate || !user?.id) return;
    
    const updatedAnswers = { ...answers, [questionId]: answer };
    setAnswers(updatedAnswers);

    // Persist immediately to localStorage to avoid any UI-driven resets
    try {
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify(updatedAnswers));
      }
    } catch {}

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        await questionnaireManager.updateResponse(user.id, currentTemplate.id, updatedAnswers);
        setStuMessage(getRandomEncouragement());
        setStuState('thinking');
      } catch (err: any) {
        console.error('Error saving debounced answer:', {
          message: err.message,
          details: err.details,
          code: err.code,
          fullError: err
        });
        setStuMessage("I couldn't save that... let's try moving it again.");
        setStuState('thinking');
      }
    }, 500); // 500ms debounce delay
  }, [answers, currentTemplate, user?.id, questionnaireManager]);

  const handleAnswer = async (questionId: string, answer: any, autoAdvance: boolean = true) => {
    if (!currentTemplate || !user?.id) return;

    try {
      const updatedAnswers = { ...answers, [questionId]: answer };
      setAnswers(updatedAnswers);

      // Persist to local cache immediately
      try {
        if (localStorageKey) {
          localStorage.setItem(localStorageKey, JSON.stringify(updatedAnswers));
        }
      } catch {}

      // Update response in database
      await questionnaireManager.updateResponse(user.id, currentTemplate.id, updatedAnswers);

      // Update Stu's reaction
      setStuState('thinking');
      setStuMessage(getRandomEncouragement());

      if (autoAdvance) {
        // Auto-advance to next question after a shorter delay
        setTimeout(() => {
          if (currentQuestionIndex < currentTemplate.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setStuState('excited');
          } else {
            handleQuestionnaireComplete();
          }
        }, 800); // Reduced from 1000ms to 800ms
      }
      
    } catch (err: any) {
      console.error('Error saving answer:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      setStuMessage("I couldn't save that answer. Let's try again!");
      setStuState('thinking');
    }
  };

  const handleQuestionnaireComplete = async () => {
    if (!user?.id) return;

    try {
      setSubmitting(true);
      setStuState('celebrating');
      setStuMessage("Amazing! You've completed this questionnaire. Let me analyze your responses...");

      // Analyze patterns
      const patterns = await questionnaireManager.analyzeUserPatterns(user.id);
      
      // Check for next questionnaire
      const nextTemplate = await questionnaireManager.getNextRecommendedQuestionnaire(user.id);
      
      if (nextTemplate) {
        // More questionnaires available
        setStuMessage(`Great job! I learned a lot about you. Ready for the next questionnaire: "${nextTemplate.title}"?`);
        
        // Immediately create a response for the next questionnaire so answers persist
        try {
          const newResponse = await questionnaireManager.startQuestionnaire(user.id, nextTemplate.id);
          setCurrentTemplate(nextTemplate);
          setCurrentResponse(newResponse);
          setAnswers(newResponse?.responses || {});
          setCurrentQuestionIndex(0);
          setStuState('excited');
        } catch (e) {
          // If creating the response fails, keep the UI message and allow retry via reload
          console.error('Failed to start next questionnaire response', e);
        }
      } else {
        // All questionnaires completed
        setCompleted(true);
        setStuMessage("Fantastic! I now have a complete picture of your study habits. This will help me give you much better suggestions!");
        
        if (onComplete) {
          onComplete(patterns);
        }
      }
    } catch (err: any) {
      console.error('Error completing questionnaire:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      setStuMessage("I had trouble analyzing your responses, but don't worry - we can continue!");
      setStuState('thinking');
    } finally {
      setSubmitting(false);
      // Clear any cached answers after completion to avoid stale state later
      try {
        if (localStorageKey) localStorage.removeItem(localStorageKey);
      } catch {}
    }
  };

  const resetQuestionnaires = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Resetting questionnaires for user:', user.id);
      
      // Delete all user responses to reset questionnaires
      const supabaseClient = (questionnaireManager as any).supabase;
      const { error } = await supabaseClient
        .from('user_questionnaire_responses')
        .delete()
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error resetting questionnaires:', error);
        return;
      }
      
      // Reset component state
      setCompleted(false);
      setCurrentTemplate(null);
      setCurrentResponse(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      
      // Reload questionnaires
      loadQuestionnaires();
      
    } catch (err: any) {
      console.error('Error resetting questionnaires:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
    }
  };

  const getRandomEncouragement = (): string => {
    const encouragements = [
      "Great choice! That tells me a lot about your study style.",
      "Interesting! I'm learning so much about you.",
      "Perfect! This helps me understand your preferences.",
      "Awesome! Your study habits are becoming clearer to me.",
      "Excellent! This will help me give you better suggestions.",
      "Nice! I can see your learning patterns forming.",
      "Wonderful! This insight will be really valuable.",
      "Cool! I'm getting a better picture of your routine."
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  const renderQuestion = (question: QuestionnaireQuestion) => {
    const currentAnswer = answers[question.id];

    switch (question.type) {
      case 'multiple_choice':
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) => handleAnswer(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple_select':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={Array.isArray(currentAnswer) && currentAnswer.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
                    if (checked) {
                      handleAnswer(question.id, [...currentArray, option]);
                    } else {
                      handleAnswer(question.id, currentArray.filter((item: string) => item !== option));
                    }
                  }}
                />
                <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-4">
            <Slider
              value={[currentAnswer || question.min || 0]}
              onValueChange={([value]) => {
                // Update local state immediately for visual feedback
                setAnswers(prev => ({ ...prev, [question.id]: value }));
                // Debounce the database update and stu message
                handleDebouncedAnswer(question.id, value);
              }}
              min={question.min || 0}
              max={question.max || 100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{question.min} {question.unit}</span>
              <span className="font-medium">
                {currentAnswer || question.min || 0} {question.unit}
              </span>
              <span>{question.max} {question.unit}</span>
            </div>
          </div>
        );

      case 'time':
        if (supportsNativeTimeInput) {
          return (
            <Input
              type="time"
              value={currentAnswer || ''}
              onChange={(e) => handleDebouncedAnswer(question.id, e.target.value)}
              className="w-full"
            />
          );
        }
        // Fallback: stable hour/minute selectors to avoid input resets on unsupported browsers
        const raw = typeof currentAnswer === 'string' ? currentAnswer : '';
        const [hStr, mStr] = (raw && raw.includes(':')) ? raw.split(':') : ['',''];
        const hour = hStr !== '' ? parseInt(hStr, 10) : undefined;
        const minute = mStr !== '' ? parseInt(mStr, 10) : undefined;

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // step 5m for usability

        const updateTime = (newHour: number | undefined, newMinute: number | undefined) => {
          if (newHour === undefined || newMinute === undefined) {
            handleDebouncedAnswer(question.id, '');
            return;
          }
          const hh = String(newHour).padStart(2, '0');
          const mm = String(newMinute).padStart(2, '0');
          handleDebouncedAnswer(question.id, `${hh}:${mm}`);
        };

        return (
          <div className="flex gap-3">
            <div className="flex-1 min-w-[8rem]">
              <Label htmlFor={`${question.id}-hour`} className="mb-2 block">Hour</Label>
              <select
                id={`${question.id}-hour`}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={hour ?? ''}
                onChange={(e) => updateTime(
                  e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                  minute
                )}
              >
                <option value="">--</option>
                {hours.map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[8rem]">
              <Label htmlFor={`${question.id}-minute`} className="mb-2 block">Minute</Label>
              <select
                id={`${question.id}-minute`}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={minute ?? ''}
                onChange={(e) => updateTime(
                  hour,
                  e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                )}
              >
                <option value="">--</option>
                {minutes.map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'text':
        return (
          <Textarea
            value={currentAnswer || ''}
            onChange={(e) => handleDebouncedAnswer(question.id, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full min-h-[100px]"
          />
        );

      case 'rating':
        return (
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant={currentAnswer === rating ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAnswer(question.id, rating)}
                className="w-12 h-12"
              >
                {rating}
              </Button>
            ))}
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
              <div className="text-center space-y-4">
        <InteractiveStu size="lg" />
        <p className="text-muted-foreground">Loading your personalized questionnaire...</p>
      </div>
      </div>
    );
  }

  if (completed) {
    return (
      <Card className={`w-full max-w-2xl mx-auto ${className}`}>
        <CardContent className="p-8 text-center space-y-6">
          <InteractiveStu size="lg" />
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-green-600">Questionnaires Complete! 🎉</h2>
            <p className="text-muted-foreground">
              I've learned so much about your study habits and preferences. 
              This will help me provide much better personalized suggestions!
            </p>
            {stuMessage && (
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                <p className="text-blue-800">{stuMessage}</p>
              </div>
            )}
            
            {/* Go to Dashboard Button */}
            <div className="pt-4">
              <Button 
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Reset button for testing/debugging */}
            {process.env.NODE_ENV === 'development' && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={resetQuestionnaires}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  🔄 Reset Questionnaires (Dev Only)
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentTemplate) {
    return (
      <Card className={`w-full max-w-2xl mx-auto ${className}`}>
        <CardContent className="p-8 text-center space-y-6">
          <InteractiveStu size="lg" />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Ready to Start Your Assessment?</h2>
            <p className="text-muted-foreground">
              Let's discover your learning patterns and preferences to give you personalized recommendations!
            </p>
            <Button 
              onClick={loadQuestionnaires}
              disabled={loading}
              size="lg"
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Start Assessment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = currentTemplate.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / currentTemplate.questions.length) * 100;
  const IconComponent = categoryIcons[currentTemplate.category];

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${categoryColors[currentTemplate.category]} text-white`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {currentTemplate.title}
                <Badge variant="secondary">
                  {currentQuestionIndex + 1} of {currentTemplate.questions.length}
                </Badge>
              </CardTitle>
              <CardDescription>{currentTemplate.description}</CardDescription>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Stu's Message */}
      {stuMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400"
        >
          <InteractiveStu size="sm" />
          <div className="flex-1">
            <p className="text-blue-800">{stuMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.question}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderQuestion(currentQuestion)}
              
              {/* Navigation */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0 || submitting}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {currentTemplate.questions.length}
                </div>
                
                <Button
                  onClick={() => {
                    if (currentQuestionIndex < currentTemplate.questions.length - 1) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    } else {
                      handleQuestionnaireComplete();
                    }
                  }}
                  disabled={
                    submitting || 
                    (currentQuestion.required && !answers[currentQuestion.id])
                  }
                  className="flex items-center gap-2"
                >
                  {currentQuestionIndex === currentTemplate.questions.length - 1 ? (
                    submitting ? 'Analyzing...' : 'Complete'
                  ) : (
                    'Next'
                  )}
                  {currentQuestionIndex < currentTemplate.questions.length - 1 && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AIQuestionnaire; 