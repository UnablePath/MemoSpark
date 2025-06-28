'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, Lock, Video, MessageCircle, UserPlus, Calendar, BookOpen, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserTier } from '@/hooks/useUserTier';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { cn } from '@/lib/utils';

interface StudyBuddy {
  id: string;
  name: string;
  avatar?: string;
  status: 'studying' | 'break' | 'offline';
  subject: string;
  studyTime: string;
  compatibility: number;
  isOnline: boolean;
}

const SAMPLE_BUDDIES: StudyBuddy[] = [
  {
    id: '1',
    name: 'Emma Chen',
    status: 'studying',
    subject: 'Computer Science',
    studyTime: '2h 30m',
    compatibility: 95,
    isOnline: true
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    status: 'break',
    subject: 'Mathematics',
    studyTime: '1h 45m',
    compatibility: 87,
    isOnline: true
  }
];

interface BuddyModeGateProps {
  className?: string;
}

export const BuddyModeGate: React.FC<BuddyModeGateProps> = ({ className }) => {
  const { tier } = useUserTier();
  const { showFeatureGatePopup } = usePremiumPopup();
  
  const isPremium = tier === 'premium';

  const handleBuddyAction = () => {
    if (!isPremium) {
      showFeatureGatePopup('Buddy Mode');
      return;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center"
        >
          <Users className="h-10 w-10 text-white" />
        </motion.div>
        
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Buddy Mode
          </h1>
          <p className="text-muted-foreground mt-2">
            Find your perfect study companion and learn together
          </p>
        </div>
      </div>

      {!isPremium && (
        <Card className="border-dashed border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Crown className="h-8 w-8 mx-auto text-blue-600" />
              <h3 className="text-xl font-semibold">Buddy Mode is Premium Only</h3>
              <p className="text-muted-foreground">
                Connect with study buddies and join video sessions
              </p>
              <Button
                onClick={() => showFeatureGatePopup('Buddy Mode')}
                className="bg-gradient-to-r from-blue-500 to-purple-500"
              >
                <Crown className="h-4 w-4 mr-2" />
                Unlock Buddy Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SAMPLE_BUDDIES.map((buddy) => (
          <Card key={buddy.id} className={!isPremium ? "opacity-75" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarFallback>
                    {buddy.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{buddy.name}</h3>
                  <p className="text-sm text-muted-foreground">{buddy.subject}</p>
                </div>
              </div>
              <Button
                onClick={handleBuddyAction}
                disabled={!isPremium}
                className="w-full gap-2"
              >
                {isPremium ? <UserPlus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {isPremium ? 'Connect' : 'Premium Only'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};