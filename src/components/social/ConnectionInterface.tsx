"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudentDiscovery, UserSearchResult } from '@/lib/social/StudentDiscovery';
import { StudyGroupManager, StudyGroup } from '@/lib/social/StudyGroupManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Check, X, UserPlus, Users, MessageSquare, List, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SwipeInterface } from './SwipeInterface';
import { StudyGroupHub } from './StudyGroupHub';
import { ActivityFeed } from './ActivityFeed';
import { ConnectionManager } from './ConnectionManager';
import { useAchievementTrigger } from '@/hooks/useAchievementTrigger';

interface ConnectionInterfaceProps {
  onSwipeModeChange?: (isSwipeMode: boolean) => void;
}

export const ConnectionInterface: React.FC<ConnectionInterfaceProps> = ({ onSwipeModeChange }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { triggerAchievement } = useAchievementTrigger();

  const studentDiscovery = useMemo(() => new StudentDiscovery(getToken), [getToken]);
  const studyGroupManager = useMemo(() => new StudyGroupManager(getToken), [getToken]);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
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
    const results = await studentDiscovery.searchUsers(searchTerm, user.id);
    setSearchResults(results);
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!user) return;
    await studentDiscovery.sendConnectionRequest(user.id, receiverId);
    setSearchResults(prev => prev.filter(r => r.clerk_user_id !== receiverId));
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;
    await studentDiscovery.acceptConnectionRequest(requesterId, user.id);
    loadAllData();
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (!user) return;
    await studentDiscovery.rejectConnectionRequest(requesterId, user.id);
    loadAllData();
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    await studyGroupManager.createGroup(newGroupName, user.id, newGroupDescription);
    setNewGroupName('');
    setNewGroupDescription('');
    loadAllData();
  };
  
  const loadAllData = useCallback(async () => {
    if (!user) return;
    const [userConnections, requests, userGroups] = await Promise.all([
      studentDiscovery.getConnections(user.id),
      studentDiscovery.getIncomingConnectionRequests(user.id),
      studyGroupManager.getUserGroups(user.id)
    ]);
    setConnections(userConnections);
    setIncomingRequests(requests);
    setGroups(userGroups);
  }, [studentDiscovery, studyGroupManager, user]);

  useEffect(() => {
    if(user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const getConnectionProfile = (connection: any) => {
    return connection.requester_id === user?.id ? connection.receiver : connection.requester;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-green-500">Connect & Collaborate</h1>
        <div className="flex items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Input 
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
            <Button onClick={handleSearch} variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
              <Search className="h-4 w-4"/>
            </Button>
          </div>
          <div className="flex items-center space-x-2">
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
            <ConnectionManager searchTerm={searchTerm} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityFeed />
                <StudyGroupHub />
            </div>
        </div>
      )}
    </div>
  );
}; 