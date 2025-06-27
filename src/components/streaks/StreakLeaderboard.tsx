'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Eye, EyeOff, Crown, Medal, Award, RefreshCw } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useToast } from '@/components/ui/use-toast';
import { StreakTracker } from '@/lib/gamification/StreakTracker';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  rank: number;
  is_current_user: boolean;
  profile_visible: boolean;
}

interface StreakLeaderboardProps {
  variant?: 'card' | 'section';
  limit?: number;
  showPrivacyControls?: boolean;
  className?: string;
}

export const StreakLeaderboard: React.FC<StreakLeaderboardProps> = ({
  variant = 'card',
  limit = 10,
  showPrivacyControls = true,
  className = ''
}) => {
  const { userId, getToken } = useAuth();
  const { toast } = useToast();
  const [streakTracker] = useState(() => new StreakTracker());
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load leaderboard data
  const loadLeaderboard = async () => {
    if (!userId) return;
    
    try {
      setRefreshing(true);
      const data = await streakTracker.getStreakLeaderboard(
        limit,
        true,
        userId,
        getToken
      );
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load streak leaderboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load visibility preference
  const loadVisibility = async () => {
    if (!userId) return;
    
    try {
      const visible = await streakTracker.getStreakVisibility(userId, getToken);
      setIsVisible(visible);
    } catch (error) {
      console.error('Error loading visibility:', error);
    }
  };

  // Update visibility preference
  const updateVisibility = async (visible: boolean) => {
    if (!userId) return;
    
    setUpdating(true);
    try {
      const result = await streakTracker.updateStreakVisibility(
        userId,
        visible,
        getToken
      );
      
      if (result.success) {
        setIsVisible(visible);
        toast({
          title: "Privacy Updated",
          description: result.message,
        });
        // Reload leaderboard to reflect changes
        await loadLeaderboard();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (userId) {
      loadLeaderboard();
      loadVisibility();
    }
  }, [userId, limit]);

  // Get rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  // Get rank styling
  const getRankStyling = (rank: number, isCurrentUser: boolean) => {
    const baseClasses = "flex items-center justify-between p-3 rounded-lg border transition-colors";
    
    if (isCurrentUser) {
      return `${baseClasses} bg-primary/10 border-primary/30 shadow-sm`;
    }
    
    switch (rank) {
      case 1: return `${baseClasses} bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200`;
      case 2: return `${baseClasses} bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200`;
      case 3: return `${baseClasses} bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200`;
      default: return `${baseClasses} bg-card border-border hover:bg-accent/50`;
    }
  };

  const content = (
    <>
      {/* Privacy Controls */}
      {showPrivacyControls && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <Label htmlFor="visibility-toggle" className="text-sm">
              Show my streaks on leaderboard
            </Label>
          </div>
          <Switch
            id="visibility-toggle"
            checked={isVisible}
            onCheckedChange={updateVisibility}
            disabled={updating}
          />
        </div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div key={entry.user_id} className={getRankStyling(entry.rank, entry.is_current_user)}>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${entry.is_current_user ? 'text-primary' : 'text-foreground'}`}>
                      {entry.username}
                    </span>
                    {entry.is_current_user && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Best: {entry.longest_streak} days
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1">
                  <span className="text-lg font-bold text-orange-500">
                    {entry.current_streak}
                  </span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.total_points} pts
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No leaderboard data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start building streaks to see rankings!
          </p>
        </div>
      )}
    </>
  );

  if (variant === 'section') {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Streak Leaderboard
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLeaderboard}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Streak Leaderboard
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLeaderboard}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default StreakLeaderboard; 