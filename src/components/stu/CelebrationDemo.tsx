'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useCelebration } from '@/hooks/useCelebration';
import type { Achievement } from '@/types/achievements';

export const CelebrationDemo: React.FC = () => {
  const { 
    celebrate,
    achievementUnlocked,
    streakMilestone,
    coinsEarned,
    levelUp,
    taskCompleted,
    firstTimeAchievement,
    stopCelebration,
    isPlaying
  } = useCelebration();

  const mockAchievement: Achievement = {
    id: 'demo-achievement',
    name: 'Demo Master',
    description: 'You tested the celebration system!',
    icon: '🎉',
    type: 'tutorial',
    criteria: { test: true },
    points_reward: 100,
    created_at: new Date().toISOString()
  };

  const rareAchievement: Achievement = {
    id: 'rare-demo',
    name: 'Legendary Tester',
    description: 'You discovered the rare celebration!',
    icon: '🦄',
    type: 'other',
    criteria: { rarity: 'legendary' },
    points_reward: 500,
    created_at: new Date().toISOString()
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎭 Stu Celebration Demo
          {isPlaying && <span className="text-sm text-green-600 font-normal">(Playing...)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            onClick={() => achievementUnlocked({ 
              ...mockAchievement, 
              achievements: mockAchievement 
            } as any)}
            size="sm"
            variant="outline"
          >
            🏆 Achievement
          </Button>

          <Button
            onClick={() => achievementUnlocked({ 
              ...rareAchievement, 
              achievements: rareAchievement 
            } as any)}
            size="sm"
            variant="outline"
          >
            🦄 Rare Achievement
          </Button>

          <Button
            onClick={() => streakMilestone(7)}
            size="sm"
            variant="outline"
          >
            🔥 7-Day Streak
          </Button>

          <Button
            onClick={() => coinsEarned(50)}
            size="sm"
            variant="outline"
          >
            💰 Earn Coins
          </Button>

          <Button
            onClick={() => levelUp(5)}
            size="sm"
            variant="outline"
          >
            🚀 Level Up
          </Button>

          <Button
            onClick={() => taskCompleted('Study Session')}
            size="sm"
            variant="outline"
          >
            ✅ Task Done
          </Button>

          <Button
            onClick={() => firstTimeAchievement('First Timer')}
            size="sm"
            variant="outline"
          >
            🌱 First Time
          </Button>

          <Button
            onClick={() => celebrate('level_up', undefined, 'Custom message test!')}
            size="sm"
            variant="outline"
          >
            💫 Custom
          </Button>

          <Button
            onClick={stopCelebration}
            size="sm"
            variant="destructive"
            disabled={!isPlaying}
          >
            ⏹️ Stop
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">🔄 Ready for Lottie Animations!</h4>
          <p className="text-sm text-muted-foreground">
            The celebration system is set up with placeholder paths for Lottie JSON files. 
            Simply replace the commented sections in CelebrationOverlay.tsx with your actual 
            Lottie animation files when ready.
          </p>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <div>• <code>/animations/stu-epic-celebration.json</code> - Rare achievements</div>
            <div>• <code>/animations/stu-level-up-celebration.json</code> - Level ups</div>
            <div>• <code>/animations/stu-achievement-celebration.json</code> - Regular achievements</div>
            <div>• <code>/animations/stu-streak-celebration.json</code> - Streak milestones</div>
            <div>• <code>/animations/stu-coin-celebration.json</code> - Coin rewards</div>
            <div>• <code>/animations/stu-happy-celebration.json</code> - Task completion</div>
            <div>• <code>/animations/stu-welcome-celebration.json</code> - First time events</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 