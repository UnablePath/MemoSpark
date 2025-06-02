'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Volume2, VolumeX, Sparkles, MessageCircle, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserContext, updateStuPreferences, saveUserContext } from '@/lib/userContext';
import { KoalaMascot } from '@/components/ui/koala-mascot';

interface StuPreferencesProps {
  userContext: UserContext;
  onContextUpdate: (context: UserContext) => void;
  className?: string;
}

export const StuPreferences: React.FC<StuPreferencesProps> = ({
  userContext,
  onContextUpdate,
  className
}) => {
  const [preferences, setPreferences] = useState(userContext.stuPreferences);
  const [previewAnimation, setPreviewAnimation] = useState<'idle' | 'excited' | 'celebrating'>('idle');

  const handlePreferenceChange = <K extends keyof typeof preferences>(
    key: K,
    value: typeof preferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    const updatedContext = updateStuPreferences(userContext, newPreferences);
    onContextUpdate(updatedContext);
    saveUserContext(updatedContext);

    if (key === 'showCelebrations' && value) {
      setPreviewAnimation('celebrating');
      setTimeout(() => setPreviewAnimation('idle'), 2000);
    } else if (key === 'messageFrequency' && value === 'frequent') {
      setPreviewAnimation('excited');
      setTimeout(() => setPreviewAnimation('idle'), 1500);
    }
  };

  const testCelebration = () => {
    setPreviewAnimation('celebrating');
    setTimeout(() => setPreviewAnimation('idle'), 2000);
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Stu Preferences
        </CardTitle>
        <CardDescription>
          Customize how Stu interacts with you during your study sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4 p-4 bg-primary/5 rounded-lg">
          <motion.div
            animate={previewAnimation}
            variants={{
              idle: {
                y: [0, -2, 0],
                transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }
              },
              excited: {
                y: [0, -10, 0, -8, 0],
                rotate: [-5, 5, -5, 5, 0],
                transition: { duration: 0.5, repeat: 3, repeatType: "loop" }
              },
              celebrating: {
                scale: [1, 1.3, 1.1, 1.3, 1],
                rotate: [0, -10, 10, -5, 0],
                y: [0, -15, 0, -10, 0],
                transition: { duration: 2, repeat: 2, repeatType: "loop" }
              }
            }}
            className="relative"
          >
            <KoalaMascot className="w-15 h-15" />
            {previewAnimation === 'celebrating' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-lg animate-bounce">
                🎉✨
              </div>
            )}
          </motion.div>
          <p className="text-sm text-center text-muted-foreground">
            {previewAnimation === 'celebrating' ? 
              "Celebrating your achievements! 🎊" :
              previewAnimation === 'excited' ?
              "I'm excited to help you study! 🌟" :
              "Hi! I'm Stu, your study companion! 🐨"
            }
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label htmlFor="celebrations" className="text-sm font-medium">
                Show Celebrations
              </Label>
            </div>
            <Switch
              id="celebrations"
              checked={preferences.showCelebrations}
              onCheckedChange={(checked) => handlePreferenceChange('showCelebrations', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Display confetti and special animations when you complete tasks
          </p>
          
          {preferences.showCelebrations && (
            <Button
              variant="outline"
              size="sm"
              onClick={testCelebration}
              className="ml-6 text-xs h-8"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Test Celebration
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <Label htmlFor="message-frequency" className="text-sm font-medium">
              Message Frequency
            </Label>
          </div>
          <Select
            value={preferences.messageFrequency}
            onValueChange={(value: 'minimal' | 'normal' | 'frequent') => 
              handlePreferenceChange('messageFrequency', value)
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">
                <div className="flex flex-col items-start">
                  <span>Minimal</span>
                  <span className="text-xs text-muted-foreground">Only essential messages</span>
                </div>
              </SelectItem>
              <SelectItem value="normal">
                <div className="flex flex-col items-start">
                  <span>Normal</span>
                  <span className="text-xs text-muted-foreground">Balanced encouragement</span>
                </div>
              </SelectItem>
              <SelectItem value="frequent">
                <div className="flex flex-col items-start">
                  <span>Frequent</span>
                  <span className="text-xs text-muted-foreground">Maximum motivation!</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {preferences.enableSounds ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="sounds" className="text-sm font-medium">
                Enable Sounds
              </Label>
            </div>
            <Switch
              id="sounds"
              checked={preferences.enableSounds}
              onCheckedChange={(checked) => handlePreferenceChange('enableSounds', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Play audio feedback for achievements and interactions
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <Label htmlFor="personality-tone" className="text-sm font-medium">
              Personality Tone
            </Label>
          </div>
          <Select
            value={preferences.preferredTone}
            onValueChange={(value: 'encouraging' | 'neutral' | 'playful') => 
              handlePreferenceChange('preferredTone', value)
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="encouraging">
                <div className="flex flex-col items-start">
                  <span>Encouraging</span>
                  <span className="text-xs text-muted-foreground">Motivational and supportive</span>
                </div>
              </SelectItem>
              <SelectItem value="neutral">
                <div className="flex flex-col items-start">
                  <span>Neutral</span>
                  <span className="text-xs text-muted-foreground">Professional and focused</span>
                </div>
              </SelectItem>
              <SelectItem value="playful">
                <div className="flex flex-col items-start">
                  <span>Playful</span>
                  <span className="text-xs text-muted-foreground">Fun and energetic</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Your Study Journey with Stu</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-lg font-bold text-primary">{userContext.totalTasks}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-primary">{userContext.currentStreak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-primary">{userContext.tasksCompletedToday}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StuPreferences; 