"use client";

import React, { useState, useEffect, useMemo, createRef, useCallback } from 'react';
import TinderCard from 'react-tinder-card';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudentDiscovery, UserSearchResult } from '@/lib/social/StudentDiscovery';
import { UserProfile } from '@/lib/social/StudentDiscovery';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Heart, Undo, Users, Loader2, RefreshCw, Sparkles, GraduationCap, User } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center h-[600px] w-full space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Finding Study Partners</h3>
          <p className="text-muted-foreground">Discovering amazing people for you to connect with...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Oops! Something went wrong</h3>
            <p className="text-muted-foreground max-w-sm">{error}</p>
          </div>
        </div>
        <Button onClick={loadRecommendations} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const availableCards = recommendations.slice(currentIndex);

  if (availableCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] w-full space-y-8">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">That's everyone for now!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You've seen all available study partners. Check back later for new students or adjust your preferences!
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button onClick={resetSwipes} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] w-full space-y-8 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Study Mode
        </h2>
        <p className="text-muted-foreground text-sm">
          Swipe right to connect • Swipe left to pass
        </p>
      </div>

      {/* Cards Container */}
      <div className="relative w-full max-w-sm">
        <div className="relative h-[520px] w-full">
          {availableCards.slice(0, 3).map((rec, index) => {
            const cardIndex = currentIndex + index;
            const isTopCard = index === 0;
            
            return (
              <TinderCard
                ref={childRefs[cardIndex]}
                key={rec.clerk_user_id}
                onSwipe={(dir) => onSwipe(dir, rec)}
                onCardLeftScreen={() => onCardLeftScreen(rec.full_name || '')}
                preventSwipe={['up', 'down']}
                className="absolute inset-0"
                swipeRequirementType="position"
                swipeThreshold={80}
              >
                <Card 
                  className={`
                    w-full h-full shadow-2xl rounded-3xl overflow-hidden border-0
                    bg-gradient-to-br from-background via-background to-background/95
                    backdrop-blur-sm transition-all duration-300
                    ${isTopCard ? 'scale-100 z-30' : index === 1 ? 'scale-95 z-20' : 'scale-90 z-10'}
                    ${!isTopCard ? 'pointer-events-none' : ''}
                  `}
                  style={{
                    transform: !isTopCard ? `scale(${1 - index * 0.05}) translateY(${index * 10}px)` : undefined
                  }}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    {/* Profile Image Section */}
                    <div className="relative h-[55%] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20"></div>
                      <Avatar className="w-full h-full rounded-none">
                        <AvatarImage 
                          src={rec.avatar_url || ''} 
                          className="object-cover w-full h-full"
                          alt={rec.full_name || 'User avatar'}
                        />
                        <AvatarFallback className="w-full h-full text-7xl rounded-none bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
                          {rec.full_name?.charAt(0)?.toUpperCase() || <User className="h-16 w-16 text-primary/60" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Gradient overlay for better text readability */}
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      
                      {/* Floating status indicator */}
                      <div className="absolute top-4 right-4">
                        <div className="bg-green-500 w-3 h-3 rounded-full ring-2 ring-white shadow-lg"></div>
                      </div>
                    </div>
                    
                    {/* Profile Info Section */}
                    <div className="flex-1 p-6 space-y-4 bg-gradient-to-b from-transparent to-background/50">
                      {/* Name and Year */}
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-foreground line-clamp-1">
                          {rec.full_name || 'Anonymous Student'}
                        </h2>
                        {rec.year_of_study && (
                          <div className="flex items-center gap-2 text-primary">
                            <GraduationCap className="h-4 w-4" />
                            <span className="text-sm font-medium">{rec.year_of_study}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Subjects */}
                      {rec.subjects && rec.subjects.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-3 w-3" />
                            Subjects
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {rec.subjects.slice(0, 3).map((subject, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary border-primary/20">
                                {subject}
                              </Badge>
                            ))}
                            {rec.subjects.length > 3 && (
                              <Badge variant="outline" className="text-xs font-medium px-3 py-1">
                                +{rec.subjects.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Interests */}
                      {rec.interests && rec.interests.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            <Heart className="h-3 w-3" />
                            Interests
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {rec.interests.slice(0, 3).map((interest, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs font-medium px-3 py-1 bg-background border-muted-foreground/20">
                                {interest}
                              </Badge>
                            ))}
                            {rec.interests.length > 3 && (
                              <Badge variant="outline" className="text-xs font-medium px-3 py-1">
                                +{rec.interests.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TinderCard>
            );
          })}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-8">
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full w-16 h-16 p-0 border-2 border-destructive/20 hover:border-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 shadow-lg hover:shadow-xl" 
          onClick={() => swipe('left')}
          disabled={availableCards.length === 0}
        >
          <X className="h-7 w-7"/>
        </Button>
        
        <div className="text-center min-w-[80px]">
          <div className="text-2xl font-bold text-primary">
            {availableCards.length}
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            remaining
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full w-16 h-16 p-0 border-2 border-green-500/20 hover:border-green-500 hover:bg-green-500 hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl" 
          onClick={() => swipe('right')}
          disabled={availableCards.length === 0}
        >
          <Heart className="h-7 w-7"/>
        </Button>
      </div>
      
      {/* Reset button when low on cards */}
      {availableCards.length <= 3 && availableCards.length > 0 && (
        <Button onClick={resetSwipes} variant="ghost" className="text-muted-foreground gap-2 hover:text-foreground">
          <Undo className="h-4 w-4" />
          Reset and see profiles again
        </Button>
      )}
    </div>
  );
}; 