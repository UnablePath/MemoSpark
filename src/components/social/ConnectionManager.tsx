"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudentDiscovery, UserSearchResult } from '@/lib/social/StudentDiscovery';
import { MessagingService } from '@/lib/messaging/MessagingService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, UserPlus, MessageSquare, AtSign, Flame, Trophy, Star, MoreVertical, Ban, UserMinus } from 'lucide-react';
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
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Removed maskEmail and generateUsername imports - using real display names now

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
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [chatUser, setChatUser] = useState<any>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
      const status = await studentDiscovery.sendConnectionRequest(user.id, receiverId);
      if (status === 'accepted') {
        toast.success('It\'s a match! You\'re now connected.');
        await loadAllData();
      } else {
        setSentRequests(prev => [...prev, receiverId]);
        toast.success('Connection request sent');
        // Optional notification
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: receiverId,
              notification: {
                app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
                headings: { en: 'New connection request' },
                contents: { en: `${user.firstName ?? 'Someone'} wants to connect with you` },
                data: { type: 'connection_request' },
              },
            }),
          });
        } catch {}
        // Refresh data to show the new outgoing request
        await loadAllData();
      }
    } catch (error) {
      console.error("Failed to send connection request:", error);
      toast.error('Failed to send connection request');
      // Optionally, show an error to the user
    } finally {
      setLoadingRequestId(null);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;
    await studentDiscovery.acceptConnectionRequest(requesterId, user.id);
    try {
      // Notify original requester
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: requesterId,
          notification: {
            app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            headings: { en: 'Request accepted' },
            contents: { en: `${user.firstName ?? 'Your connection'} accepted your request` },
            data: { type: 'connection_accept' },
          },
        }),
      });
    } catch {}
    loadAllData();
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (!user) return;
    await studentDiscovery.rejectConnectionRequest(requesterId, user.id);
    loadAllData();
  };

  const handleCancelOutgoing = async (receiverId: string) => {
    if (!user) return;
    setActionLoadingId(receiverId);
    try {
      const ok = await studentDiscovery.cancelConnectionRequest(user.id, receiverId);
      if (ok) {
        toast.success('Request canceled');
      }
      await loadAllData();
    } catch (e) {
      toast.error('Failed to cancel request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnfriend = async (otherId: string) => {
    if (!user) return;
    setActionLoadingId(otherId);
    try {
      const ok = await studentDiscovery.removeConnection(user.id, otherId);
      if (ok) toast.success('Connection removed');
      await loadAllData();
    } catch (e) {
      toast.error('Failed to remove connection');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlock = async (otherId: string) => {
    if (!user) return;
    setActionLoadingId(otherId);
    try {
      await studentDiscovery.blockUser(user.id, otherId);
      toast.success('User blocked');
      await loadAllData();
    } catch (e) {
      toast.error('Failed to block user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const loadAllData = useCallback(async () => {
    if (!user) return;
    const [userConnections, requests, outgoing] = await Promise.all([
      studentDiscovery.getConnections(user.id, { limit: 50, offset: 0 }),
      studentDiscovery.getIncomingConnectionRequests(user.id, { limit: 50, offset: 0 }),
      studentDiscovery.getOutgoingConnectionRequests(user.id, { limit: 50, offset: 0 }),
    ]);
    setConnections(userConnections);
    setIncomingRequests(requests);
    setOutgoingRequests(outgoing);
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
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Search Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.map((result) => {
              return (
                <div key={result.clerk_user_id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 ring-2 ring-background">
                      <AvatarImage src={result.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40">
                        {result.full_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{result.full_name}</p>
                      {result.year_of_study && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {result.year_of_study}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSendRequest(result.clerk_user_id)}
                    disabled={sentRequests.includes(result.clerk_user_id) || loadingRequestId === result.clerk_user_id || outgoingRequests.some(o => o.receiver_id === result.clerk_user_id) || connections.some(c => (c.requester?.clerk_user_id === result.clerk_user_id) || (c.receiver?.clerk_user_id === result.clerk_user_id))}
                    className="ml-3 shrink-0 h-10 px-5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow"
                  >
                    {loadingRequestId === result.clerk_user_id 
                      ? 'Sending...' 
                      : sentRequests.includes(result.clerk_user_id) || outgoingRequests.some(o => o.receiver_id === result.clerk_user_id)
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
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl">Connection Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingRequests.length > 0 ? (
              incomingRequests.filter(req => req.requester).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={request.requester.avatar_url || ''} />
                      <AvatarFallback>{request.requester.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-base">{request.requester.full_name || 'Unknown User'}</p>
                      {request.requester.year_of_study && (
                        <p className="text-xs text-muted-foreground">
                          {request.requester.year_of_study}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => handleRejectRequest(request.requester_id)}>
                      <X className="h-4 w-4"/>
                    </Button>
                    <Button size="icon" className="h-10 w-10 bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700" onClick={() => handleAcceptRequest(request.requester_id)}>
                      <Check className="h-4 w-4"/>
                    </Button>
                  </div>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No new requests.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl">Outgoing Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outgoingRequests.length > 0 ? (
              outgoingRequests.filter(req => req.receiver).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={request.receiver.avatar_url || ''} />
                      <AvatarFallback>{request.receiver.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-base">{request.receiver.full_name || 'Unknown User'}</p>
                      {request.receiver.year_of_study && (
                        <p className="text-xs text-muted-foreground">
                          {request.receiver.year_of_study}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="h-10 px-4 rounded-lg" disabled={actionLoadingId === request.receiver_id} onClick={() => handleCancelOutgoing(request.receiver_id)}>
                      {actionLoadingId === request.receiver_id ? 'Canceling…' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No outgoing requests.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl">Your Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.length > 0 ? (
              connections.map((connection) => {
                const profile = getConnectionProfile(connection);
                if (!profile) return null;
                return (
                  <div key={connection.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={profile.avatar_url || ''} />
                        <AvatarFallback>{profile.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-base">{profile.full_name || 'Unknown User'}</p>
                        {profile.year_of_study && (
                          <p className="text-xs text-muted-foreground">
                            {profile.year_of_study}
                          </p>
                        )}
                        {connection.streak_data && (
                          <StreakBadge streakData={connection.streak_data} />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline"
                            className="h-10 px-4 rounded-lg"
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-10 w-10 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleUnfriend(profile.clerk_user_id)}>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Unfriend
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleBlock(profile.clerk_user_id)}>
                            <Ban className="h-4 w-4 mr-2" />
                            Block
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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