'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users } from 'lucide-react';
import { getDailyCrashoutStats } from '@/lib/supabase/crashoutApi';

interface CrashoutStatsProps {
  className?: string;
}

export const CrashoutStats: React.FC<CrashoutStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<{
    total: number;
    by_mood: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const dailyStats = await getDailyCrashoutStats();
        setStats(dailyStats);
      } catch (error) {
        console.error('Failed to fetch crashout stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className={`bg-gray-800/50 backdrop-blur-sm border-gray-700 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading stats...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const topMoods = Object.entries(stats.by_mood)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const moodEmojis: Record<string, string> = {
    stressed: '😤',
    overwhelmed: '😵‍💫',
    frustrated: '🤬',
    anxious: '😬',
    sad: '😢',
    angry: '😡',
    exhausted: '😴',
    excited: '🤩',
    calm: '😌'
  };

  return (
    <Card className={`bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          <span>Today's Crashouts</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">Total</span>
          </div>
          <Badge variant="outline" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
            {stats.total}
          </Badge>
        </div>

        {/* Top Moods */}
        {topMoods.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Top Moods</span>
            <div className="space-y-1">
              {topMoods.map(([mood, count]) => (
                <div key={mood} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{moodEmojis[mood] || '❓'}</span>
                    <span className="text-xs text-gray-300 capitalize">{mood}</span>
                  </div>
                  <span className="text-xs text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.total === 0 && (
          <div className="text-center py-2">
            <span className="text-xs text-gray-400">No crashouts today... yet! 🤫</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 