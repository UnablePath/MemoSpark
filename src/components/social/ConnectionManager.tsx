"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudentDiscovery, UserSearchResult } from '@/lib/social/StudentDiscovery';
import { MessagingService } from '@/lib/messaging/MessagingService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, UserPlus, MessageSquare, AtSign, Flame, Trophy, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from '@/components/messaging/ChatInterface';
import { maskEmail, generateUsername } from '@/lib/utils';

// Streak Badge Component
const StreakBadge: React.FC<{ streakData: any }> = ({ streakData }) => {
  if (!streakData) return null;
  
  const { current_streak, longest_streak, total_points } = streakData;
  
  return (
    <div className="flex items-center gap-1 mt-1">
      {current_streak > 0 && (
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200">
          <Flame className="h-3 w-3 mr-1" />
          {current_streak}d
        </Badge>
      )}
      {longest_streak > 7 && (
        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200">
          <Trophy className="h-3 w-3 mr-1" />
          {longest_streak}
        </Badge>
      )}
      {total_points > 500 && (
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
          <Star className="h-3 w-3 mr-1" />
          {Math.floor(total_points / 100)}k
        </Badge>
      )}
    </div>
  );
};

interface ConnectionManagerProps {
  searchTerm: string;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ searchTerm }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const studentDiscovery = useMemo(() => new StudentDiscovery(getToken), [getToken]);
  const messagingService = useMemo(() => new MessagingService(getToken), [getToken]);

  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [chatUser, setChatUser] = useState<any>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!user || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    };
    const results = await studentDiscovery.searchUsers(searchTerm, user.id);
    setSearchResults(results);
  }, [studentDiscovery, searchTerm, user]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, handleSearch]);

  const handleSendRequest = async (receiverId: string) => {
    if (!user || loadingRequestId === receiverId) return;
    setLoadingRequestId(receiverId);
    try {
      await studentDiscovery.sendConnectionRequest(user.id, receiverId);
      setSentRequests(prev => [...prev, receiverId]);
    } catch (error) {
      console.error("Failed to send connection request:", error);
      // Optionally, show an error to the user
    } finally {
      setLoadingRequestId(null);
    }
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

  const loadAllData = useCallback(async () => {
    if (!user) return;
    const [userConnections, requests] = await Promise.all([
      studentDiscovery.getConnections(user.id),
      studentDiscovery.getIncomingConnectionRequests(user.id),
    ]);
    setConnections(userConnections);
    setIncomingRequests(requests);
  }, [studentDiscovery, user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const getConnectionProfile = (connection: any) => {
    return connection.requester_id === user?.id ? connection.receiver : connection.requester;
  }

  const startChat = async (otherUser: any) => {
    if (!user?.id) return;
    
    try {
      const conversationId = await messagingService.getOrCreateDirectConversation(
        user.id, 
        otherUser.clerk_user_id
      );
      setChatConversationId(conversationId);
      setChatUser(otherUser);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  return (
    <div className="space-y-6">
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.map((result) => {
              const username = generateUsername(result.full_name, result.clerk_user_id);
              const maskedEmail = maskEmail(result.email);
              
              return (
                <div key={result.clerk_user_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 ring-2 ring-background">
                      <AvatarImage src={result.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40">
                        {result.full_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{result.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <AtSign className="h-3 w-3" />
                          <span className="font-mono">{username}</span>
                        </div>
                        <span>•</span>
                        <span>{maskedEmail}</span>
                      </div>
                      {result.year_of_study && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.year_of_study}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleSendRequest(result.clerk_user_id)}
                    disabled={sentRequests.includes(result.clerk_user_id) || loadingRequestId === result.clerk_user_id}
                    className="ml-3 shrink-0"
                  >
                    {loadingRequestId === result.clerk_user_id 
                      ? 'Sending...' 
                      : sentRequests.includes(result.clerk_user_id) 
                        ? 'Request Sent' 
                        : <><UserPlus className="h-4 w-4 mr-2"/>Connect</>
                    }
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingRequests.length > 0 ? (
              incomingRequests.filter(req => req.requester).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={request.requester.avatar_url || ''} />
                      <AvatarFallback>{request.requester.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{request.requester.full_name || 'Unknown User'}</p>
                      <p className="text-xs text-muted-foreground">
                        @{generateUsername(request.requester.full_name, request.requester.clerk_user_id)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleRejectRequest(request.requester_id)}>
                      <X className="h-4 w-4"/>
                    </Button>
                    <Button size="icon" className="h-8 w-8" onClick={() => handleAcceptRequest(request.requester_id)}>
                      <Check className="h-4 w-4"/>
                    </Button>
                  </div>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No new requests.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.length > 0 ? (
              connections.map((connection) => {
                const profile = getConnectionProfile(connection);
                if (!profile) return null;
                return (
                  <div key={connection.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile.avatar_url || ''} />
                        <AvatarFallback>{profile.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{profile.full_name || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">
                          @{generateUsername(profile.full_name, profile.clerk_user_id)}
                        </p>
                        {connection.streak_data && (
                          <StreakBadge streakData={connection.streak_data} />
                        )}
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => startChat(profile)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Chat with {profile.full_name}</DialogTitle>
                          <DialogDescription>
                            Start a conversation with your connection
                          </DialogDescription>
                        </DialogHeader>
                        {chatConversationId && chatUser && (
                          <div className="flex-1">
                            <ChatInterface 
                              initialConversationId={chatConversationId}
                            />
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                )
              })
            ) : <p className="text-sm text-muted-foreground">You haven't made any connections yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 