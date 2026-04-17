"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudentDiscovery } from '@/lib/social/StudentDiscovery';
import { StudyGroupManager } from '@/lib/social/StudyGroupManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, List, BookOpen, Lightbulb } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SwipeInterface } from './SwipeInterface';
import { StudyGroupHub } from './StudyGroupHub';
import { ActivityFeed } from './ActivityFeed';
import { ConnectionManager } from './ConnectionManager';
import { useDebouncedAchievementTrigger } from '@/hooks/useDebouncedAchievementTrigger';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import { StudyGroupErrorBoundary } from '@/components/error-boundaries/StudyGroupErrorBoundary';

interface ConnectionInterfaceProps {
  onSwipeModeChange?: (isSwipeMode: boolean) => void;
}

export const ConnectionInterface: React.FC<ConnectionInterfaceProps> = ({ onSwipeModeChange }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { triggerAchievement } = useDebouncedAchievementTrigger();

  const getSupabaseToken = useMemo(() => wrapClerkTokenForSupabase(getToken), [getToken]);

  const studentDiscovery = useMemo(() => new StudentDiscovery(getSupabaseToken), [getSupabaseToken]);
  const studyGroupManager = useMemo(() => new StudyGroupManager(getSupabaseToken), [getSupabaseToken]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSwipeMode, setIsSwipeMode] = useState(false);

  // Communicate swipe mode changes to parent
  useEffect(() => {
    onSwipeModeChange?.(isSwipeMode);
  }, [isSwipeMode, onSwipeModeChange]);

  // Trigger achievement on mount
  useEffect(() => {
    triggerAchievement('connections_opened');
  }, [triggerAchievement]);

  const handleSearch = async () => {
    if (!user || !searchTerm.trim()) return;
    await studentDiscovery.searchUsers(searchTerm, user.id);
  };

  const loadAllData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      studentDiscovery.getConnections(user.id),
      studentDiscovery.getIncomingConnectionRequests(user.id),
      studyGroupManager.getUserGroups(user.id)
    ]);
  }, [studentDiscovery, studyGroupManager, user]);

  useEffect(() => {
    if(user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Connect and collaborate</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <div className="relative w-full min-w-0 sm:w-64">
            <Input 
              placeholder="Search students by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
            <Button onClick={handleSearch} variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
              <Search className="h-4 w-4"/>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <List className="h-5 w-5 text-muted-foreground"/>
            <Switch
                checked={isSwipeMode}
                onCheckedChange={setIsSwipeMode}
                id="swipe-mode-toggle"
            />
            <BookOpen className="h-5 w-5 text-muted-foreground"/>
            <Label htmlFor="swipe-mode-toggle" className="text-sm font-medium">Study Mode</Label>
          </div>
        </div>
      </div>
      
      {isSwipeMode ? (
        <SwipeInterface onSwipeModeChange={onSwipeModeChange} />
      ) : (
        <div className="space-y-6">
            {/* Search tip */}
            {searchTerm.trim() !== '' && (
              <div className="bg-muted/50 border border-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <Lightbulb className="mr-1 inline h-4 w-4 text-primary" />
                  <strong>Search tip:</strong> Use <code className="bg-background px-1 rounded">@name</code> to search by display name, or search by name/subjects normally.
                </p>
              </div>
            )}
            
            <StudyGroupErrorBoundary>
              <ConnectionManager searchTerm={searchTerm} />
            </StudyGroupErrorBoundary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityFeed />
                <StudyGroupErrorBoundary>
                  <StudyGroupHub />
                </StudyGroupErrorBoundary>
            </div>
        </div>
      )}
    </div>
  );
}; 