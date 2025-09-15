'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Calendar, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { InteractiveStu } from '@/components/stu/InteractiveStu';

interface WelcomeFlowProps {
  userName?: string;
  userSubjects?: string[];
  onComplete: () => void;
}

interface AIsuggestion {
  id: string;
  type: 'task' | 'schedule' | 'tip';
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

export const WelcomeFlow: React.FC<WelcomeFlowProps> = ({
  userName,
  userSubjects = [],
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [suggestions, setSuggestions] = useState<AIsuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  // Generate personalized AI suggestions based on user data
  useEffect(() => {
    const generateSuggestions = async () => {
      setIsGenerating(true);
      
      // Simulate AI processing time (but keep it short for immediate value)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const personalizedSuggestions: AIsuggestion[] = [
        {
          id: '1',
          type: 'task',
          title: 'Create Your First Study Session',
          description: userSubjects.length > 0 
            ? `I've prepared a ${userSubjects[0]} study plan for you!`
            : 'Let\'s set up your first productive study session.',
          icon: <Calendar className="h-5 w-5 text-blue-500" />,
          action: 'Create Session'
        },
        {
          id: '2',
          type: 'schedule',
          title: 'Optimize Your Study Time',
          description: 'Based on research, I recommend studying in 25-minute focused blocks.',
          icon: <Target className="h-5 w-5 text-green-500" />,
          action: 'Set Schedule'
        },
        {
          id: '3',
          type: 'tip',
          title: 'Smart Study Tip',
          description: 'Try the "explain it to someone else" technique to boost retention by 90%!',
          icon: <Sparkles className="h-5 w-5 text-purple-500" />,
          action: 'Learn More'
        }
      ];
      
      setSuggestions(personalizedSuggestions);
      setIsGenerating(false);
    };

    generateSuggestions();
  }, [userSubjects]);

  const steps = [
    {
      title: `Welcome to MemoSpark${userName ? `, ${userName}` : ''}! 🎉`,
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 mb-4">
            <InteractiveStu size={96} />
          </div>
          <p className="text-muted-foreground">
            I'm Stu, your AI study companion! I'm already analyzing your preferences to create personalized recommendations.
          </p>
        </div>
      )
    },
    {
      title: 'Your Personalized AI Suggestions',
      content: (
        <div className="space-y-4">
          {isGenerating ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Generating your personalized study plan...</p>
            </div>
          ) : (
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {suggestion.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">
                            {suggestion.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {suggestion.description}
                          </p>
                          {suggestion.action && (
                            <Button size="sm" variant="outline" className="text-xs">
                              {suggestion.action}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )
    },
    {
      title: 'You\'re All Set! 🚀',
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-muted-foreground">
            Your MemoSpark dashboard is ready! I'll continue learning your study patterns and providing smarter suggestions as you use the app.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Quick Start Tips:</p>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Add your first task in the Tasks tab</li>
              <li>• Check out the Gamification tab for achievements</li>
              <li>• Visit the Connections tab to find study partners</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex space-x-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index <= currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-muted-foreground"
              >
                Skip
              </Button>
            </div>
            <CardTitle className="text-xl">
              {steps[currentStep].title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {steps[currentStep].content}
              </motion.div>
            </AnimatePresence>
            
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-muted-foreground">
                {currentStep + 1} of {steps.length}
              </div>
              
              <Button onClick={handleNext} className="flex items-center gap-2">
                {currentStep === steps.length - 1 ? (
                  <>
                    Get Started
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    {currentStep === 0 ? 'Show Me!' : 'Continue'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

