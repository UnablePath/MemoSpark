"use client";

import React, { useState, useEffect, useMemo, createRef, useCallback } from 'react';
import TinderCard from 'react-tinder-card';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudentDiscovery, UserSearchResult } from '@/lib/social/StudentDiscovery';
import { UserProfile } from '@/lib/social/StudentDiscovery';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, BookOpen, Undo, Users, Loader2, RefreshCw } from 'lucide-react';

interface SwipeInterfaceProps {
  onMatch?: (matchedUser: UserProfile) => void;
  onSwipeModeChange?: (isSwipeMode: boolean) => void;
}

export const SwipeInterface: React.FC<SwipeInterfaceProps> = ({ onMatch, onSwipeModeChange }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  
  const [studentDiscovery, setStudentDiscovery] = useState<StudentDiscovery | null>(null);
  const [recommendations, setRecommendations] = useState<UserSearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swipedUsers, setSwipedUsers] = useState<string[]>([]);

  const studentDiscoveryMemo = useMemo(() => {
    if (!getToken) return null;
    return new StudentDiscovery(getToken);
  }, [getToken]);

  useEffect(() => {
    if (user && studentDiscoveryMemo) {
      setStudentDiscovery(studentDiscoveryMemo);
    }
  }, [user, studentDiscoveryMemo]);
  
  const loadRecommendations = useCallback(async () => {
    if (!studentDiscovery || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const recs = await studentDiscovery.getRecommendations(user.id);
      // Filter out already swiped users
      const filteredRecs = recs.filter(rec => !swipedUsers.includes(rec.clerk_user_id));
      setRecommendations(filteredRecs);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError('Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [studentDiscovery, user, swipedUsers]);
  
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Communicate swipe mode to parent
  useEffect(() => {
    onSwipeModeChange?.(true);
    return () => onSwipeModeChange?.(false);
  }, [onSwipeModeChange]);

  const childRefs = useMemo(
    () =>
      Array(recommendations.length)
        .fill(0)
        .map(() => createRef<any>()),
    [recommendations.length]
  );
  
  const onSwipe = async (direction: string, userSwiped: UserSearchResult) => {
    // Add to swiped users to prevent re-showing
    setSwipedUsers(prev => [...prev, userSwiped.clerk_user_id]);
    
    if (direction === 'right') {
      try {
        await studentDiscovery?.sendConnectionRequest(user?.id!, userSwiped.clerk_user_id);
        onMatch?.(userSwiped as UserProfile);
      } catch (error) {
        console.error('Error sending connection request:', error);
      }
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const onCardLeftScreen = (myIdentifier: string) => {
    // Optional: Add analytics or cleanup
  };

  const swipe = async (dir: 'left' | 'right') => {
    if (currentIndex < recommendations.length) {
      await childRefs[currentIndex].current?.swipe(dir);
    }
  };

  const resetSwipes = () => {
    setSwipedUsers([]);
    setCurrentIndex(0);
    loadRecommendations();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Finding amazing people for you...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full space-y-4">
        <p className="text-destructive text-center">{error}</p>
        <Button onClick={loadRecommendations} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const availableCards = recommendations.slice(currentIndex);

  if (availableCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full space-y-6">
        <div className="text-center space-y-4">
          <Users className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-xl font-semibold">That's everyone for now!</h3>
            <p className="text-muted-foreground">
              You've seen all available profiles. Check back later for new students!
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={resetSwipes} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
    }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full space-y-6">
      {/* Instructions for mobile users */}
      <div className="md:hidden text-center px-4">
        <p className="text-sm text-muted-foreground">
          💡 Swipe from the edges of your screen to navigate between tabs
        </p>
      </div>
      
      <div className="relative w-[min(350px,90vw)] h-[500px]">
        {availableCards.slice(0, 3).map((rec, index) => {
          const cardIndex = currentIndex + index;
          return (
          <TinderCard
              ref={childRefs[cardIndex]}
            key={rec.clerk_user_id}
            onSwipe={(dir) => onSwipe(dir, rec)}
            onCardLeftScreen={() => onCardLeftScreen(rec.full_name || '')}
            preventSwipe={['up', 'down']}
            className="absolute"
              swipeRequirementType="position"
              swipeThreshold={100}
          >
              <Card 
                className="w-[min(350px,90vw)] h-[500px] shadow-xl rounded-2xl overflow-hidden bg-gradient-to-b from-background to-background/95 border-2"
                onTouchStart={(e) => {
                  // Store touch start position for edge detection
                  const touch = e.touches[0];
                  if (touch) {
                    const startX = touch.clientX;
                    const screenWidth = window.innerWidth;
                    
                    // Only apply edge restriction on smaller screens
                    if (screenWidth < 768) {
                      const edgeThreshold = 50;
                      const isEdge = startX <= edgeThreshold || startX >= screenWidth - edgeThreshold;
                      if (!isEdge) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }
                  }
                }}
              >
              <CardContent className="p-0 flex flex-col h-full">
                  <div className="relative h-3/5">
                    <Avatar className="w-full h-full rounded-t-2xl rounded-b-none">
                      <AvatarImage 
                        src={rec.avatar_url || ''} 
                        className="object-cover w-full h-full"
                        alt={rec.full_name || 'User avatar'}
                      />
                      <AvatarFallback className="w-full h-full text-6xl bg-gradient-to-br from-primary/20 to-primary/40">
                        {rec.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                </Avatar>
                    
                    {/* Overlay gradient for better text readability */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  
                <div className="p-6 flex flex-col justify-between flex-grow">
                    <div className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                          {rec.full_name || 'Anonymous User'}
                        </h2>
                        <p className="text-muted-foreground">
                          {rec.year_of_study || 'Student'}
                        </p>
                      </div>
                      
                      {/* Subjects */}
                      {rec.subjects && rec.subjects.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Subjects:</p>
                          <div className="flex flex-wrap gap-1">
                            {rec.subjects.slice(0, 3).map((subject, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                            {rec.subjects.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{rec.subjects.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Interests */}
                      {rec.interests && rec.interests.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Interests:</p>
                          <div className="flex flex-wrap gap-1">
                            {rec.interests.slice(0, 2).map((interest, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                            {rec.interests.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{rec.interests.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </CardContent>
            </Card>
          </TinderCard>
          );
        })}
      </div>
      
      <div className="flex gap-6 items-center">
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full p-4 hover:bg-destructive hover:text-destructive-foreground transition-colors" 
          onClick={() => swipe('left')}
          disabled={availableCards.length === 0}
        >
          <X className="h-6 w-6"/>
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {availableCards.length} left
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full p-4 hover:bg-green-500 hover:text-white transition-colors" 
          onClick={() => swipe('right')}
          disabled={availableCards.length === 0}
        >
          <BookOpen className="h-6 w-6"/>
        </Button>
      </div>
      
      {/* Reset button when low on cards */}
      {availableCards.length <= 3 && availableCards.length > 0 && (
        <Button onClick={resetSwipes} variant="ghost" className="text-muted-foreground">
          <Undo className="h-4 w-4 mr-2" />
          Reset and see profiles again
        </Button>
      )}
    </div>
  );
}; 